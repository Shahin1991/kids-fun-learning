import { describe, expect, it } from "vitest";
import { LAB_GROUPS, LAB_LESSONS } from "@/data/science-lab";
import { litFraction, litPath, phaseName } from "./moon";
import { stepMs } from "./timing";

describe("lab lessons", () => {
  it("has unique ids and at least two steps each", () => {
    expect(new Set(LAB_LESSONS.map((l) => l.id)).size).toBe(LAB_LESSONS.length);
    for (const l of LAB_LESSONS) expect(l.steps.length).toBeGreaterThanOrEqual(2);
  });
  it("puts every lesson in a known picker group", () => {
    for (const l of LAB_LESSONS) if (l.group) expect(LAB_GROUPS).toContain(l.group);
  });
});

describe("moon phases", () => {
  it("lights none at new moon, half at quarter, all at full", () => {
    expect(litFraction(0)).toBeCloseTo(0);
    expect(litFraction(90)).toBeCloseTo(0.5);
    expect(litFraction(180)).toBeCloseTo(1);
    expect(litFraction(270)).toBeCloseTo(0.5);
  });
  it("draws nothing at new moon and a straight edge at a quarter", () => {
    expect(litPath(0, 40)).toBe("");
    expect(litPath(90, 40)).toContain("A0.00,40");
  });
});

describe("phase names", () => {
  it("names the main phases, waxing and waning alike", () => {
    expect(phaseName(0)).toBe("New moon");
    expect(phaseName(360)).toBe("New moon");
    expect(phaseName(50)).toBe("Crescent");
    expect(phaseName(310)).toBe("Crescent");
    expect(phaseName(90)).toBe("Half moon");
    expect(phaseName(270)).toBe("Half moon");
    expect(phaseName(180)).toBe("Full moon");
    expect(phaseName(-90)).toBe("Half moon");
  });
});

describe("auto-play timing", () => {
  it("gives short captions a floor and long ones more time", () => {
    expect(stepMs("Hello there")).toBe(6000);
    const long = LAB_LESSONS.flatMap((l) => l.steps).reduce((a, b) => (b.say.length > a.say.length ? b : a));
    expect(stepMs(long.say)).toBeGreaterThan(10000);
  });
});
