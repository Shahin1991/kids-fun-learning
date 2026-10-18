import type { Country } from "./world";

/** Well-known countries with shapes children can learn first (ISO numbers, as keyed in the map). */
export const FAMOUS = [
  "380", "036", "152", "356", "076", "840", "124", "643", "156", "392", "826", "250", "818", "484", "032", "710", "724", "450", "554", "578",
  "682", "360", "792", "276", "404", "604", "352", "192", "300", "706", "704", "608", "752", "804", "566", "620", "764", "496", "398",
];

/** Smaller countries would be only a dot on screen, so the quiz leaves them out. */
const MIN_AREA = 20_000;

const STAGES = [
  { pool: "famous", choices: 2, sameContinent: false },
  { pool: "big", choices: 3, sameContinent: false },
  { pool: "all", choices: 4, sameContinent: true },
] as const;

export function shapeStage(streak: number) {
  return STAGES[streak < 5 ? 0 : streak < 12 ? 1 : 2];
}

export const quizzable = (countries: Country[]) => countries.filter((c) => c.info.un && c.info.area >= MIN_AREA);

export interface ShapeRound {
  answer: Country;
  choices: Country[];
}

/**
 * Which country has this shape? Starts with famous shapes and two choices from other continents, then grows to four
 * choices from the same continent, where shapes and names are easier to mix up. `recent` keys are not asked again.
 */
export function shapeRound(streak: number, countries: Country[], recent: ReadonlySet<string> = new Set(), rand: () => number = Math.random): ShapeRound {
  const stage = shapeStage(streak);
  const all = quizzable(countries);
  const famous = new Set(FAMOUS);
  const pool = all.filter((c) => (stage.pool === "famous" ? famous.has(c.key) : stage.pool === "big" ? famous.has(c.key) || c.info.area >= 250_000 : true));
  const fresh = pool.filter((c) => !recent.has(c.key));
  const from = fresh.length ? fresh : pool;
  const answer = from[Math.floor(rand() * from.length)];
  const others = all.filter((c) => c.key !== answer.key);
  const near = others.filter((c) => c.info.continent === answer.info.continent);
  const far = others.filter((c) => c.info.continent !== answer.info.continent);
  const preferred = stage.sameContinent ? near : far;
  const rest = stage.sameContinent ? far : near;
  const ranked = [...preferred.map((c) => ({ c, k: rand() })), ...rest.map((c) => ({ c, k: 1 + rand() }))].sort((a, b) => a.k - b.k).map((x) => x.c);
  const choices = [answer, ...ranked.slice(0, stage.choices - 1)].sort(() => rand() - 0.5);
  return { answer, choices };
}
