export type Pot = "red" | "yellow" | "blue" | "white";
export type Counts = Record<Pot, number>;
/** Drops of red, yellow, blue, white. */
export type Recipe = readonly [number, number, number, number];

export const MAX_DROPS = 8;

export const POTS: { id: Pot; label: string; color: string }[] = [
  { id: "red", label: "Red", color: "#ff4d4d" },
  { id: "yellow", label: "Yellow", color: "#ffd933" },
  { id: "blue", label: "Blue", color: "#408cff" },
  { id: "white", label: "White", color: "#ffffff" },
];

export const emptyCounts = (): Counts => ({ red: 0, yellow: 0, blue: 0, white: 0 });
export const total = (c: Counts) => c.red + c.yellow + c.blue + c.white;
export const toCounts = ([red, yellow, blue, white]: Recipe): Counts => ({ red, yellow, blue, white });
const toRecipe = (c: Counts): Recipe => [c.red, c.yellow, c.blue, c.white];

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
function reduce(r: Recipe): Recipe {
  const g = r.reduce(gcd, 0);
  return g === 0 ? r : (r.map((n) => n / g) as unknown as Recipe);
}

/** Two glasses make the same colour when their drops are in the same proportion: 2 red + 2 yellow is 1 + 1. */
export function sameRecipe(a: Counts, b: Counts): boolean {
  const x = reduce(toRecipe(a));
  const y = reduce(toRecipe(b));
  return x.every((n, i) => n === y[i]);
}

// Painters' red-yellow-blue cube: the colour at each corner, indexed by which primaries are present.
type RGB = readonly [number, number, number];
const CORNER: Record<string, RGB> = {
  "000": [255, 255, 255],
  "100": [255, 77, 77],
  "010": [255, 217, 51],
  "001": [64, 140, 255],
  "110": [255, 153, 38],
  "101": [153, 64, 217],
  "011": [64, 191, 89],
  "111": [102, 64, 38],
};

function rybToRgb(r: number, y: number, b: number): RGB {
  const out = [0, 0, 0];
  for (const cr of [0, 1])
    for (const cy of [0, 1])
      for (const cb of [0, 1]) {
        const w = (cr ? r : 1 - r) * (cy ? y : 1 - y) * (cb ? b : 1 - b);
        const c = CORNER[`${cr}${cy}${cb}`];
        for (let i = 0; i < 3; i++) out[i] += w * c[i];
      }
  return out as unknown as RGB;
}

function rgbOf(c: Counts): RGB | null {
  const paint = c.red + c.yellow + c.blue;
  if (paint + c.white === 0) return null;
  if (paint === 0) return [255, 255, 255];
  // only the proportions matter, so the strongest primary counts as full strength
  const max = Math.max(c.red, c.yellow, c.blue);
  const base = rybToRgb(c.red / max, c.yellow / max, c.blue / max);
  const tint = c.white / (paint + c.white);
  return base.map((v) => v + (255 - v) * tint) as unknown as RGB;
}

