/** The xylophone: C major from middle C to the C above, one rainbow colour per bar. */
export const BARS = [
  { name: "C", freq: 261.63, color: "#ff4d4d" },
  { name: "D", freq: 293.66, color: "#ff922b" },
  { name: "E", freq: 329.63, color: "#ffd43b" },
  { name: "F", freq: 349.23, color: "#51cf66" },
  { name: "G", freq: 392.0, color: "#22b8cf" },
  { name: "A", freq: 440.0, color: "#4d7cff" },
  { name: "B", freq: 493.88, color: "#9b5de5" },
  { name: "C", freq: 523.25, color: "#f06595" },
] as const;

/** Well-known public-domain tunes as bar indexes (0 = C … 7 = high C). */
export const SONGS: { id: string; title: string; emoji: string; notes: number[] }[] = [
  { id: "twinkle", title: "Twinkle Twinkle", emoji: "⭐", notes: [0, 0, 4, 4, 5, 5, 4, 3, 3, 2, 2, 1, 1, 0, 4, 4, 3, 3, 2, 2, 1, 4, 4, 3, 3, 2, 2, 1, 0, 0, 4, 4, 5, 5, 4, 3, 3, 2, 2, 1, 1, 0] },
  { id: "mary", title: "Mary Had a Little Lamb", emoji: "🐑", notes: [2, 1, 0, 1, 2, 2, 2, 1, 1, 1, 2, 4, 4, 2, 1, 0, 1, 2, 2, 2, 2, 1, 1, 2, 1, 0] },
  { id: "buns", title: "Hot Cross Buns", emoji: "🥯", notes: [2, 1, 0, 2, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 1, 0] },
  { id: "row", title: "Row Your Boat", emoji: "🚣", notes: [0, 0, 0, 1, 2, 2, 1, 2, 3, 4, 7, 7, 7, 4, 4, 4, 2, 2, 2, 0, 0, 0, 4, 3, 2, 1, 0] },
];

/** Copy-me game: the tune grows by one random bar each time, never repeating the same bar three times in a row. */
export function extendTune(tune: number[], rand: () => number = Math.random, bars = 5): number[] {
  let n = Math.floor(rand() * bars);
  const [a, b] = tune.slice(-2);
  if (a === n && b === n) n = (n + 1) % bars;
  return [...tune, n];
}

export type CopyResult = "keep-going" | "wrong" | "complete";

/** Checks the child's taps so far against the tune. */
export function checkCopy(tune: number[], taps: number[]): CopyResult {
  for (let i = 0; i < taps.length; i++) if (taps[i] !== tune[i]) return "wrong";
  return taps.length >= tune.length ? "complete" : "keep-going";
}
