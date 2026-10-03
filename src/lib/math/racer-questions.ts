export interface RacerQuestion {
  prompt: string;
  answer: number;
  choices: number[];
}

/** Level rises every 3 right answers: add to 10, add to 20, subtract, small times tables, full tables. */
export function levelFor(correct: number): number {
  return Math.min(4, Math.floor(correct / 3));
}

export function generateRacerQuestion(correct: number, rand: () => number = Math.random): RacerQuestion {
  const level = levelFor(correct);
  const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
  let prompt: string;
  let answer: number;

  if (level === 0) {
    const a = int(1, 6);
    const b = int(1, 10 - a);
    prompt = `${a} + ${b}`;
    answer = a + b;
  } else if (level === 1) {
    const a = int(3, 12);
    const b = int(2, 20 - a);
    prompt = `${a} + ${b}`;
    answer = a + b;
  } else if (level === 2) {
    const a = int(8, 20);
    const b = int(1, a - 1);
    prompt = `${a} − ${b}`;
    answer = a - b;
  } else {
    const a = level === 3 ? [2, 5, 10][int(0, 2)] : int(2, 9);
    const b = int(2, level === 3 ? 6 : 9);
    prompt = `${a} × ${b}`;
    answer = a * b;
  }

  const count = level >= 3 ? 4 : 3;
  const pool = new Set<number>([answer]);
  let guard = 0;
  while (pool.size < count && guard++ < 50) {
    const d = answer + int(-4, 4);
    if (d >= 0) pool.add(d);
  }
  return { prompt, answer, choices: [...pool].sort(() => rand() - 0.5) };
}
