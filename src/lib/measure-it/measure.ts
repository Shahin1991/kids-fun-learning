/** Pure rules for Measure It: blocks along a toy, then a ruler, then cups of water into containers. */

import { numberChoices } from "@/lib/math/choices";

export type ThingArt = "pencil" | "crayon" | "snake" | "ribbon" | "train";

export interface Thing {
  art: ThingArt;
  name: string;
  color: string;
}

export const THINGS: Thing[] = [
  { art: "pencil", name: "pencil", color: "#ffc93c" },
  { art: "crayon", name: "crayon", color: "#ff6b6b" },
  { art: "snake", name: "toy snake", color: "#6bcb77" },
  { art: "ribbon", name: "ribbon", color: "#9b51e0" },
  { art: "train", name: "toy train", color: "#4d96ff" },
];

export interface Container {
  id: string;
  name: string;
  /** How many cups fill it */
  cups: number;
  /** Drawn size (SVG units): a tall thin one can hold less than a short wide one */
  w: number;
  h: number;
}

export const CONTAINERS: Container[] = [
  { id: "glass", name: "glass", cups: 2, w: 46, h: 80 },
  { id: "vase", name: "tall vase", cups: 3, w: 36, h: 150 },
  { id: "bottle", name: "bottle", cups: 4, w: 50, h: 140 },
  { id: "bowl", name: "bowl", cups: 5, w: 130, h: 56 },
  { id: "jug", name: "jug", cups: 6, w: 80, h: 120 },
  { id: "pot", name: "cooking pot", cups: 7, w: 120, h: 88 },
  { id: "bucket", name: "bucket", cups: 8, w: 104, h: 112 },
];

export type Round = { kind: "blocks"; thing: Thing; length: number } | { kind: "ruler"; thing: Thing; start: number; length: number } | { kind: "jugs"; a: Container; b: Container };

export const RULER_CM = 12;

/** Rounds go blocks, ruler, jugs. The thing on the ruler starts at 0 for the first two ruler rounds, then anywhere. */
export function makeRound(n: number, r: () => number = Math.random): Round {
  const pick = <T>(list: T[]) => list[Math.floor(r() * list.length)];
  const kind = (["blocks", "ruler", "jugs"] as const)[n % 3];
  if (kind === "blocks") return { kind, thing: pick(THINGS), length: 3 + Math.floor(r() * 6) };
  if (kind === "ruler") {
    const length = 2 + Math.floor(r() * 8);
    const start = n >= 6 ? 1 + Math.floor(r() * (RULER_CM - length - 1)) : 0;
    return { kind, thing: pick(THINGS), start, length };
  }
  // From the second jug round, a taller container that holds less, so height can't be trusted
  for (let i = 0; i < 50; i++) {
    const a = pick(CONTAINERS);
    const b = pick(CONTAINERS);
    if (a.cups === b.cups) continue;
    const tricky = a.h > b.h !== a.cups > b.cups;
    if (n >= 5 && !tricky) continue;
    return { kind, a, b };
  }
  return { kind, a: CONTAINERS[1], b: CONTAINERS[3] };
}

/** The question's answer and three number choices, with the end mark as a tempting wrong on an offset ruler. */
export function lengthQuestion(round: Extract<Round, { kind: "blocks" | "ruler" }>, r: () => number = Math.random) {
  const answer = round.length;
  const tempting = round.kind === "ruler" && round.start > 0 ? [round.start + round.length] : [];
  return { answer, choices: numberChoices(answer, r, tempting) };
}

/** Blocks laid along the thing: too few, just right, or one sticking out past the end. */
export const blockFit = (placed: number, length: number) => (placed < length ? "short" : placed === length ? "exact" : "over");

export const holdsMore = (round: Extract<Round, { kind: "jugs" }>) => (round.a.cups > round.b.cups ? round.a : round.b);
