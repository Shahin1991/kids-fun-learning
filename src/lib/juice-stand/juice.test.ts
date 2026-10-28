import { describe, expect, it } from "vitest";
import { rng } from "@/lib/cake-bakery/recipe";
import { total } from "@/lib/coin-shop/money";
import { addFruit, coinsFor, fruitCount, fruitsFor, isComplete, juiceColor, makeOrder, orderText, priceOf, type Blender } from "./juice";

describe("juice stand orders", () => {
  it("starts with one fruit, then two kinds, then counting, never more than four fruits", () => {
    const r = rng(3);
    for (let served = 0; served < 40; served++) {
      for (let k = 0; k < 20; k++) {
        const order = makeOrder(served, r);
        const offered = fruitsFor(served).map((f) => f.id);
        expect(order.every((l) => offered.includes(l.fruit))).toBe(true);
        expect(new Set(order.map((l) => l.fruit)).size).toBe(order.length);
        expect(fruitCount(order)).toBeLessThanOrEqual(4);
        if (served < 2) expect(order).toEqual([{ fruit: order[0].fruit, count: 1 }]);
        else if (served < 5) expect(order.map((l) => l.count)).toEqual([1, 1]);
      }
    }
  });

  it("reads the order aloud naturally", () => {
    expect(orderText([{ fruit: "strawberry", count: 1 }])).toBe("A strawberry juice, please!");
    expect(orderText([{ fruit: "orange", count: 1 }])).toBe("An orange juice, please!");
    expect(orderText([{ fruit: "strawberry", count: 1 }, { fruit: "banana", count: 1 }])).toBe("Strawberry and banana juice, please!");
    expect(orderText([{ fruit: "banana", count: 2 }, { fruit: "kiwi", count: 1 }])).toBe("Two bananas and one kiwi in my juice, please!");
  });

  it("only takes the fruit that was ordered, as many as were ordered", () => {
    const order = [{ fruit: "banana", count: 2 }, { fruit: "kiwi", count: 1 }];
    let b: Blender = {};
    expect(addFruit(order, b, "mango").result).toBe("not-wanted");
    ({ blender: b } = addFruit(order, b, "kiwi"));
    expect(addFruit(order, b, "kiwi").result).toBe("enough");
    ({ blender: b } = addFruit(order, b, "banana"));
    const last = addFruit(order, b, "banana");
    expect(last.result).toBe("complete");
    expect(isComplete(order, last.blender)).toBe(true);
  });

  it("mixes the juice colour by how much of each fruit went in", () => {
    expect(juiceColor({ strawberry: 1 })).toBe("#e8364f");
    expect(juiceColor({})).toBe("#ffffff");
    const mixed = juiceColor({ strawberry: 1, banana: 1 });
    expect(mixed).toMatch(/^#[0-9a-f]{6}$/);
    expect(mixed).not.toBe(juiceColor({ strawberry: 3, banana: 1 }));
  });

  it("customers can always pay the exact price in coins", () => {
    for (const cur of ["USD", "GBP", "AED"] as const) {
      for (let n = 1; n <= 4; n++) {
        const price = priceOf(cur, [{ fruit: "banana", count: n }]);
        const coins = coinsFor(cur, price);
        expect(total(coins.map((c) => c.value)), `${cur} ${n}`).toBe(price);
        expect(coins.length).toBeLessThanOrEqual(4);
      }
    }
  });
});
