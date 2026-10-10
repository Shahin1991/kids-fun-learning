import { describe, expect, it } from "vitest";
import { clampHumans, is, seatLabel } from "./seats";

describe("seats", () => {
  it("one person is 'You', then robots", () => {
    expect(seatLabel(0, 1)).toMatchObject({ name: "You", human: true, you: true });
    expect(seatLabel(1, 1)).toMatchObject({ name: "Robo", human: false });
    expect(seatLabel(3, 1).name).toBe("Unicorn");
  });
  it("two people are Player 1 and Player 2, robots after them", () => {
    expect(seatLabel(0, 2).name).toBe("Player 1");
    expect(seatLabel(1, 2)).toMatchObject({ name: "Player 2", human: true, you: false });
    expect(seatLabel(2, 2).name).toBe("Robo");
    expect(new Set([0, 1].map((s) => seatLabel(s, 2).emoji)).size).toBe(2);
  });
  it("verbs and clamping", () => {
    expect(is(seatLabel(0, 1))).toBe("are");
    expect(is(seatLabel(1, 2))).toBe("is");
    expect(clampHumans(2, 2)).toBe(2);
    expect(clampHumans(2, 1)).toBe(1);
    expect(clampHumans(0, 4)).toBe(1);
    expect(clampHumans(9, 4)).toBe(2);
  });
});
