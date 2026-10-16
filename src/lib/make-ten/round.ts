export interface MakeTenRound {
  /** Make 5 while warming up, then make 10 */
  target: 5 | 10;
  /** Counters already in the frame */
  have: number;
  answer: number;
  choices: number[];
}

/**
 * Number bonds: how many more make 5 (warm-up) or 10. Starts with two clearly different choices and grows to
 * four close ones as the streak builds, so the child is never faced with a hard guess straight away.
 */
export function makeTenRound(streak: number, rand: () => number = Math.random): MakeTenRound {
  const target: 5 | 10 = streak < 3 ? 5 : 10;
  const have = 1 + Math.floor(rand() * (target - 1));
  const answer = target - have;
  const count = Math.min(4, 2 + Math.floor(streak / 3));
  const near = streak >= 6;
  const pool = Array.from({ length: target + 1 }, (_, i) => i).filter((n) => n !== answer);
  const ranked = pool
    .map((n) => ({ n, d: Math.abs(n - answer), r: rand() }))
    // Early on prefer far-away distractors; later prefer close ones.
    .sort((a, b) => (near ? a.d - b.d : b.d - a.d) || a.r - b.r)
    .map((x) => x.n);
  const choices = [answer, ...ranked.slice(0, count - 1)].sort(() => rand() - 0.5);
  return { target, have, answer, choices };
}
