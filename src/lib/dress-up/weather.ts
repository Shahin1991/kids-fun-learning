/** Pure rules for Dress for the Weather: what each weather needs and what is on the tray. */

export type Slot = "head" | "eyes" | "neck" | "body" | "hands" | "hand" | "feet";
export type WeatherId = "sunny" | "rainy" | "snowy";

export interface Clothing {
  id: string;
  name: string;
  emoji: string;
  slot: Slot;
  /** Why it helps, spoken when it goes on */
  why: string;
}

export interface Weather {
  id: WeatherId;
  label: string;
  emoji: string;
  /** Spoken when the weather arrives */
  intro: string;
  needs: string[];
}

export const CLOTHES: Clothing[] = [
  { id: "sunglasses", name: "sunglasses", emoji: "🕶️", slot: "eyes", why: "Sunglasses keep the bright sun out of your eyes." },
  { id: "sunhat", name: "sun hat", emoji: "👒", slot: "head", why: "A sun hat gives you shade." },
  { id: "suncream", name: "sun cream", emoji: "🧴", slot: "hand", why: "Sun cream keeps your skin safe." },
  { id: "umbrella", name: "umbrella", emoji: "☂️", slot: "hand", why: "An umbrella keeps the rain off." },
  { id: "boots", name: "boots", emoji: "👢", slot: "feet", why: "Boots are for splashing in puddles!" },
  { id: "scarf", name: "scarf", emoji: "🧣", slot: "neck", why: "A scarf keeps your neck cosy." },
  { id: "gloves", name: "gloves", emoji: "🧤", slot: "hands", why: "Gloves keep your fingers warm." },
  { id: "coat", name: "coat", emoji: "🧥", slot: "body", why: "A big coat keeps you warm." },
];

export const WEATHERS: Weather[] = [
  { id: "sunny", label: "Sunny", emoji: "☀️", intro: "It's a hot, sunny day! What should we wear?", needs: ["sunglasses", "sunhat", "suncream"] },
  { id: "rainy", label: "Rainy", emoji: "🌧️", intro: "Pitter patter, it's raining! What should we wear?", needs: ["umbrella", "boots"] },
  { id: "snowy", label: "Snowy", emoji: "❄️", intro: "Brr, it's snowing! What should we wear?", needs: ["scarf", "gloves", "coat"] },
];

export const clothingById = (id: string) => CLOTHES.find((c) => c.id === id)!;
export const weatherById = (id: WeatherId) => WEATHERS.find((w) => w.id === id)!;

/**
 * The tray: everything this weather needs plus some things it doesn't. Starts with one extra item and grows
 * to the whole wardrobe, so the choices widen as the child plays.
 */
export function makeTray(weather: Weather, level: number, r: () => number = Math.random): string[] {
  const others = CLOTHES.filter((c) => !weather.needs.includes(c.id)).map((c) => c.id);
  const extra = Math.min(others.length, 1 + level * 2);
  const picked: string[] = [];
  while (picked.length < extra) {
    const id = others.splice(Math.floor(r() * others.length), 1)[0];
    picked.push(id);
  }
  const all = [...weather.needs, ...picked];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

export type WearResult = "on" | "dressed" | "wrong" | "already";

/** Trying an item on: only what the weather needs goes on; the last one finishes the outfit. */
export function wear(weather: Weather, worn: readonly string[], item: string): WearResult {
  if (!weather.needs.includes(item)) return "wrong";
  if (worn.includes(item)) return "already";
  return weather.needs.every((n) => n === item || worn.includes(n)) ? "dressed" : "on";
}

/** The next weather, never the same twice in a row. */
export function nextWeather(prev: WeatherId | null, r: () => number = Math.random): WeatherId {
  const options = WEATHERS.filter((w) => w.id !== prev);
  return options[Math.floor(r() * options.length)].id;
}
