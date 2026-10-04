/** Pure rules for Cake Bakery: what a cake is, what customers order, how a finished cake scores. */
export interface Flavor {
  id: string;
  name: string;
  emoji: string;
  sponge: string;
  batter: string;
}

export const FLAVORS: Flavor[] = [
  { id: "vanilla", name: "Vanilla", emoji: "🍦", sponge: "#f1cf84", batter: "#f9e8b5" },
  { id: "chocolate", name: "Chocolate", emoji: "🍫", sponge: "#7a4a2e", batter: "#6b4228" },
  { id: "strawberry", name: "Strawberry", emoji: "🍓", sponge: "#f49bb4", batter: "#fbbccd" },
  { id: "lemon", name: "Lemon", emoji: "🍋", sponge: "#f7dc55", batter: "#fdf08f" },
  { id: "blueberry", name: "Blueberry", emoji: "🫐", sponge: "#9a8cf0", batter: "#bdb3f6" },
  { id: "mint", name: "Mint", emoji: "🌿", sponge: "#93dcb9", batter: "#b8efd6" },
];

export interface Frosting {
  id: string;
  name: string;
  color: string;
}

export const FROSTINGS: Frosting[] = [
  { id: "white", name: "White", color: "#fffaf5" },
  { id: "pink", name: "Pink", color: "#ff8fb8" },
  { id: "lilac", name: "Lilac", color: "#c9a6ff" },
  { id: "sky", name: "Sky", color: "#7fd6ff" },
  { id: "yellow", name: "Yellow", color: "#ffe36e" },
  { id: "mint", name: "Mint", color: "#9be59f" },
  { id: "chocolate", name: "Chocolate", color: "#7b4a32" },
];

export interface Topping {
  id: string;
  name: string;
  emoji: string;
}

export const TOPPINGS: Topping[] = [
  { id: "strawberry", name: "Strawberry", emoji: "🍓" },
  { id: "cherry", name: "Cherry", emoji: "🍒" },
  { id: "star", name: "Star", emoji: "⭐" },
  { id: "candle", name: "Candle", emoji: "🕯️" },
  { id: "flower", name: "Flower", emoji: "🌸" },
  { id: "heart", name: "Heart", emoji: "💖" },
  { id: "candy", name: "Candy", emoji: "🍬" },
  { id: "sprinkles", name: "Sprinkles", emoji: "🎉" },
];

export type PipeShape = "dot" | "star" | "swirl";
export const PIPES: { id: PipeShape; name: string; emoji: string }[] = [
  { id: "dot", name: "Dots", emoji: "⚪" },
  { id: "star", name: "Stars", emoji: "✴️" },
  { id: "swirl", name: "Swirls", emoji: "🌀" },
];

export interface CakeSpec {
  flavor: string;
  tiers: number;
  /** Id of the frosting that covers most of the cake, or null if it is bare */
  frosting: string | null;
  /** Topping ids on the cake (one entry per placed topping) */
  toppings: string[];
}

export interface Order {
  customer: Customer;
  flavor: string;
  tiers?: number;
  frosting?: string;
  toppings: string[];
}

export interface Customer {
  name: string;
  skin: string;
  outfit: string;
  hair: string;
}

export const CUSTOMERS: Customer[] = [
  { name: "Mia", skin: "#f6c9a5", outfit: "#ff7aa8", hair: "#5b3a29" },
  { name: "Leo", skin: "#d8a47a", outfit: "#4aa8ff", hair: "#2b1d16" },
  { name: "Ava", skin: "#8d5a3c", outfit: "#ffb43a", hair: "#1d1410" },
  { name: "Zoe", skin: "#ffe0c2", outfit: "#8f6cff", hair: "#e0a23c" },
  { name: "Sam", skin: "#c68a63", outfit: "#4fd18b", hair: "#3a2418" },
];

/** Simple seeded random so tests are deterministic. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const pick = <T,>(list: T[], r: () => number) => list[Math.floor(r() * list.length) % list.length];

/**
 * Orders start with just a flavour and grow: tiers after 2 cakes, frosting after 4,
 * then up to three toppings. `unlockedToppings` limits what can be asked for.
 */
export function makeOrder(served: number, unlockedToppings: string[], r: () => number = Math.random): Order {
  const customer = pick(CUSTOMERS, r);
  const order: Order = { customer, flavor: pick(FLAVORS, r).id, toppings: [] };
  if (served >= 2) order.tiers = 1 + Math.floor(r() * Math.min(3, 1 + Math.floor((served - 1) / 3)));
  if (served >= 4) order.frosting = pick(FROSTINGS, r).id;
  if (served >= 6) {
    const n = Math.min(3, 1 + Math.floor((served - 6) / 4));
    const pool = TOPPINGS.filter((t) => unlockedToppings.includes(t.id) && t.id !== "sprinkles");
    while (order.toppings.length < n && pool.length) order.toppings.push(pool.splice(Math.floor(r() * pool.length), 1)[0].id);
  }
  return order;
}

export interface Grade {
  stars: 1 | 2 | 3;
  /** What the customer asked for and whether it matched */
  checks: { label: string; ok: boolean }[];
  coins: number;
}

export function scoreCake(order: Order | null, cake: CakeSpec): Grade {
  const checks: Grade["checks"] = [];
  if (order) {
    const f = FLAVORS.find((x) => x.id === order.flavor);
    checks.push({ label: `${f?.name ?? order.flavor} cake`, ok: cake.flavor === order.flavor });
    if (order.tiers) checks.push({ label: `${order.tiers} ${order.tiers === 1 ? "layer" : "layers"}`, ok: cake.tiers === order.tiers });
    if (order.frosting) checks.push({ label: `${FROSTINGS.find((x) => x.id === order.frosting)?.name ?? ""} frosting`, ok: cake.frosting === order.frosting });
    for (const t of order.toppings) checks.push({ label: TOPPINGS.find((x) => x.id === t)?.name ?? t, ok: cake.toppings.includes(t) });
  }
  const ok = checks.filter((c) => c.ok).length;
  const ratio = checks.length ? ok / checks.length : 1;
  // Never harsh: anything is at least one star, and a free bake always earns three.
  const stars = ratio >= 1 ? 3 : ratio >= 0.5 ? 2 : 1;
  const flair = Math.min(6, new Set(cake.toppings).size * 2) + (cake.frosting ? 2 : 0);
  return { stars: stars as 1 | 2 | 3, checks, coins: 4 * stars + flair };
}

/** Short spoken reaction by star count. */
export function reaction(stars: 1 | 2 | 3, name: string): string {
  if (stars === 3) return `Wow ${name} loves it! Perfect!`;
  if (stars === 2) return `Yum! ${name} loves it!`;
  return `Thank you! ${name} says it looks tasty!`;
}
