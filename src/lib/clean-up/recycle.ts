/** Pure rules for Clean-Up & Recycle: litter, bins, and which bin each thing goes in. */

export type BinId = "paper" | "plastic" | "food" | "metal";

export interface Bin {
  id: BinId;
  name: string;
  color: string;
  emoji: string;
  /** Spoken when something goes in */
  becomes: string;
}

export interface Litter {
  id: string;
  name: string;
  emoji: string;
  bin: BinId;
}

export const BINS: Bin[] = [
  { id: "paper", name: "paper", color: "#4d96ff", emoji: "📄", becomes: "Paper gets made into new paper!" },
  { id: "plastic", name: "plastic", color: "#ffc93c", emoji: "🧴", becomes: "Plastic can be made into new things!" },
  { id: "food", name: "food", color: "#5cb85c", emoji: "🍂", becomes: "Food scraps turn into soil for plants!" },
  { id: "metal", name: "cans", color: "#9aa3ad", emoji: "🥫", becomes: "Cans get melted and made into new cans!" },
];

export const LITTER: Litter[] = [
  { id: "newspaper", name: "newspaper", emoji: "📰", bin: "paper" },
  { id: "box", name: "cardboard box", emoji: "📦", bin: "paper" },
  { id: "envelope", name: "envelope", emoji: "✉️", bin: "paper" },
  { id: "cup", name: "plastic cup", emoji: "🥤", bin: "plastic" },
  { id: "bottle", name: "plastic bottle", emoji: "🧴", bin: "plastic" },
  { id: "bag", name: "plastic bag", emoji: "🛍️", bin: "plastic" },
  { id: "peel", name: "banana peel", emoji: "🍌", bin: "food" },
  { id: "apple", name: "apple core", emoji: "🍎", bin: "food" },
  { id: "bread", name: "old bread", emoji: "🍞", bin: "food" },
  { id: "can", name: "tin can", emoji: "🥫", bin: "metal" },
  { id: "soda", name: "drink can", emoji: "🥫", bin: "metal" },
];

export const binById = (id: BinId) => BINS.find((b) => b.id === id)!;
export const litterById = (id: string) => LITTER.find((l) => l.id === id)!;

/** Bins in play: three to start, cans join after two clean parks. */
export const binsFor = (level: number) => BINS.filter((b) => b.id !== "metal" || level >= 2);

export interface Piece {
  /** Unique per piece, since the same thing can be dropped twice */
  key: string;
  litter: string;
  x: number;
  y: number;
  rot: number;
}

/** Litter scattered around the park (positions in %), using only the bins in play and at least one of each. */
export function makeLitter(level: number, r: () => number = Math.random): Piece[] {
  const bins = binsFor(level).map((b) => b.id);
  const pool = LITTER.filter((l) => bins.includes(l.bin));
  const count = Math.min(9, 5 + level);
  const picks = bins.map((b) => pool.filter((l) => l.bin === b)[Math.floor(r() * pool.filter((l) => l.bin === b).length)]);
  while (picks.length < count) picks.push(pool[Math.floor(r() * pool.length)]);
  // A 3 x 3 grid of spots, jittered, so pieces don't land on each other
  const spots = Array.from({ length: 9 }, (_, i) => i).sort(() => r() - 0.5);
  return picks.map((l, i) => ({
    key: `${l.id}-${i}`,
    litter: l.id,
    x: 14 + (spots[i] % 3) * 36 + (r() - 0.5) * 12,
    y: 18 + Math.floor(spots[i] / 3) * 30 + (r() - 0.5) * 10,
    rot: Math.round((r() - 0.5) * 50),
  }));
}

export const goesIn = (litter: string, bin: BinId) => litterById(litter).bin === bin;
