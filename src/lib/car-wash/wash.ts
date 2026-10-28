/** Pure rules for Car Wash: the cars, where the mud splats go, and how clean the car is. */

export type CarKind = "hatch" | "pickup" | "bus";

export interface Car {
  kind: CarKind;
  name: string;
  color: string;
  /** Darker shade for trim and shadows */
  trim: string;
}

/** Car body outlines in a 400 x 240 box, shared by the SVG drawing and the canvas mud mask (Path2D). */
export const BODY: Record<CarKind, string> = {
  hatch: "M30 170 L30 130 Q34 112 60 108 L110 104 L150 62 Q160 52 180 52 L270 52 Q290 52 300 66 L330 104 L355 110 Q372 116 372 136 L372 170 Z",
  pickup: "M28 170 L28 128 Q30 112 52 110 L170 108 L170 58 Q170 48 182 48 L262 48 Q278 48 288 62 L318 104 L356 110 Q374 116 374 136 L374 170 Z",
  bus: "M26 170 L26 60 Q26 40 48 40 L340 40 Q372 40 374 74 L376 170 Z",
};

/** Wheel centres per kind; radius 30. */
export const WHEELS: Record<CarKind, [number, number][]> = {
  hatch: [[96, 172], [306, 172]],
  pickup: [[92, 172], [310, 172]],
  bus: [[86, 172], [316, 172]],
};

export const CARS: Car[] = [
  { kind: "hatch", name: "car", color: "#ff6b6b", trim: "#c94545" },
  { kind: "pickup", name: "truck", color: "#4d96ff", trim: "#2f6fcf" },
  { kind: "bus", name: "bus", color: "#ffd93d", trim: "#d9a91b" },
  { kind: "hatch", name: "car", color: "#6bcb77", trim: "#3f9a4c" },
  { kind: "pickup", name: "truck", color: "#ff9f43", trim: "#cf7420" },
  { kind: "hatch", name: "car", color: "#b583ff", trim: "#8656d1" },
];

export interface Splat {
  x: number;
  y: number;
  r: number;
}

/** Mud splats over the car's body (the canvas clips them to the body outline). */
export function mudSplats(kind: CarKind, r: () => number = Math.random, n = 26): Splat[] {
  const top = kind === "bus" ? 50 : 70;
  return Array.from({ length: n }, () => ({ x: 40 + r() * 320, y: top + r() * (165 - top), r: 18 + r() * 26 }));
}

/** Fraction (0..1) of the starting layer that has been wiped off. */
export function cleared(startCount: number, alpha: ArrayLike<number>): number {
  if (!startCount) return 1;
  let left = 0;
  for (let i = 0; i < alpha.length; i++) if (alpha[i] >= 64) left++;
  return Math.max(0, Math.min(1, 1 - left / startCount));
}

/** Cells that count as covered, for the starting count. */
export const coveredCount = (alpha: ArrayLike<number>) => {
  let n = 0;
  for (let i = 0; i < alpha.length; i++) if (alpha[i] >= 64) n++;
  return n;
};

/** Wash steps in order: scrub the mud off (it turns to foam), rinse the foam, then shine. */
export const STEPS = [
  { id: "scrub", say: "Scrub scrub! Rub the mud off with the sponge.", tool: "🧽" },
  { id: "rinse", say: "Now rinse the bubbles away with the water!", tool: "🚿" },
] as const;

/** How clean a layer must be before the next step. */
export const STEP_DONE = 0.86;
