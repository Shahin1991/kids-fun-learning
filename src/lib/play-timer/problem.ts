export interface AdditionProblem {
  a: number;
  b: number;
  answer: number;
}

/** Level 0 is single/low double digits; each level raises the ceiling and eventually adds a third addend's worth of carrying. */
export function makeProblem(level: number, rng: () => number = Math.random): AdditionProblem {
  const lo = 5 + level * 10;
  const hi = 15 + level * 25;
  const pick = () => lo + Math.floor(rng() * (hi - lo + 1));
  const a = pick();
  const b = pick();
  return { a, b, answer: a + b };
}
