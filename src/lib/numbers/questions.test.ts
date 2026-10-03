import { describe, expect, it } from "vitest";
import { generateQuestion, rangeForLevel } from "./questions";

describe("generateQuestion", () => {
  it("starts tiny: two choices within 1-3", () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion(0);
      expect(q.choices).toHaveLength(2);
      expect(q.answer).toBeGreaterThanOrEqual(1);
      expect(q.answer).toBeLessThanOrEqual(3);
      expect(q.choices).toContain(q.answer);
    }
  });

  it("caps the range at 10 and choices at 4", () => {
    expect(rangeForLevel(50)).toEqual({ max: 10, choices: 4 });
  });

  it("always includes the right answer with unique choices", () => {
    for (let level = 0; level < 8; level++) {
      const q = generateQuestion(level);
      expect(new Set(q.choices).size).toBe(q.choices.length);
      expect(q.choices).toContain(q.answer);
    }
  });
});
