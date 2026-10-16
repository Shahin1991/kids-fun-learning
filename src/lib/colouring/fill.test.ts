import { describe, expect, it } from "vitest";
import { emptyFill, fillRegion, undoFill } from "./fill";
import { PAGES } from "./pages";

describe("colouring", () => {
  it("fills and undoes in order", () => {
    let s = emptyFill();
    s = fillRegion(s, "roof", "red");
    s = fillRegion(s, "roof", "blue");
    s = fillRegion(s, "door", "green");
    expect(s.fills).toEqual({ roof: "blue", door: "green" });
    s = undoFill(s);
    expect(s.fills).toEqual({ roof: "blue" });
    s = undoFill(undoFill(s));
    expect(s.fills).toEqual({});
    expect(undoFill(s)).toBe(s);
  });

  it("refilling with the same colour is not an extra undo step", () => {
    const s = fillRegion(emptyFill(), "a", "red");
    expect(fillRegion(s, "a", "red")).toBe(s);
  });

  it("every page has unique region ids", () => {
    PAGES.forEach((p) => expect(new Set(p.regions.map((r) => r.id)).size).toBe(p.regions.length));
  });
});
