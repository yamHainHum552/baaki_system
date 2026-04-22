export type ParsedVoiceCustomer = {
  name: string;
  phone: string;
  address: string;
};

const ADDRESS_WORDS = new Set([
  "pathari",
  "itahari",
  "urlabari",
  "damak",
  "birtamod",
  "biratnagar",
  "dharan",
  "kathmandu",
  "lalitpur",
  "bhaktapur",
  "pokhara",
  "butwal",
  "chitwan",
  "hetauda",
  "janakpur",
  "nepalgunj",
  "birgunj",
  "tole",
  "chowk",
  "bazar",
  "bazaar",
  "road",
  "marg",
  "ward",
  "gaun",
  "nagar",
  "tol",
]);

const ADDRESS_SUFFIXES = ["pur", "nagar", "bazar", "bazaar", "chowk", "tole", "tol"];

export function parseSingleVoiceCustomer(spoken: string): ParsedVoiceCustomer {
  const normalized = normalizeVoiceText(spoken);
  const digitNormalized = normalizeSpokenDigits(normalized);
  const rawPhone =
    extractLabeledValue(digitNormalized, ["phone", "mobile", "number", "contact", "fone", "no"]) ??
    digitNormalized.match(/\+?\d[\d\s-]{6,}\d/)?.[0] ??
    "";
  const phone = cleanPhone(rawPhone);
  const labeledAddress = cleanField(
    extractLabeledValue(digitNormalized, [
      "address",
      "location",
      "place",
      "thau",
      "tole",
      "ghar",
    ]),
  );
  const labeledName = cleanField(extractLabeledValue(digitNormalized, ["name", "naam", "customer"]));
  const inferred = labeledAddress ? null : inferUnlabeledNameAndAddress(digitNormalized, rawPhone);
  const address =
    labeledAddress ??
    cleanField(fallbackAddress(digitNormalized, rawPhone)) ??
    inferred?.address ??
    "";
  const name =
    cleanField(
      inferred?.name ??
        labeledName ??
        fallbackName(digitNormalized, rawPhone, address),
    ) ?? "";

  return { name, phone, address };
}

export function cleanPhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

export function normalizeComparableCustomerText(value: string) {
  return removeLabels(value)
    .toLowerCase()
    .replace(/[^\w\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeVoiceText(value: string) {
  return value
    .replace(/[,;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSpokenDigits(value: string) {
  const digitWords: Record<string, string> = {
    zero: "0",
    oh: "0",
    o: "0",
    sunya: "0",
    shunya: "0",
    one: "1",
    ek: "1",
    two: "2",
    dui: "2",
    three: "3",
    tin: "3",
    teen: "3",
    four: "4",
    char: "4",
    chaar: "4",
    five: "5",
    pach: "5",
    paanch: "5",
    six: "6",
    cha: "6",
    chha: "6",
    seven: "7",
    saat: "7",
    eight: "8",
    aath: "8",
    nine: "9",
    nau: "9",
  };

  return value
    .split(" ")
    .map((word) => digitWords[word.toLowerCase()] ?? word)
    .join(" ");
}

function extractLabeledValue(text: string, labels: string[]) {
  const allLabels = [
    "name",
    "naam",
    "customer",
    "phone",
    "mobile",
    "number",
    "contact",
    "fone",
    "no",
    "address",
    "location",
    "place",
    "thau",
    "tole",
    "ghar",
  ];
  const labelPattern = labels.join("|");
  const nextLabelPattern = allLabels.filter((label) => !labels.includes(label)).join("|");
  const match = text.match(
    new RegExp(`(?:^|\\s)(?:${labelPattern})(?:\\s+(?:is|ko|ho|cha|chha))?\\s+(.+?)(?=\\s+(?:${nextLabelPattern})(?:\\s|$)|$)`, "i"),
  );

  return match?.[1]?.trim() ?? null;
}

function fallbackName(text: string, rawPhone: string, address: string) {
  let working = text;

  if (rawPhone) {
    const phoneIndex = working.indexOf(rawPhone);
    working = phoneIndex >= 0 ? working.slice(0, phoneIndex) : working.replace(rawPhone, " ");
  }

  if (address) {
    working = working.replace(address, " ");
  }

  return removeLabels(working);
}

function fallbackAddress(text: string, rawPhone: string) {
  if (!rawPhone) {
    return "";
  }

  const phoneIndex = text.indexOf(rawPhone);
  if (phoneIndex < 0) {
    return "";
  }

  return removeLabels(text.slice(phoneIndex + rawPhone.length));
}

function inferUnlabeledNameAndAddress(text: string, rawPhone: string) {
  const withoutPhone = rawPhone ? text.replace(rawPhone, " ") : text;
  const words = removeLabels(withoutPhone)
    .split(" ")
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length < 2) {
    return null;
  }

  const addressStartIndex = words.findIndex((word, index) => {
    if (index === 0) {
      return false;
    }

    return isLikelyAddressWord(word.toLowerCase());
  });

  if (addressStartIndex < 1) {
    return null;
  }

  return {
    name: words.slice(0, addressStartIndex).join(" "),
    address: words.slice(addressStartIndex).join(" "),
  };
}

function isLikelyAddressWord(word: string) {
  return (
    ADDRESS_WORDS.has(word) ||
    ADDRESS_SUFFIXES.some((suffix) => word.length > suffix.length + 2 && word.endsWith(suffix))
  );
}

function cleanField(value: string | null) {
  const cleaned = removeLabels(value ?? "")
    .replace(/\+?\d[\d\s-]{6,}\d/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || null;
}

function removeLabels(value: string) {
  return value
    .replace(
      /\b(name|naam|customer|phone|mobile|number|contact|fone|no|address|location|place|thau|tole|ghar|is|ko|ho|cha|chha)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}
