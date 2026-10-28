/** Pure rules for Juice Stand: fruits, what customers order, the blender, the juice colour and paying. */
import { COINS, type Coin, type Currency } from "@/lib/coin-shop/money";

export interface Fruit {
  id: string;
  name: string;
  plural: string;
  emoji: string;
  /** Juice colour */
  color: string;
}

/** In the order new fruits appear on the stand. */
export const FRUITS: Fruit[] = [
  { id: "strawberry", name: "strawberry", plural: "strawberries", emoji: "🍓", color: "#e8364f" },
  { id: "banana", name: "banana", plural: "bananas", emoji: "🍌", color: "#ffe066" },
  { id: "orange", name: "orange", plural: "oranges", emoji: "🍊", color: "#ff9a1f" },
  { id: "kiwi", name: "kiwi", plural: "kiwis", emoji: "🥝", color: "#8cc63f" },
  { id: "mango", name: "mango", plural: "mangoes", emoji: "🥭", color: "#ffb52e" },
  { id: "blueberry", name: "blueberry", plural: "blueberries", emoji: "🫐", color: "#5b5fc7" },
  { id: "watermelon", name: "watermelon", plural: "watermelons", emoji: "🍉", color: "#ff5c7a" },
  { id: "pineapple", name: "pineapple", plural: "pineapples", emoji: "🍍", color: "#f7d046" },
];

export const fruitById = (id: string) => FRUITS.find((f) => f.id === id)!;

/** Fruits on the stand: four to start, one more every two customers. */
export const fruitsFor = (served: number) => FRUITS.slice(0, Math.min(FRUITS.length, 4 + Math.floor(served / 2)));

export interface OrderLine {
  fruit: string;
  count: number;
}

export type Blender = Record<string, number>;

const pick = <T,>(list: readonly T[], r: () => number) => list[Math.floor(r() * list.length)];

/**
 * What the next customer wants. Grows with the customers served: one fruit, then two different fruits,
 * then counting ("two bananas and a kiwi"), never more than four fruits in all.
 */
export function makeOrder(served: number, r: () => number = Math.random): OrderLine[] {
  const pool = [...fruitsFor(served)];
  const kinds = served < 2 ? 1 : served < 5 ? 2 : 1 + Math.floor(r() * 2);
  const lines: OrderLine[] = [];
  for (let k = 0; k < kinds; k++) lines.push({ fruit: pool.splice(Math.floor(r() * pool.length), 1)[0].id, count: 1 });
  if (served >= 5) {
    // Counting orders: add extra fruit up to four in all
    const extra = Math.floor(r() * (5 - kinds));
    for (let e = 0; e < extra; e++) pick(lines, r).count++;
  }
  return lines;
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four"];

/** "A strawberry juice, please!", "Strawberry and banana juice, please!", "Two bananas and one kiwi, please!" */
export function orderText(order: OrderLine[]): string {
  const counting = order.some((l) => l.count > 1);
  const parts = order.map((l) => {
    const f = fruitById(l.fruit);
    return counting ? `${NUMBER_WORDS[l.count]} ${l.count === 1 ? f.name : f.plural}` : f.name;
  });
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0];
  if (counting) return `${list[0].toUpperCase()}${list.slice(1)} in my juice, please!`;
  return order.length === 1 ? `${/^[aeiou]/.test(list) ? "An" : "A"} ${list} juice, please!` : `${list[0].toUpperCase()}${list.slice(1)} juice, please!`;
}

export type AddResult = "added" | "complete" | "not-wanted" | "enough";

/** Putting a fruit in the blender. Fruit the customer did not ask for, or one too many, bounces back out. */
export function addFruit(order: OrderLine[], blender: Blender, fruit: string): { result: AddResult; blender: Blender } {
  const line = order.find((l) => l.fruit === fruit);
  if (!line) return { result: "not-wanted", blender };
  if ((blender[fruit] ?? 0) >= line.count) return { result: "enough", blender };
  const next = { ...blender, [fruit]: (blender[fruit] ?? 0) + 1 };
  return { result: isComplete(order, next) ? "complete" : "added", blender: next };
}

export const isComplete = (order: OrderLine[], blender: Blender) => order.every((l) => (blender[l.fruit] ?? 0) === l.count);

export const fruitCount = (order: OrderLine[]) => order.reduce((n, l) => n + l.count, 0);

/** The blended juice: each fruit's colour weighted by how many went in. */
export function juiceColor(blender: Blender): string {
  let n = 0;
  const rgb = [0, 0, 0];
  for (const [id, count] of Object.entries(blender)) {
    const hex = fruitById(id).color;
    for (let i = 0; i < 3; i++) rgb[i] += parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) * count;
    n += count;
  }
  if (!n) return "#ffffff";
  return `#${rgb.map((v) => Math.round(v / n).toString(16).padStart(2, "0")).join("")}`;
}

/** Price of one fruit: easy steps to count in each currency. */
export const FRUIT_PRICE: Record<Currency, number> = { USD: 25, GBP: 20, AED: 50 };

export const priceOf = (cur: Currency, order: OrderLine[]) => FRUIT_PRICE[cur] * fruitCount(order);

/** The coins a customer hands over for an exact amount: the fewest coins, biggest first. */
export function coinsFor(cur: Currency, amount: number): Coin[] {
  const out: Coin[] = [];
  let left = amount;
  for (const c of [...COINS[cur]].reverse()) {
    while (left >= c.value) {
      out.push(c);
      left -= c.value;
    }
  }
  return out;
}

/** After six customers, every third one pays with one big coin and the child works out the change. */
export const isChangeRound = (served: number) => served >= 6 && served % 3 === 2;
