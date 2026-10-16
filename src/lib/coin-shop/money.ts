export type Currency = "USD" | "GBP" | "AED";

export interface Coin {
  /** Value in the smallest unit (cents, pence, fils) */
  value: number;
  label: string;
  /** Spoken name, e.g. "a quarter" */
  say: string;
  metal: "copper" | "silver" | "gold";
}

export const COINS: Record<Currency, Coin[]> = {
  USD: [
    { value: 1, label: "1¢", say: "a penny", metal: "copper" },
    { value: 5, label: "5¢", say: "a nickel", metal: "silver" },
    { value: 10, label: "10¢", say: "a dime", metal: "silver" },
    { value: 25, label: "25¢", say: "a quarter", metal: "silver" },
    { value: 100, label: "$1", say: "one dollar", metal: "gold" },
  ],
  GBP: [
    { value: 1, label: "1p", say: "one penny", metal: "copper" },
    { value: 2, label: "2p", say: "two pence", metal: "copper" },
    { value: 5, label: "5p", say: "five pence", metal: "silver" },
    { value: 10, label: "10p", say: "ten pence", metal: "silver" },
    { value: 20, label: "20p", say: "twenty pence", metal: "silver" },
    { value: 50, label: "50p", say: "fifty pence", metal: "silver" },
    { value: 100, label: "£1", say: "one pound", metal: "gold" },
    { value: 200, label: "£2", say: "two pounds", metal: "gold" },
  ],
  AED: [
    { value: 25, label: "25 fils", say: "twenty-five fils", metal: "copper" },
    { value: 50, label: "50 fils", say: "fifty fils", metal: "silver" },
    { value: 100, label: "1 AED", say: "one dirham", metal: "silver" },
  ],
};

export const CURRENCY_NAMES: Record<Currency, string> = { USD: "Dollars", GBP: "Pounds", AED: "Dirhams" };

/** The device language suggests the currency: en-GB → pounds, Arabic or *-AE → dirhams, otherwise dollars. */
export function currencyForLocale(locale: string): Currency {
  const l = locale.toLowerCase();
  if (l.endsWith("-gb") || l === "en-gb") return "GBP";
  if (l.startsWith("ar") || l.endsWith("-ae")) return "AED";
  return "USD";
}

export function formatMoney(cur: Currency, amount: number): string {
  if (cur === "USD") return amount < 100 ? `${amount}¢` : `$${(amount / 100).toFixed(2)}`;
  if (cur === "GBP") return amount < 100 ? `${amount}p` : `£${(amount / 100).toFixed(2)}`;
  return amount < 100 ? `${amount} fils` : `${(amount / 100).toFixed(2)} AED`;
}

export function sayMoney(cur: Currency, amount: number): string {
  const major = Math.floor(amount / 100);
  const minor = amount % 100;
  const [big, bigs, small] = cur === "USD" ? ["dollar", "dollars", "cents"] : cur === "GBP" ? ["pound", "pounds", "pence"] : ["dirham", "dirhams", "fils"];
  const parts: string[] = [];
  if (major) parts.push(`${major} ${major === 1 ? big : bigs}`);
  if (minor || !major) parts.push(`${minor} ${small}`);
  return parts.join(" and ");
}

export const SHOP_ITEMS = ["🍎", "🍌", "🧃", "🍪", "🧸", "🎈", "✏️", "🍭", "🪀", "🧁", "🥕", "🚗", "📒", "🍦", "🪁", "🎾"];

/**
 * A price the child can pay exactly with the coins on offer. Level 0: small round amounts; level 1: any amount
 * up to a little over one big coin; level 2+: larger amounts.
 */
export function makePrice(cur: Currency, level: number, rand: () => number = Math.random): number {
  const unit = COINS[cur][0].value;
  const steps = cur === "AED" ? [4, 6, 8][Math.min(2, level)] : [10, 99, 200][Math.min(2, level)];
  const round = cur === "AED" ? 1 : level === 0 ? 5 : 1;
  const n = 1 + Math.floor(rand() * steps);
  return Math.max(unit, n * unit * round);
}

export const total = (values: number[]) => values.reduce((a, b) => a + b, 0);

/** For "give change": the smallest coin worth at least the price, and the change owed. */
export function changeFor(cur: Currency, price: number): { paid: Coin; change: number } | null {
  const paid = COINS[cur].find((c) => c.value > price);
  return paid ? { paid, change: paid.value - price } : null;
}
