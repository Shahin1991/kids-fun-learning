import { describe, expect, it } from "vitest";
import { isSolid, LEVELS, newBounce, ringsLeft, stepBounce, type BounceInput } from "./bounce";

const idle: BounceInput = { left: false, right: false, jump: false };

function run(s: ReturnType<typeof newBounce>, input: BounceInput, seconds: number) {
  const ev: string[] = [];
  for (let t = 0; t < seconds; t += 1 / 60) ev.push(...stepBounce(s, input, 1 / 60));
  return ev;
}

describe("levels", () => {
  it("are rectangular with one start, one exit and some rings", () => {
    for (const rows of LEVELS) {
      expect(rows).toHaveLength(10);
      for (const r of rows) expect(r).toHaveLength(rows[0].length);
      const flat = rows.join("");
      expect([...flat].filter((c) => c === "S")).toHaveLength(1);
      expect([...flat].filter((c) => c === "E")).toHaveLength(1);
      expect([...flat].filter((c) => c === "o").length).toBeGreaterThan(3);
    }
  });
  it("start on solid ground", () => {
    for (let i = 0; i < LEVELS.length; i++) {
      const s = newBounce(i);
      expect(isSolid(s, Math.floor(s.start.x), Math.floor(s.start.y) + 1)).toBe(true);
    }
  });
});

describe("physics", () => {
  it("keeps bouncing on the floor without sinking through it", () => {
    const s = newBounce(0);
    run(s, idle, 4);
    expect(s.ball.y).toBeLessThan(9);
    expect(s.status).toBe("playing");
  });
  it("a queued jump bounces higher than a normal bounce", () => {
    const a = newBounce(0);
    const b = newBounce(0);
    run(a, idle, 1);
    run(b, idle, 1);
    let minA = 99;
    let minB = 99;
    for (let t = 0; t < 1.2; t += 1 / 60) {
      stepBounce(a, idle, 1 / 60);
      stepBounce(b, { ...idle, jump: t < 0.4 }, 1 / 60);
      minA = Math.min(minA, a.ball.y);
      minB = Math.min(minB, b.ball.y);
    }
    expect(minB).toBeLessThan(minA);
  });
  it("collects a ring and scores", () => {
    const s = newBounce(0);
    const before = ringsLeft(s);
    s.ball.x = 11.5;
    s.ball.y = 8.2;
    const ev = run(s, idle, 0.2);
    expect(ev).toContain("ring");
    expect(ringsLeft(s)).toBe(before - 1);
    expect(s.score).toBe(10);
  });
  it("loses a life on a spike and respawns", () => {
    const s = newBounce(0);
    s.ball.x = 20.5;
    s.ball.y = 8.4;
    const ev = run(s, idle, 0.3);
    expect(ev).toContain("die");
    expect(s.lives).toBe(2);
    expect(s.ball.x).toBeCloseTo(s.start.x, 0);
  });
  it("the exit only works once every ring is collected", () => {
    const s = newBounce(0);
    s.ball.x = 34.5;
    s.ball.y = 8.4;
    run(s, idle, 0.3);
    expect(s.status).toBe("playing");
    for (let r = 0; r < 10; r++) [...s.map[r]].forEach((ch, c) => ch === "o" && s.collected.add(`${c},${r}`));
    s.ball.x = 34.5;
    s.ball.y = 8.4;
    const ev = run(s, idle, 0.3);
    expect(ev).toContain("complete");
  });
});
