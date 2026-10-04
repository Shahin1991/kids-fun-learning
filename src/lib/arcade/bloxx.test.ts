import { describe, expect, it } from "vitest";
import { BW, drop, hookX, newBloxx, update } from "./bloxx";

function dropAt(s: ReturnType<typeof newBloxx>, x: number) {
  s.phase = Math.asin((x - 60) / s.amp);
  drop(s);
  let ev = null as ReturnType<typeof update>;
  for (let i = 0; i < 600 && s.falling; i++) ev = update(s, 1 / 60) ?? ev;
  return ev;
}

describe("city bloxx", () => {
  it("lands a block on the foundation and scores", () => {
    const s = newBloxx();
    expect(dropAt(s, 60)).toBe("perfect");
    expect(s.tower).toHaveLength(1);
    expect(s.score).toBeGreaterThan(1);
  });
  it("loses a life when far off", () => {
    const s = newBloxx();
    const x = hookX({ ...s, phase: Math.PI / 2 });
    expect(Math.abs(x - 60)).toBeGreaterThan(BW * 0.6);
    s.phase = Math.PI / 2;
    drop(s);
    for (let i = 0; i < 600 && s.falling; i++) update(s, 1 / 60);
    expect(s.lives).toBe(2);
    expect(s.tower).toHaveLength(0);
  });
  it("ends after three misses", () => {
    const s = newBloxx();
    for (let i = 0; i < 3; i++) {
      s.phase = Math.PI / 2;
      drop(s);
      for (let j = 0; j < 600 && s.falling; j++) update(s, 1 / 60);
    }
    expect(s.over).toBe(true);
  });
  it("ignores a second drop while one is falling", () => {
    const s = newBloxx();
    expect(drop(s)).toBe(true);
    expect(drop(s)).toBe(false);
  });
});
