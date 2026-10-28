/** Pure rules for Peekaboo Farm: who hides where, and who to look for next. */
import { ANIMALS, type TapItem } from "@/data/animals";

export const SPOTS = ["barn", "haystack", "flowers", "pond", "bush", "crate"] as const;
export type SpotId = (typeof SPOTS)[number];
export type Hiding = Record<SpotId, TapItem>;

/** Animals you meet on a farm (no lion). */
export const FARM_ANIMALS = ANIMALS.filter((a) => a.id !== "lion");
const POND_ANIMALS = ["duck", "frog"];

/** A different animal behind every spot; the pond always has a duck or a frog in it. */
export function hideAnimals(r: () => number = Math.random): Hiding {
  const pool = [...FARM_ANIMALS];
  const take = (ids?: string[]) => {
    const options = ids ? pool.filter((a) => ids.includes(a.id)) : pool;
    const a = options[Math.floor(r() * options.length)];
    pool.splice(pool.indexOf(a), 1);
    return a;
  };
  const pond = take(POND_ANIMALS);
  const out = { pond } as Hiding;
  for (const s of SPOTS) if (s !== "pond") out[s] = take();
  return out;
}

/** In "find" rounds: a spot whose animal has not been found yet this round, or null when everyone is found. */
export function pickTarget(found: ReadonlySet<SpotId>, r: () => number = Math.random, not?: SpotId): SpotId | null {
  const left = SPOTS.filter((s) => !found.has(s));
  const choices = left.length > 1 && not ? left.filter((s) => s !== not) : left;
  return choices.length ? choices[Math.floor(r() * choices.length)] : null;
}