export function mixColour(c: Counts): string | null {
  const rgb = rgbOf(c);
  return rgb && `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

export interface NamedColour {
  name: string;
  recipe: Recipe;
}

export const NAMED: NamedColour[] = [
  { name: "Red", recipe: [1, 0, 0, 0] },
  { name: "Red orange", recipe: [2, 1, 0, 0] },
  { name: "Orange", recipe: [1, 1, 0, 0] },
  { name: "Yellow orange", recipe: [1, 2, 0, 0] },
  { name: "Yellow", recipe: [0, 1, 0, 0] },
  { name: "Yellow green", recipe: [0, 2, 1, 0] },
  { name: "Green", recipe: [0, 1, 1, 0] },
  { name: "Blue green", recipe: [0, 1, 2, 0] },
  { name: "Blue", recipe: [0, 0, 1, 0] },
  { name: "Blue purple", recipe: [1, 0, 2, 0] },
  { name: "Purple", recipe: [1, 0, 1, 0] },
  { name: "Red purple", recipe: [2, 0, 1, 0] },
  { name: "Brown", recipe: [1, 1, 1, 0] },
  { name: "Pink", recipe: [1, 0, 0, 1] },
  { name: "Peach", recipe: [1, 1, 0, 1] },
  { name: "Light yellow", recipe: [0, 1, 0, 1] },
  { name: "Light green", recipe: [0, 1, 1, 1] },
  { name: "Sky blue", recipe: [0, 0, 1, 1] },
  { name: "Lilac", recipe: [1, 0, 1, 1] },
  { name: "White", recipe: [0, 0, 0, 1] },
];

export const colourOf = (n: NamedColour) => mixColour(toCounts(n.recipe)) ?? "#ffffff";

/** What the glass looks like: the exact recipe if it is one we know, otherwise the closest colour. */
export function nameOf(c: Counts): NamedColour | null {
  const rgb = rgbOf(c);
  if (!rgb) return null;
  const exact = NAMED.find((n) => sameRecipe(c, toCounts(n.recipe)));
  if (exact) return exact;
  let best = NAMED[0];
  let bestD = Infinity;
  for (const n of NAMED) {
    const o = rgbOf(toCounts(n.recipe))!;
    const d = (o[0] - rgb[0]) ** 2 + (o[1] - rgb[1]) ** 2 + (o[2] - rgb[2]) ** 2;
    if (d < bestD) [best, bestD] = [n, d];
  }
  return best;
}

const list = (words: string[]) => (words.length < 2 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`);

/** "2 red and 1 yellow": how many drops of each pot, for hints. */
export function recipeSpeech(r: Recipe): string {
  return list(POTS.flatMap((p, i) => (r[i] > 0 ? [`${r[i]} ${p.label.toLowerCase()}`] : [])));
}

/** Spoken after a pour: which pots went in and what they make. */
export function explain(c: Counts): string {
  const n = nameOf(c);
  if (!n) return "";
  const used = POTS.filter((p) => c[p.id] > 0).map((p) => p.label.toLowerCase());
  if (used.length === 1) return `${n.name}!`;
  const exact = sameRecipe(c, toCounts(n.recipe));
  return exact ? `${list(used)} make ${n.name.toLowerCase()}.` : `That looks like ${n.name.toLowerCase()}.`;
}

const byName = (...names: string[]) => names.map((n) => NAMED.find((x) => x.name === n)!);
const SIMPLE = byName("Orange", "Green", "Purple");
const MIDDLE = [...SIMPLE, ...byName("Pink", "Light green", "Sky blue", "Peach", "Lilac", "Brown")];
const ALL_MIXES = NAMED.filter((n) => !["Red", "Yellow", "Blue", "White"].includes(n.name));

/** Colours to ask for: the three famous ones first, then tints, then every shade in between. */
export function poolFor(streak: number): NamedColour[] {
  return streak < 3 ? SIMPLE : streak < 7 ? MIDDLE : ALL_MIXES;
}

export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pickTarget(streak: number, avoid: string | null, rng: () => number = Math.random): NamedColour {
  const pool = poolFor(streak).filter((n) => n.name !== avoid);
  return pool[Math.floor(rng() * pool.length)];
}

export interface MixQuestion {
  answer: NamedColour;
  choices: NamedColour[];
}

/** "What colour do these make?": 3 choices at first, 4 later, wrong ones kept clearly different early on. */
export function mixQuestion(streak: number, avoid: ReadonlySet<string> = new Set(), rng: () => number = Math.random): MixQuestion {
  const fresh = poolFor(streak).filter((n) => !avoid.has(n.name));
  const pool = fresh.length ? fresh : poolFor(streak);
  const answer = pool[Math.floor(rng() * pool.length)];
  const wrongPool = streak < 3 ? [...SIMPLE, ...byName("Red", "Yellow", "Blue", "Pink")] : NAMED.filter((n) => n.name !== "White");
  const wrong = shuffle(wrongPool.filter((n) => n.name !== answer.name), rng).slice(0, streak < 3 ? 2 : 3);
  return { answer, choices: shuffle([answer, ...wrong], rng) };
}
