import { describe, expect, it } from "vitest";
import { BOOKS } from "./books";
import { CBSE_BOOKS } from "./cbse-stories";

describe("CBSE stories and poems", () => {
  it("has unique ids that do not clash with the other books", () => {
    const ids = BOOKS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("sits on a class shelf, with a credit and a spine label that fits", () => {
    for (const b of CBSE_BOOKS) {
      expect(["Class 1", "Class 2", "Class 3"]).toContain(b.shelf);
      expect(b.kind === "story" || b.kind === "poem").toBe(true);
      expect(b.credit?.length).toBeGreaterThan(0);
      expect((b.short ?? b.title).length).toBeLessThanOrEqual(14);
    }
  });

  it("has every class covered by both a story and a poem", () => {
    for (const shelf of ["Class 1", "Class 2", "Class 3"]) {
      const kinds = new Set(CBSE_BOOKS.filter((b) => b.shelf === shelf).map((b) => b.kind));
      expect(kinds, shelf).toEqual(new Set(["story", "poem"]));
    }
  });

  it("has pages a small child can read and see", () => {
    for (const b of CBSE_BOOKS) {
      const body = b.pages.filter((p) => p.scene);
      expect(body.length, b.id).toBeGreaterThanOrEqual(3);
      expect(b.pages[b.pages.length - 1].big).toBe("The End");
      for (const p of body) {
        expect(p.text, p.id).toBeTruthy();
        expect(p.say).toBe(p.text);
        expect(p.text!.length, p.id).toBeLessThanOrEqual(b.kind === "poem" ? 92 : 72);
        if (b.kind === "poem") expect(p.text!.split("\n").length, p.id).toBe(2);
        expect(p.scene!.items.length, p.id).toBeGreaterThan(0);
        for (const it of p.scene!.items) {
          expect(it.emoji, p.id).toBeTruthy();
          expect(it.x).toBeGreaterThanOrEqual(0);
          expect(it.x).toBeLessThanOrEqual(100);
          expect(it.y).toBeGreaterThanOrEqual(0);
          expect(it.y).toBeLessThanOrEqual(100);
          expect(it.size).toBeGreaterThan(0);
        }
      }
    }
  });
});
