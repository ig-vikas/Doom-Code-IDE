export interface FuzzyMatchResult {
  score: number;
  matches: number[];
}

export function fuzzyMatch(pattern: string, text: string): FuzzyMatchResult | null {
  const pLower = pattern.toLowerCase();
  const tLower = text.toLowerCase();
  const pLen = pLower.length;
  const tLen = tLower.length;

  if (pLen === 0) return { score: 0, matches: [] };
  if (pLen > tLen) return null;

  const matches: number[] = [];
  let score = 0;
  let pi = 0;
  let lastMatchIdx = -1;
  let consecutiveCount = 0;

  for (let ti = 0; ti < tLen && pi < pLen; ti++) {
    if (pLower[pi] === tLower[ti]) {
      matches.push(ti);

      // Bonus for consecutive matches
      if (lastMatchIdx === ti - 1) {
        consecutiveCount++;
        score += 5 * consecutiveCount;
      } else {
        consecutiveCount = 0;
      }

      // Bonus for matching at start
      if (ti === 0) score += 10;

      // Bonus for matching after separator
      if (ti > 0 && (text[ti - 1] === '/' || text[ti - 1] === '\\' || text[ti - 1] === '_' || text[ti - 1] === '-' || text[ti - 1] === '.')) {
        score += 8;
      }

      // Bonus for case match
      if (pattern[pi] === text[ti]) score += 2;

      // Bonus for camelCase match
      if (ti > 0 && text[ti] === text[ti].toUpperCase() && text[ti] !== text[ti].toLowerCase()) {
        score += 5;
      }

      score += 1;
      lastMatchIdx = ti;
      pi++;
    }
  }

  if (pi !== pLen) return null;

  // Penalty for spread
  if (matches.length > 1) {
    const spread = matches[matches.length - 1] - matches[0];
    score -= spread * 0.5;
  }

  // Bonus for shorter strings (more relevant)
  score += Math.max(0, 20 - tLen) * 0.5;

  return { score, matches };
}

export function highlightMatches(text: string, matches: number[]): Array<{ text: string; highlight: boolean }> {
  if (matches.length === 0) return [{ text, highlight: false }];

  const result: Array<{ text: string; highlight: boolean }> = [];
  let lastIdx = 0;

  for (const matchIdx of matches) {
    if (matchIdx > lastIdx) {
      result.push({ text: text.slice(lastIdx, matchIdx), highlight: false });
    }
    result.push({ text: text[matchIdx], highlight: true });
    lastIdx = matchIdx + 1;
  }

  if (lastIdx < text.length) {
    result.push({ text: text.slice(lastIdx), highlight: false });
  }

  return result;
}
