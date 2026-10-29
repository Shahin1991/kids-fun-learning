/** Pure rules for Tally & Charts: animals walk past, the child keeps a tally, draws a bar chart, then reads it. */

import { numberChoices } from "@/lib/math/choices";

export interface Kind {
  id: string;
  name: string;
  plural: string;
  emoji: string;
}

export const KINDS: Kind[] = [
  { id: "cow", name: "cow", plural: "cows", emoji: "🐄" },
  { id: "goat", name: "goat", plural: "goats", emoji: "🐐" },
  { id: "hen", name: "hen", plural: "hens", emoji: "🐔" },
  { id: "duck", name: "duck", plural: "ducks", emoji: "🦆" },
  { id: "sheep", name: "sheep", plural: "sheep", emoji: "🐑" },
  { id: "pig", name: "pig", plural: "pigs", emoji: "🐖" },
];

export const kindById = (id: string) => KINDS.find((k) => k.id === id)!;

export interface Parade {
  kinds: string[];
  /** The animals in the order they walk past */
  order: string[];
}

/** 3 kinds (4 from level 2), each a different count so "most" and "fewest" have one answer. */
export function makeParade(level: number, r: () => number = Math.random): Parade {
  const shuffle = <T>(list: T[]) => [...list].sort(() => r() - 0.5);
  const n = level >= 2 ? 4 : 3;
  const kinds = shuffle(KINDS)
    .slice(0, n)
    .map((k) => k.id);
  const max = Math.min(12, 5 + level * 2);
  const pool = shuffle(Array.from({ length: max - 1 }, (_, i) => i + 2)).slice(0, n);
  const order = shuffle(kinds.flatMap((k, i) => Array.from({ length: pool[i] }, () => k)));
  return { kinds, order };
}

export const countOf = (order: string[], kind: string) => order.filter((k) => k === kind).length;

/** 7 → one gate of five and two sticks. */
export const tallyGroups = (n: number) => ({ fives: Math.floor(n / 5), ones: n % 5 });

export interface Question {
  text: string;
  /** Kind ids or numbers, shown as buttons */
  choices: (string | number)[];
  answer: string | number;
}

/** Read the chart: most and fewest, a "how many", then (from level 1) difference and total. */
export function makeQuestions(p: Parade, level: number, r: () => number = Math.random): Question[] {
  const counts = p.kinds.map((k) => ({ k, n: countOf(p.order, k) })).sort((a, b) => b.n - a.n);
  const most = counts[0];
  const least = counts[counts.length - 1];
  const mid = counts[1 + Math.floor(r() * (counts.length - 2))];
  const qs: Question[] = [
    { text: "Which animal walked past the most?", choices: p.kinds, answer: most.k },
    { text: `How many ${kindById(mid.k).plural} were there?`, choices: numberChoices(mid.n, r), answer: mid.n },
  ];
  if (level >= 1) {
    const diff = most.n - least.n;
    qs.push({
      text: `How many more ${kindById(most.k).plural} than ${kindById(least.k).plural}?`,
      choices: numberChoices(
        diff,
        r,
        [most.n, least.n].filter((x) => x !== diff),
      ),
      answer: diff,
    });
    qs.push({ text: "How many animals altogether?", choices: numberChoices(p.order.length, r), answer: p.order.length });
  } else {
    qs.push({ text: "Which animal walked past the fewest?", choices: p.kinds, answer: least.k });
  }
  return qs;
}
