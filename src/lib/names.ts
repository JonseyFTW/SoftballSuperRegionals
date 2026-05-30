/**
 * Team-name matching for live feeds. The WCWS field contains both "Texas" and
 * "Texas Tech", so a naive substring match (or "TEX" ⊆ "texastech") would
 * conflate them. We compare on the exact set of meaningful tokens instead, which
 * still tolerates suffixes like "University of Tennessee" or "Mississippi St.".
 */

const GENERIC_TOKENS = new Set(["university", "of", "the", "at"]);

function tokens(value?: string): string[] {
  return (value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((token) => (token === "st" ? "state" : token))
    .filter((token) => !GENERIC_TOKENS.has(token));
}

export function namesMatch(a?: string, b?: string): boolean {
  const left = tokens(a);
  const right = tokens(b);
  if (left.length === 0 || right.length === 0) return false;
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((token) => rightSet.has(token));
}
