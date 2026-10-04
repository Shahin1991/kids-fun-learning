import { describe, expect, it } from "vitest";
import { FLAVORS, makeOrder, rng, scoreCake } from "./recipe";
import { newlyUnlocked, unlockedFor } from "./unlocks";

describe("orders", () => {
  it("start with only a flavour and grow gradually", () => {
    const r = rng(7);
    const first = makeOrder(0, ["star"], r);
    expect(first.tiers).toBeUndefined();
    expect(first.frosting).toBeUndefined();
    expect(first.toppings).toHaveLength(0);
    const later = makeOrder(12, ["star", "cherry", "candle", "strawberry"], rng(3));
    expect(later.tiers).toBeDefined();
    expect(later.frosting).toBeDefined();
    expect(later.toppings.length).toBeGreaterThan(0);
    expect(later.toppings.length).toBeLessThanOrEqual(3);
    expect(new Set(later.toppings).size).toBe(later.toppings.length);
  });
  it("only asks for unlocked toppings", () => {
    for (let s = 0; s < 20; s++) {
      const o = makeOrder(15, ["star"], rng(s + 1));
      expect(o.toppings.every((t) => t === "star")).toBe(true);
    }
  });
});

describe("scoring", () => {
  const order = { customer: { name: "Mia", skin: "", outfit: "", hair: "" }, flavor: "vanilla", tiers: 2, frosting: "pink", toppings: ["star"] };
  it("gives three stars for a full match", () => {
    expect(scoreCake(order, { flavor: "vanilla", tiers: 2, frosting: "pink", toppings: ["star", "cherry"] }).stars).toBe(3);
  });
  it("gives two stars for half matched and never less than one", () => {
    expect(scoreCake(order, { flavor: "vanilla", tiers: 2, frosting: null, toppings: [] }).stars).toBe(2);
    expect(scoreCake(order, { flavor: "mint", tiers: 1, frosting: null, toppings: [] }).stars).toBe(1);
  });
  it("free bake always earns three stars", () => {
    expect(scoreCake(null, { flavor: FLAVORS[0].id, tiers: 1, frosting: null, toppings: [] }).stars).toBe(3);
  });
  it("pays more coins for better and fancier cakes", () => {
    const plain = scoreCake(order, { flavor: "mint", tiers: 1, frosting: null, toppings: [] });
    const fancy = scoreCake(order, { flavor: "vanilla", tiers: 2, frosting: "pink", toppings: ["star", "cherry"] });
    expect(fancy.coins).toBeGreaterThan(plain.coins);
  });
});

describe("unlocks", () => {
  it("starts with starter items and adds gifts by coins", () => {
    expect(unlockedFor(0).toppings).not.toContain("flower");
    expect(unlockedFor(12).toppings).toContain("flower");
    expect(unlockedFor(40).pipes).toContain("star");
  });
  it("reports gifts crossed in one step", () => {
    expect(newlyUnlocked(10, 30).map((u) => u.id)).toEqual(["flower", "yellow"]);
    expect(newlyUnlocked(30, 30)).toEqual([]);
  });
});
