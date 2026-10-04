// Nokia-style Space Impact: a side-scrolling shooter. Coordinates are LCD pixels (160 x 96).

export const W = 160;
export const H = 96;

export type EnemyKind = "drone" | "fighter" | "zig";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Bullet extends Box {
  vx: number;
  vy: number;
  dmg: number;
}
export interface Enemy extends Box {
  kind: EnemyKind;
  hp: number;
  baseY: number;
  age: number;
  fire: number;
}
export interface Boss extends Box {
  hp: number;
  maxHp: number;
  age: number;
  fire: number;
  baseY: number;
}
export interface Pickup extends Box {
  kind: "life" | "missile";
}

export interface SpaceInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
  /** true on the frame the missile button is pressed */
  missile: boolean;
}

export type SpaceEvent = "shoot" | "missile" | "kill" | "hit" | "pickup" | "boss" | "bossdown" | "over";

export interface SpaceState {
  t: number;
  level: number;
  score: number;
  lives: number;
  missiles: number;
  player: Box & { cooldown: number; invuln: number };
  bullets: Bullet[];
  enemyBullets: Bullet[];
  enemies: Enemy[];
  pickups: Pickup[];
  boss: Boss | null;
  /** waves spawned so far on this level */
  waves: number;
  spawnIn: number;
  status: "playing" | "over";
}

export const WAVES_PER_LEVEL = 7;

export function newSpace(): SpaceState {
  return {
    t: 0, level: 1, score: 0, lives: 3, missiles: 3,
    player: { x: 6, y: H / 2 - 3, w: 12, h: 7, cooldown: 0, invuln: 0 },
    bullets: [], enemyBullets: [], enemies: [], pickups: [], boss: null,
    waves: 0, spawnIn: 1.2, status: "playing",
  };
}

const overlap = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function enemy(kind: EnemyKind, x: number, y: number): Enemy {
  const hp = kind === "fighter" ? 2 : 1;
  const [w, h] = kind === "fighter" ? [10, 8] : kind === "zig" ? [8, 8] : [8, 7];
  return { kind, x, y, baseY: y, w, h, hp, age: 0, fire: 1.2 + Math.random() };
}

/** One group of enemies entering from the right. */
function spawnWave(s: SpaceState, rand: () => number) {
  const kinds: EnemyKind[] = ["drone", "fighter", "zig"];
  const kind = kinds[Math.min(kinds.length - 1, Math.floor(rand() * (1 + Math.min(2, Math.floor(s.level / 1.5) + s.waves / 3))))];
  const count = 3 + Math.floor(rand() * 3);
  const y0 = 10 + rand() * (H - 40);
  for (let i = 0; i < count; i++) {
    const e = enemy(kind, W + 6 + i * 14, kind === "fighter" ? y0 + (i % 2) * 18 : y0);
    s.enemies.push(e);
  }
}

function hitPlayer(s: SpaceState, ev: SpaceEvent[]) {
  if (s.player.invuln > 0) return;
  s.lives -= 1;
  s.player.invuln = 1.6;
  ev.push("hit");
  if (s.lives <= 0) {
    s.status = "over";
    ev.push("over");
  }
}

