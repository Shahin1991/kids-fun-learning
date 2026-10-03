import { describe, expect, it } from "vitest";
import { generateRacerQuestion, levelFor } from "./racer-questions";

describe("generateRacerQuestion", () => {
  it("levels up every 3 correct and caps at 4", () => {
    expect(levelFor(0)).toBe(0);
    expect(levelFor(3)).toBe(1);
    expect(levelFor(99)).toBe(4);
  });
  it("always includes the answer among unique, non-negative choices", () => {
    for (let c = 0; c < 15; c++) {
      for (let i = 0; i < 20; i++) {
        const q = generateRacerQuestion(c);
        expect(q.choices).toContain(q.answer);
        expect(new Set(q.choices).size).toBe(q.choices.length);
        expect(Math.min(...q.choices)).toBeGreaterThanOrEqual(0);
      }
    }
  });
  it("starts with sums up to 10", () => {
    for (let i = 0; i < 30; i++) expect(generateRacerQuestion(0).answer).toBeLessThanOrEqual(10);
  });
});
