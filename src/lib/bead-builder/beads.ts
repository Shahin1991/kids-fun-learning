/** Pure rules for Bead Builder: bead kinds, pattern rounds and what goes on the string next. */

export interface BeadKind {
  id: string;
  name: string;
  color: string;
  /** A shape as well as a colour, so colour-blind children can follow the pattern too */
  shape: "circle" | "square" | "diamond" | "flower" | "heart";
}

export const BEADS: BeadKind[] = [
  { id: "red", name: "red", color: "#ff5d6c", shape: "circle" },
  { id: "blue", name: "blue", color: "#4d96ff", shape: "square" },
  { id: "yellow", name: "yellow", color: "#ffd23f", shape: "diamond" },
  { id: "green", name: "green", color: "#4cc96a", shape: "flower" },
  { id: "purple", name: "purple", color: "#a970ff", shape: "heart" },
];

export const beadById = (id: string) => BEADS.find((b) => b.id === id)!;

/** Pattern units by level, as positions into a set of distinct beads: AB, then AAB/ABB, then ABC, then AABB/ABCC. */
const UNITS: number[][][] = [[[0, 1]], [[0, 0, 1], [0, 1, 1]], [[0, 1, 2], [0, 0, 1, 1]], [[0, 1, 2, 2], [0, 0, 1, 2], [0, 1, 0, 2]]];

export const STRING_LENGTH = 10;

export interface Round {
  /** The repeating unit, as bead ids */
  unit: string[];
  /** Beads already on the string when the round starts; the child adds the rest */
  given: number;
  /** "copy": the whole pattern is shown on a card. "continue": only the start is on the string. */
  mode: "copy" | "continue";
  /** Bead kinds on the tray */
  tray: string[];
}

const shuffle = <T,>(list: T[], r: () => number) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** A round for this many finished necklaces: harder patterns and more tray beads as the child goes. */
export function makeRound(done: number, r: () => number = Math.random): Round {
  const level = Math.min(UNITS.length - 1, Math.floor(done / 2));
  const shape = UNITS[level][Math.floor(r() * UNITS[level].length)];
  const kinds = shuffle(BEADS.map((b) => b.id), r);
  const unit = shape.map((i) => kinds[i]);
  const used = [...new Set(unit)];
  // One bead kind that isn't in the pattern joins the tray from the second necklace on
  const tray = done >= 1 ? shuffle([...used, kinds[used.length]], r) : used;
  const mode = done % 2 === 0 ? "copy" : "continue";
  return { unit, given: mode === "copy" ? 0 : unit.length * 2 - (unit.length > 2 ? 1 : 0), mode, tray };
}

/** The bead that belongs at position i of the string. */
export const beadAt = (unit: readonly string[], i: number) => unit[i % unit.length];
