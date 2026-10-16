export interface WordPuzzle {
  word: string;
  /** Letters already shown (null = empty slot to fill) */
  slots: (string | null)[];
  /** Letter tiles to pick from, including any decoys */
  tiles: string[];
}

const ALPHABET = "abcdefghijklmnoprstuw".split("");

/**
 * Scaffolded spelling: level 0 leaves only the last letter to find, level 1 the last two, level 2+ the whole word,
 * and from level 3 a decoy tile or two join the tray.
 */
export function makePuzzle(word: string, level: number, rand: () => number = Math.random): WordPuzzle {
  const blanks = Math.min(word.length, level + 1);
  const slots = word.split("").map((ch, i) => (i < word.length - blanks ? ch : null));
  const missing = word.slice(word.length - blanks).split("");
  const decoyCount = level >= 4 ? 2 : level >= 3 ? 1 : 0;
  const decoys: string[] = [];
  for (const ch of [...ALPHABET].sort(() => rand() - 0.5)) {
    if (decoys.length >= decoyCount) break;
    if (!word.includes(ch)) decoys.push(ch);
  }
  return { word, slots, tiles: [...missing, ...decoys].sort(() => rand() - 0.5) };
}

export const nextSlot = (p: WordPuzzle) => p.slots.findIndex((s) => s === null);

/** Tapping a tile fills the next empty slot only if it is the right letter there; otherwise nothing changes. */
export function placeTile(p: WordPuzzle, tileIndex: number): { puzzle: WordPuzzle; ok: boolean; done: boolean } {
  const at = nextSlot(p);
  const letter = p.tiles[tileIndex];
  if (at < 0 || letter === undefined || p.word[at] !== letter) return { puzzle: p, ok: false, done: at < 0 };
  const slots = p.slots.map((s, i) => (i === at ? letter : s));
  const tiles = p.tiles.filter((_, i) => i !== tileIndex);
  const puzzle = { ...p, slots, tiles };
  return { puzzle, ok: true, done: nextSlot(puzzle) < 0 };
}
