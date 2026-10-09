import { describe, expect, it } from "vitest";
import { END, LADDERS, moveFrom, SNAKES, squareCell } from "./snakes-ladders";

describe("snakes and ladders", () => {
  it("ladders go up, snakes go down, and nothing chains", () => {
    for (const [a, b] of Object.entries(LADDERS)) {
      expect(b).toBeGreaterThan(Number(a));
      expect(SNAKES[b]).toBeUndefined();
      expect(LADDERS[b]).toBeUndefined();
    }
    for (const [a, b] of Object.entries(SNAKES)) {
      expect(b).toBeLessThan(Number(a));
      expect(SNAKES[b]).toBeUndefined();
      expect(LADDERS[b]).toBeUndefined();
    }
    expect(Object.keys(SNAKES).some((k) => LADDERS[Number(k)] !== undefined)).toBe(false);
  });
  it("hops square by square and takes a ladder", () => {
    const m = moveFrom(1, 3);
    expect(m.path).toEqual([2, 3, 4]);
    expect(m.jump).toEqual({ from: 4, to: 14, kind: "ladder" });
    expect(m.final).toBe(14);
  });
  it("snake slides down", () => {
    expect(moveFrom(12, 5).final).toBe(7);
  });
  it("bounces back past 100", () => {
    const m = moveFrom(98, 4);
    expect(m.path).toEqual([99, 100, 99, 98]);
    expect(m.final).toBe(98);
    expect(moveFrom(97, 3).won).toBe(true);
    expect(moveFrom(97, 3).final).toBe(END);
  });
  it("maps squares to a snaking grid", () => {
    expect(squareCell(1)).toEqual({ col: 0, row: 0 });
    expect(squareCell(10)).toEqual({ col: 9, row: 0 });
    expect(squareCell(11)).toEqual({ col: 9, row: 1 });
    expect(squareCell(100)).toEqual({ col: 0, row: 9 });
  });
});
