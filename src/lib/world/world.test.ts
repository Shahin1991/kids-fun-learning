import { describe, expect, it } from "vitest";
import type { Topology } from "topojson-specification";
import detail from "world-atlas/countries-50m.json";
import coarse from "world-atlas/countries-110m.json";
import { rng } from "@/lib/apex-highway/scenery";
import { FAMOUS, quizzable, shapeRound, shapeStage } from "./quiz";
import { buildWorld, countryAt } from "./world";

const world = buildWorld(detail as unknown as Topology, coarse as unknown as Topology);

describe("world map", () => {
  it("has a name and continent for every shape, and every UN member", () => {
    world.countries.forEach((c) => {
      expect(c.info?.name, c.key).toBeTruthy();
      expect(c.info.continent, c.key).toBeTruthy();
    });
    expect(world.countries.filter((c) => c.info.un)).toHaveLength(193);
  });

  it("finds the country under a point", () => {
    expect(countryAt(world, [2.35, 48.86])?.info.name).toBe("France"); // Paris
    expect(countryAt(world, [36.82, -1.29])?.info.name).toBe("Kenya"); // Nairobi
    expect(countryAt(world, [-58.38, -34.6])?.info.name).toBe("Argentina"); // Buenos Aires
    expect(countryAt(world, [139.69, 35.68])?.info.name).toBe("Japan"); // Tokyo
    expect(countryAt(world, [-30, 30])).toBeNull(); // Atlantic Ocean
  });

  it("keeps the mainland and close islands, not far-flung territories", () => {
    const france = world.byKey.get("250")!;
    expect(countryAt({ ...world, countries: [{ ...france, shape: france.mainland }] }, [9.1, 42.1])).not.toBeNull(); // Corsica stays
    expect(countryAt({ ...world, countries: [{ ...france, shape: france.mainland }] }, [-53.1, 3.9])).toBeNull(); // French Guiana goes
    const only = (c: typeof france) => ({ ...world, countries: [{ ...c, shape: c.mainland }] });
    const indonesia = world.byKey.get("360")!;
    expect(countryAt(only(indonesia), [98.67, 3.6])).not.toBeNull(); // Sumatra stays (an archipelago is kept whole)
    expect(countryAt(only(indonesia), [140.7, -2.53])).not.toBeNull(); // Papua stays
    const japan = world.byKey.get("392")!;
    expect(countryAt(only(japan), [141.35, 43.06])).not.toBeNull(); // Hokkaido stays
    const usa = world.byKey.get("840")!;
    expect(usa.centre[0]).toBeGreaterThan(-110); // centred on the lower 48, not pulled west by Alaska and Hawaii
    expect(usa.centre[0]).toBeLessThan(-90);
    expect(countryAt(only(usa), [-134.42, 58.3])).toBeNull(); // Alaska goes
    expect(countryAt(only(usa), [-157.86, 21.31])).toBeNull(); // Hawaii goes
  });

  it("joins Somaliland to Somalia, so borders and the quiz shape match the UN map", () => {
    expect(countryAt(world, [44.06, 9.56])?.info.name).toBe("Somalia"); // Hargeisa
  });
});

describe("shape quiz", () => {
  it("asks famous shapes first, with unique choices and the answer among them", () => {
    const r = rng(5);
    for (let streak = 0; streak < 30; streak++) {
      const q = shapeRound(streak, world.countries, new Set(), r);
      expect(q.choices).toContain(q.answer);
      expect(new Set(q.choices.map((c) => c.key)).size).toBe(shapeStage(streak).choices);
      q.choices.forEach((c) => expect(c.info.un).toBe(true));
      if (streak < 5) expect(FAMOUS).toContain(q.answer.key);
    }
  });

  it("uses other continents early and the same continent later", () => {
    const r = rng(9);
    const early = shapeRound(0, world.countries, new Set(), r);
    early.choices.filter((c) => c !== early.answer).forEach((c) => expect(c.info.continent).not.toBe(early.answer.info.continent));
    const late = shapeRound(20, world.countries, new Set(), r);
    expect(late.choices.filter((c) => c.info.continent === late.answer.info.continent).length).toBeGreaterThan(1);
  });

  it("does not repeat recent countries", () => {
    const recent = new Set(FAMOUS.slice(0, -1));
    expect(shapeRound(0, world.countries, recent).answer.key).toBe(FAMOUS.at(-1));
    expect(quizzable(world.countries).length).toBeGreaterThan(140);
  });
});
