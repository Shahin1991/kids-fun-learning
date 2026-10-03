import type { FactItem } from "@/data/facts";

export interface ChoiceRound {
  target: FactItem;
  choices: FactItem[];
}

function shuffle<T>(list: T[], rand: () => number): T[] {
  return [...list].sort(() => rand() - 0.5);
}

/** 2 choices at first, one more every 3 right answers, up to 4. */
export function makeChoiceRound(items: FactItem[], streak: number, rand: () => number = Math.random): ChoiceRound {
  const count = Math.min(4, items.length, 2 + Math.floor(streak / 3));
  const target = items[Math.floor(rand() * items.length)];
  const others = shuffle(items.filter((i) => i.id !== target.id), rand).slice(0, count - 1);
  return { target, choices: shuffle([target, ...others], rand) };
}
