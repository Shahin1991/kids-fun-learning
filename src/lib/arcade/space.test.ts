import { describe, expect, it } from "vitest";
import { H, newSpace, stepSpace, W, WAVES_PER_LEVEL, type SpaceInput } from "./space";

const idle: SpaceInput = { up: false, down: false, left: false, right: false, fire: false, missile: false };
const r = () => 0.99;

describe("space impact", () => {
  it("keeps the ship on screen", () => {
    const s = newSpace();
    for (let i = 0; i < 300; i++) stepSpace(s, { ...idle, up: true, left: true }, 1 / 60, r);
    expect(s.player.y).toBeGreaterThanOrEqual(0);
    expect(s.player.x).toBeGreaterThanOrEqual(0);
    for (let i = 0; i < 600; i++) stepSpace(s, { ...idle, down: true, right: true }, 1 / 60, r);
    expect(s.player.y).toBeLessThanOrEqual(H);
    expect(s.player.x).toBeLessThanOrEqual(W);
  });

  it("a bullet destroys a drone and scores", () => {
    const s = newSpace();
    s.spawnIn = 99;
    s.enemies.push({ kind: "drone", x: 60, y: s.player.y, baseY: s.player.y, w: 8, h: 7, hp: 1, age: 0, fire: 9 });
    const events: string[] = [];
    for (let i = 0; i < 90; i++) events.push(...stepSpace(s, { ...idle, fire: true }, 1 / 60, r));
    expect(events).toContain("kill");
    expect(s.score).toBeGreaterThanOrEqual(10);
  });

  it("an enemy bullet costs a life, then the ship is briefly invulnerable", () => {
    const s = newSpace();
    s.spawnIn = 99;
    s.enemyBullets.push({ x: s.player.x + 4, y: s.player.y + 2, w: 3, h: 2, vx: -10, vy: 0, dmg: 1 });
    stepSpace(s, idle, 1 / 60, r);
    expect(s.lives).toBe(2);
    s.enemyBullets.push({ x: s.player.x + 4, y: s.player.y + 2, w: 3, h: 2, vx: -10, vy: 0, dmg: 1 });
    stepSpace(s, idle, 1 / 60, r);
    expect(s.lives).toBe(2);
  });

  it("ends the game at zero lives", () => {
    const s = newSpace();
    s.lives = 1;
    s.spawnIn = 99;
    s.enemyBullets.push({ x: s.player.x + 4, y: s.player.y + 2, w: 3, h: 2, vx: -10, vy: 0, dmg: 1 });
    const ev = stepSpace(s, idle, 1 / 60, r);
    expect(ev).toContain("over");
    expect(s.status).toBe("over");
  });

  it("missiles are limited and hit hard", () => {
    const s = newSpace();
    s.spawnIn = 99;
    for (let i = 0; i < 6; i++) stepSpace(s, { ...idle, missile: true }, 1 / 60, r);
    expect(s.missiles).toBe(0);
  });

  it("a boss arrives after the waves and defeating it starts the next level", () => {
    const s = newSpace();
    s.waves = WAVES_PER_LEVEL;
    s.spawnIn = 0;
    const ev = stepSpace(s, idle, 1 / 60, r);
    expect(ev).toContain("boss");
    expect(s.boss).not.toBeNull();
    s.boss!.hp = 0;
    const ev2 = stepSpace(s, idle, 1 / 60, r);
    expect(ev2).toContain("bossdown");
    expect(s.level).toBe(2);
    expect(s.boss).toBeNull();
  });
});
