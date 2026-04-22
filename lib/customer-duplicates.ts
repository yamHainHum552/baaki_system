import { cleanPhone, normalizeComparableCustomerText } from "@/lib/customer-voice-parser";

export type CustomerDuplicateInput = {
  name: string;
  phone?: string | null;
  address?: string | null;
};

export type CustomerDuplicateCandidate = {
  customer_id: string;
  customer_name: string;
  phone: string | null;
  address: string | null;
};

export type CustomerDuplicateMatch = CustomerDuplicateCandidate & {
  duplicate_reason: "phone" | "name_address" | "name";
  duplicate_score: number;
};

export function findDuplicateCustomers(
  input: CustomerDuplicateInput,
  candidates: CustomerDuplicateCandidate[],
) {
  return candidates
    .map((candidate) => scoreDuplicateCustomer(candidate, input))
    .filter((match): match is CustomerDuplicateMatch => Boolean(match))
    .sort((left, right) => right.duplicate_score - left.duplicate_score);
}

export function scoreDuplicateCustomer(
  candidate: CustomerDuplicateCandidate,
  input: CustomerDuplicateInput,
): CustomerDuplicateMatch | null {
  const inputPhone = cleanPhone(input.phone ?? "");
  const candidatePhone = cleanPhone(candidate.phone ?? "");

  if (inputPhone && candidatePhone && inputPhone === candidatePhone) {
    return {
      ...candidate,
      duplicate_reason: "phone",
      duplicate_score: 1,
    };
  }

  const inputName = normalizeComparableCustomerText(input.name);
  const candidateName = normalizeComparableCustomerText(candidate.customer_name);

  if (!inputName || !candidateName) {
    return null;
  }

  const nameSimilarity = textSimilarity(inputName, candidateName);
  if (nameSimilarity < 0.72) {
    return null;
  }

  const inputAddress = normalizeComparableCustomerText(input.address ?? "");
  const candidateAddress = normalizeComparableCustomerText(candidate.address ?? "");

  if (inputAddress && candidateAddress) {
    const addressSimilarity = textSimilarity(inputAddress, candidateAddress);
    if (addressSimilarity >= 0.72) {
      return {
        ...candidate,
        duplicate_reason: "name_address",
        duplicate_score: Math.min(0.98, nameSimilarity * 0.7 + addressSimilarity * 0.3),
      };
    }
  }

  if (nameSimilarity >= 0.9) {
    return {
      ...candidate,
      duplicate_reason: "name",
      duplicate_score: nameSimilarity * 0.85,
    };
  }

  return null;
}

function textSimilarity(left: string, right: string) {
  if (left === right) {
    return 1;
  }

  if (left.includes(right) || right.includes(left)) {
    return 0.9;
  }

  const leftTokens = new Set(left.split(" ").filter(Boolean));
  const rightTokens = new Set(right.split(" ").filter(Boolean));

  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return intersection / union;
}
