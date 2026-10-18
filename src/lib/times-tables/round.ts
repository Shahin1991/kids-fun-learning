export interface TimesRound {
  /** Rows (groups) in the picture */
  a: number;
  /** Items in each row (the table being practised) */
  b: number;
  answer: number;
  choices: number[];
}

/** Easiest tables first: 2s, 5s and 10s are learned by skip counting, then 3s and 4s, then the rest. */
const STAGES: { tables: number[]; maxGroups: number; choices: number; near: boolean }[] = [
  { tables: [2, 5, 10], maxGroups: 5, choices: 2, near: false },
  { tables: [2, 3, 4, 5, 10], maxGroups: 10, choices: 3, near: false },
  { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10], maxGroups: 10, choices: 4, near: true },
];

export function stageFor(streak: number) {
  return STAGES[streak < 5 ? 0 : streak < 10 ? 1 : 2];
}

/**
 * "a groups of b". Starts with two clearly different choices from the easy tables and grows to four
 * close ones (the classic slips: one group too many or too few, or adding instead of multiplying).
 */
export function timesRound(streak: number, rand: () => number = Math.random): TimesRound {
  const stage = stageFor(streak);
  const b = stage.tables[Math.floor(rand() * stage.tables.length)];
  const a = 1 + Math.floor(rand() * stage.maxGroups);
  const answer = a * b;
  const slips = [answer - b, answer + b, a + b, answer - a, answer + a, answer + 1, answer - 1];
  const far = [answer * 2, Math.round(answer / 2), answer + 2 * b, answer + 10, answer - 10];
  const pool = [...new Set((stage.near ? [...slips, ...far] : [...far, ...slips]).filter((n) => n > 0 && n !== answer))];
  // Keep the ordering preference (near slips first, or far numbers first) but vary which ones appear.
  const ranked = pool.map((n, i) => ({ n, k: i + rand() * 2 })).sort((x, y) => x.k - y.k).map((x) => x.n);
  const choices = [answer, ...ranked.slice(0, stage.choices - 1)].sort(() => rand() - 0.5);
  return { a, b, answer, choices };
}

/** b, 2b, 3b … up to a×b, for counting along the rows out loud. */
export function skipCount(a: number, b: number): number[] {
  return Array.from({ length: a }, (_, i) => (i + 1) * b);
}
