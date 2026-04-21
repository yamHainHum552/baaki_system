export type CustomerSearchItem = {
  customer_id: string;
  customer_name: string;
  phone: string | null;
  address: string | null;
  balance: number;
  risk_level?: "LOW" | "MEDIUM" | "HIGH" | null;
};

type IndexedCustomer<T extends CustomerSearchItem> = {
  customer: T;
  combinedName: string;
  phoneticName: string;
  phone: string;
  address: string;
  risk: string;
  balanceText: string;
  nameTokens: string[];
};

const HONORIFICS = new Set([
  "dai",
  "didi",
  "bhai",
  "baini",
  "sauji",
  "sahuji",
  "sahu",
  "saahu",
  "saoji",
  "sir",
  "madam",
  "ji",
  "jee",
  "sathi",
]);

export function filterCustomers<T extends CustomerSearchItem>(
  customers: T[],
  query: string,
) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return customers;
  }

  const queryTokens = buildSearchTokens(normalizedQuery);
  const phoneticQuery = phoneticSimplify(normalizedQuery);

  return customers
    .map(indexCustomer)
    .map((entry) => ({
      customer: entry.customer,
      score: scoreCustomer(entry, normalizedQuery, queryTokens, phoneticQuery),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return b.customer.balance - a.customer.balance;
    })
    .map((item) => item.customer);
}

function indexCustomer<T extends CustomerSearchItem>(customer: T): IndexedCustomer<T> {
  const normalizedName = normalizeSearchText(customer.customer_name);
  const strippedName = removeHonorifics(normalizedName);
  const combinedName = [normalizedName, strippedName]
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .join(" ");

  return {
    customer,
    combinedName,
    phoneticName: phoneticSimplify(combinedName),
    phone: normalizeSearchText(customer.phone ?? ""),
    address: normalizeSearchText(customer.address ?? ""),
    risk: normalizeSearchText(customer.risk_level ?? ""),
    balanceText: String(Math.round(customer.balance)),
    nameTokens: combinedName.split(/\s+/).filter(Boolean),
  };
}

function scoreCustomer<T extends CustomerSearchItem>(
  entry: IndexedCustomer<T>,
  normalizedQuery: string,
  queryTokens: string[],
  phoneticQuery: string,
) {
  let score = 0;
  let matchedTokens = 0;
  let matchedNameTokens = 0;

  if (entry.combinedName === normalizedQuery) {
    score += 50;
  } else if (entry.combinedName.startsWith(normalizedQuery)) {
    score += 30;
  }

  if (entry.phoneticName.includes(phoneticQuery)) {
    score += 15;
  }

  for (const token of queryTokens) {
    const tokenScore = scoreToken(entry, token);

    if (tokenScore.total > 0) {
      matchedTokens += 1;
      score += tokenScore.total;
      if (tokenScore.nameMatched) {
        matchedNameTokens += 1;
      }
    }
  }

  if (matchedTokens === 0 && score < 15) {
    return 0;
  }

  const coverage = matchedTokens / queryTokens.length;
  if (coverage === 1) {
    score += 10;
  }

  const missingTokens = queryTokens.length - matchedTokens;
  score -= missingTokens * 5;

  return Math.max(score, matchedNameTokens > 0 ? 1 : 0);
}

function scoreToken<T extends CustomerSearchItem>(entry: IndexedCustomer<T>, token: string) {
  if (entry.combinedName.startsWith(token)) {
    return { total: 12, nameMatched: true };
  }

  if (entry.combinedName.includes(token)) {
    return { total: 8, nameMatched: true };
  }

  const fuzzyNameScore = getFuzzyNameTokenScore(token, entry.nameTokens);
  if (fuzzyNameScore > 0) {
    return { total: fuzzyNameScore, nameMatched: true };
  }

  if (entry.phone.includes(token)) {
    return { total: 10, nameMatched: false };
  }

  if (entry.address.includes(token)) {
    return { total: 5, nameMatched: false };
  }

  if (entry.risk.includes(token)) {
    return { total: 4, nameMatched: false };
  }

  if (entry.balanceText.includes(token)) {
    return { total: 3, nameMatched: false };
  }

  return { total: 0, nameMatched: false };
}

function phoneticSimplify(text: string) {
  return text
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/y/g, "i")
    .replace(/v/g, "b")
    .replace(/w/g, "b")
    .replace(/sh/g, "s")
    .replace(/th/g, "t");
}

function buildSearchTokens(term: string) {
  const normalized = normalizeSearchText(term);
  const stripped = removeHonorifics(normalized);
  const source = stripped || normalized;
  return source.split(/\s+/).filter(Boolean);
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function removeHonorifics(value: string) {
  return value
    .split(/\s+/)
    .filter((token) => token && !HONORIFICS.has(token))
    .join(" ")
    .trim();
}

function getFuzzyNameTokenScore(queryToken: string, nameTokens: string[]) {
  if (queryToken.length < 3) {
    return 0;
  }

  let bestScore = 0;
  for (const nameToken of nameTokens) {
    const score = getNearNameMatchScore(queryToken, nameToken);
    if (score > bestScore) {
      bestScore = score;
    }
  }
  return bestScore;
}

function getNearNameMatchScore(queryToken: string, nameToken: string) {
  if (!queryToken || !nameToken) {
    return 0;
  }
  if (queryToken === nameToken) {
    return 8;
  }

  const shorterLength = Math.min(queryToken.length, nameToken.length);
  if (shorterLength < 3) {
    return 0;
  }

  const distance = getLevenshteinDistance(queryToken, nameToken);
  const maxAllowedDistance = shorterLength >= 6 ? 2 : 1;

  if (distance <= maxAllowedDistance) {
    return 6 - distance;
  }

  return 0;
}

function getLevenshteinDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, i) => i);
  for (let row = 1; row <= left.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= right.length; column += 1) {
      const nextDiagonal = previous[column];
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      previous[column] = Math.min(
        previous[column] + 1,
        previous[column - 1] + 1,
        diagonal + cost,
      );
      diagonal = nextDiagonal;
    }
  }
  return previous[right.length];
}