export function stepSpace(s: SpaceState, input: SpaceInput, dt: number, rand: () => number = Math.random): SpaceEvent[] {
  const ev: SpaceEvent[] = [];
  if (s.status !== "playing") return ev;
  s.t += dt;
  const p = s.player;
  p.invuln = Math.max(0, p.invuln - dt);
  p.cooldown = Math.max(0, p.cooldown - dt);

  // Player movement
  const speed = 70;
  p.x += ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * speed * dt;
  p.y += ((input.down ? 1 : 0) - (input.up ? 1 : 0)) * speed * dt;
  p.x = Math.max(0, Math.min(W * 0.55, p.x));
  p.y = Math.max(0, Math.min(H - p.h, p.y));

  if (input.fire && p.cooldown === 0) {
    s.bullets.push({ x: p.x + p.w, y: p.y + p.h / 2 - 0.5, w: 4, h: 2, vx: 140, vy: 0, dmg: 1 });
    p.cooldown = 0.2;
    ev.push("shoot");
  }
  if (input.missile && s.missiles > 0) {
    s.missiles -= 1;
    s.bullets.push({ x: p.x + p.w, y: p.y + p.h / 2 - 2, w: 8, h: 4, vx: 110, vy: 0, dmg: 5 });
    ev.push("missile");
  }

  // Spawning
  if (!s.boss) {
    s.spawnIn -= dt;
    if (s.spawnIn <= 0) {
      if (s.waves < WAVES_PER_LEVEL) {
        spawnWave(s, rand);
        s.waves += 1;
        s.spawnIn = Math.max(1.2, 2.8 - s.level * 0.25);
      } else if (s.enemies.length === 0) {
        const maxHp = 24 + s.level * 10;
        s.boss = { x: W + 4, y: H / 2 - 12, w: 22, h: 24, hp: maxHp, maxHp, age: 0, fire: 1.5, baseY: H / 2 - 12 };
        ev.push("boss");
      }
    }
  }

  // Bullets
  for (const b of s.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
  s.bullets = s.bullets.filter((b) => b.x < W + 10);
  for (const b of s.enemyBullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
  s.enemyBullets = s.enemyBullets.filter((b) => b.x > -10 && b.y > -6 && b.y < H + 6);

  // Enemies
  const base = 28 + s.level * 4;
  for (const e of s.enemies) {
    e.age += dt;
    if (e.kind === "drone") {
      e.x -= base * dt;
      e.y = e.baseY + Math.sin(e.age * 3) * 14;
    } else if (e.kind === "zig") {
      e.x -= base * 1.5 * dt;
      e.y = e.baseY + (Math.abs(((e.age * 40) % 60) - 30) - 15);
    } else {
      e.x -= base * 0.8 * dt;
      e.fire -= dt;
      if (e.fire <= 0 && e.x < W - 10) {
        e.fire = 1.8;
        s.enemyBullets.push({ x: e.x - 3, y: e.y + e.h / 2, w: 3, h: 2, vx: -70, vy: 0, dmg: 1 });
      }
    }
    e.y = Math.max(0, Math.min(H - e.h, e.y));
  }
  s.enemies = s.enemies.filter((e) => e.x > -14);

  // Boss
  const boss = s.boss;
  if (boss) {
    boss.age += dt;
    if (boss.x > W - 34) boss.x -= 30 * dt;
    boss.y = boss.baseY + Math.sin(boss.age * 1.4) * 26;
    boss.fire -= dt;
    if (boss.fire <= 0 && boss.x <= W - 30) {
      boss.fire = Math.max(0.7, 1.4 - s.level * 0.1);
      for (const vy of [-22, 0, 22]) s.enemyBullets.push({ x: boss.x - 3, y: boss.y + boss.h / 2, w: 3, h: 3, vx: -60, vy, dmg: 1 });
    }
  }

  // Player bullets vs enemies and boss
  for (const b of s.bullets) {
    for (const e of s.enemies) {
      if (e.hp > 0 && b.dmg > 0 && overlap(b, e)) {
        e.hp -= b.dmg;
        if (b.dmg < 3) b.dmg = 0;
        if (e.hp <= 0) {
          s.score += e.kind === "fighter" ? 20 : 10;
          ev.push("kill");
          if (rand() < 0.1) s.pickups.push({ x: e.x, y: e.y, w: 7, h: 7, kind: rand() < 0.5 ? "life" : "missile" });
        }
      }
    }
    if (boss && b.dmg > 0 && overlap(b, boss)) {
      boss.hp -= b.dmg;
      b.dmg = 0;
    }
  }
  s.bullets = s.bullets.filter((b) => b.dmg > 0);
  s.enemies = s.enemies.filter((e) => e.hp > 0);
  if (boss && boss.hp <= 0) {
    s.score += 200 + s.level * 50;
    s.boss = null;
    s.level += 1;
    s.waves = 0;
    s.spawnIn = 2;
    s.enemyBullets = [];
    s.missiles = Math.min(5, s.missiles + 2);
    ev.push("bossdown");
  }

  // Pickups
  for (const k of s.pickups) k.x -= 22 * dt;
  s.pickups = s.pickups.filter((k) => {
    if (overlap(k, p)) {
      if (k.kind === "life") s.lives = Math.min(5, s.lives + 1);
      else s.missiles = Math.min(5, s.missiles + 2);
      ev.push("pickup");
      return false;
    }
    return k.x > -8;
  });

  // Things that hurt the player
  for (const e of s.enemies) {
    if (overlap(e, p)) {
      e.hp = 0;
      hitPlayer(s, ev);
    }
  }
  s.enemies = s.enemies.filter((e) => e.hp > 0);
  for (const b of s.enemyBullets) {
    if (overlap(b, p)) {
      b.x = -99;
      hitPlayer(s, ev);
    }
  }
  if (s.boss && overlap(s.boss, p)) hitPlayer(s, ev);
  return ev;
}
