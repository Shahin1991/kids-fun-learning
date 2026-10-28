/** Pure rules for Tens & Ones: target numbers, what is on the mats, and how close the child is. */

export interface Mats {
  hundreds: number;
  tens: number;
  ones: number;
}

export const EMPTY: Mats = { hundreds: 0, tens: 0, ones: 0 };

export const valueOf = (m: Mats) => m.hundreds * 100 + m.tens * 10 + m.ones;

/**
 * Level by rounds solved: teens with loose sticks only (so the child bundles ten), then up to 59, then up to 99,
 * then 100-199 with a hundreds mat (CBSE Class 2-3).
 */
export function levelFor(solved: number): number {
  return solved < 3 ? 0 : solved < 7 ? 1 : solved < 12 ? 2 : 3;
}

export function makeTarget(level: number, r: () => number = Math.random): number {
  const [lo, hi] = [[11, 19], [20, 59], [21, 99], [101, 199]][Math.min(3, level)];
  let n = lo + Math.floor(r() * (hi - lo + 1));
  // Round tens are easy; nudge most of them off
  if (n % 10 === 0 && r() < 0.7) n += 1 + Math.floor(r() * 8);
  return Math.min(hi, n);
}

export const hasHundreds = (level: number) => level >= 3;

export type Check = "match" | "bundle" | "more" | "less";

/**
 * Comparing the mats with the target. The right total with ten or more loose pieces asks for a bundle first,
 * because "34 is 3 tens and 4 ones" is the point.
 */
export function check(target: number, m: Mats): Check {
  const v = valueOf(m);
  if (v < target) return "more";
  if (v > target) return "less";
  return m.ones >= 10 || m.tens >= 10 ? "bundle" : "match";
}

/** Ten loose ones become a ten; ten tens become a hundred. */
export function bundle(m: Mats): Mats {
  if (m.ones >= 10) return { ...m, ones: m.ones - 10, tens: m.tens + 1 };
  if (m.tens >= 10) return { ...m, tens: m.tens - 10, hundreds: m.hundreds + 1 };
  return m;
}

/** "3 tens and 4 ones", "1 hundred, 2 tens and 5 ones" */
export function sayMats(m: Mats): string {
  const parts: string[] = [];
  if (m.hundreds) parts.push(`${m.hundreds} hundred`);
  if (m.tens || m.hundreds) parts.push(`${m.tens} ${m.tens === 1 ? "ten" : "tens"}`);
  parts.push(`${m.ones} ${m.ones === 1 ? "one" : "ones"}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0];
}

/** The mats for a number, bundled properly. */
export const matsFor = (n: number): Mats => ({ hundreds: Math.floor(n / 100), tens: Math.floor((n % 100) / 10), ones: n % 10 });

/** "What number is this?" choices: the answer, the digits swapped, and one ten off. */
export function readChoices(n: number, r: () => number = Math.random): number[] {
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  const h = n - (n % 100);
  const swapped = h + o * 10 + t;
  const off = n + (r() < 0.5 && t > 1 ? -10 : 10);
  const wrong = [...new Set([swapped, off, n + 1, n - 1])].filter((x) => x !== n && x > 0);
  const choices = [n, ...wrong.slice(0, 2)];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return choices;
}

/** From level 1, every third round shows the mats and asks which number they make. */
export const isReadRound = (solved: number) => solved >= 3 && solved % 3 === 2;
