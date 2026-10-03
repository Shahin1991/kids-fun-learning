export interface NumberQuestion {
  kind: "count" | "add";
  prompt: string;
  /** Items to draw for counting; empty for addition */
  count: number;
  answer: number;
  choices: number[];
}

/** Level 0 = 1-3 with two choices; each level widens the range, capped at 10. */
export function rangeForLevel(level: number): { max: number; choices: number } {
  const max = Math.min(10, 3 + level * 2);
  return { max, choices: Math.min(4, 2 + Math.floor(level / 2)) };
}

export function generateQuestion(level: number, rand: () => number = Math.random): NumberQuestion {
  const { max, choices } = rangeForLevel(level);
  const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
  const addition = level >= 2 && rand() < 0.5;

  let answer: number;
  let count = 0;
  let prompt: string;
  if (addition) {
    const a = int(1, Math.max(1, Math.floor(max / 2)));
    const b = int(1, Math.max(1, max - a));
    answer = a + b;
    prompt = `${a} + ${b} = ?`;
  } else {
    count = answer = int(1, max);
    prompt = "How many?";
  }

  const pool = new Set<number>([answer]);
  const upper = Math.max(max, answer + 2);
  while (pool.size < choices) pool.add(int(1, upper));
  const shuffled = [...pool].sort(() => rand() - 0.5);
  return { kind: addition ? "add" : "count", prompt, count, answer, choices: shuffled };
}
