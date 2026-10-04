import { FROSTINGS, PIPES, TOPPINGS } from "./recipe";

/** Gifts are unlocked by total coins earned; nothing is ever bought, so nobody can run out. */
export interface Unlock {
  at: number;
  kind: "topping" | "frosting" | "pipe";
  id: string;
}

export const UNLOCK_ORDER: Unlock[] = [
  { at: 12, kind: "topping", id: "flower" },
  { at: 25, kind: "frosting", id: "yellow" },
  { at: 40, kind: "pipe", id: "star" },
  { at: 60, kind: "topping", id: "heart" },
  { at: 85, kind: "frosting", id: "mint" },
  { at: 110, kind: "topping", id: "candy" },
  { at: 140, kind: "pipe", id: "swirl" },
  { at: 175, kind: "frosting", id: "chocolate" },
  { at: 210, kind: "topping", id: "sprinkles" },
];

const STARTERS = { topping: ["strawberry", "cherry", "star", "candle"], frosting: ["white", "pink", "lilac", "sky"], pipe: ["dot"] };

export interface Unlocked {
  toppings: string[];
  frostings: string[];
  pipes: string[];
}

export function unlockedFor(totalCoins: number): Unlocked {
  const got = UNLOCK_ORDER.filter((u) => totalCoins >= u.at);
  const all = (kind: Unlock["kind"], base: string[]) => [...base, ...got.filter((u) => u.kind === kind).map((u) => u.id)];
  const order = <T extends { id: string }>(list: T[], ids: string[]) => list.filter((x) => ids.includes(x.id)).map((x) => x.id);
  return {
    toppings: order(TOPPINGS, all("topping", STARTERS.topping)),
    frostings: order(FROSTINGS, all("frosting", STARTERS.frosting)),
    pipes: order(PIPES, all("pipe", STARTERS.pipe)),
  };
}

/** Items newly unlocked when coins go from `before` to `after`. */
export function newlyUnlocked(before: number, after: number): Unlock[] {
  return UNLOCK_ORDER.filter((u) => before < u.at && after >= u.at);
}

export interface Progress {
  coins: number;
  served: number;
}

const KEY = "cake-bakery-v2";

export function loadProgress(): Progress {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return { coins: Number(p.coins) || 0, served: Number(p.served) || 0 };
  } catch {
    return { coins: 0, served: 0 };
  }
}

export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage unavailable: progress just isn't kept
  }
}
