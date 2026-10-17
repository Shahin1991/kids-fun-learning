import { describe, expect, it } from "vitest";
import { aimOff, arrowLanding, arrowScore, nextGust, rollWind, windDrift } from "./archery";
import { CARROM_TABLE, carromLayout, carromOutcome, COIN_R } from "./carrom";
import { aimSpread, BotPlanner, candidateShots, jitterShot, pocketOnLine } from "./cue-bot";
import { dartLanding, dartScore, robotDart, segmentAt, suggestedDartTarget, sumLine } from "./darts";
import { anyMoving, castDisc, simStep, simulateShot, speedForDistance, type Disc, type Table } from "./physics2d";
import { ballsOn, newSnooker, redRack, SNOOKER_TABLE, snookerOutcome, SPOTS } from "./snooker";
import { resultFor } from "./types";

const table: Table = { halfW: 2, halfH: 2, pockets: [], cushionE: 0.8, discE: 1, decel: 0.5, drag: 0, stopSpeed: 0.001 };
const disc = (id: number, x: number, y: number, vx = 0, vy = 0, m = 1): Disc => ({ id, x, y, vx, vy, r: 0.1, m, active: true });

describe("physics2d", () => {
  it("transfers all momentum in a head-on elastic hit of equal masses", () => {
    const discs = [disc(0, -1, 0, 2, 0), disc(1, 0, 0)];
    const ev = simStep(discs, { ...table, decel: 0 }, 0.6);
    expect(ev.hits).toHaveLength(1);
    expect(discs[0].vx).toBeCloseTo(0, 5);
    expect(discs[1].vx).toBeCloseTo(2, 5);
  });

  it("conserves momentum for unequal masses", () => {
    const discs = [disc(0, -1, 0.03, 3, 0, 2.7), disc(1, 0, 0)];
    simStep(discs, { ...table, decel: 0, discE: 0.9 }, 0.5);
    expect(discs[0].vx * 2.7 + discs[1].vx).toBeCloseTo(3 * 2.7, 5);
    expect(discs[0].vy * 2.7 + discs[1].vy).toBeCloseTo(0, 5);
  });

  it("does not tunnel through a disc at high speed", () => {
    const discs = [disc(0, -1.5, 0, 60, 0), disc(1, 0, 0)];
    const ev = simStep(discs, { ...table, decel: 0, cushionE: 0 }, 1 / 30);
    expect(ev.hits).toHaveLength(1);
  });

  it("bounces off cushions with restitution and comes to rest", () => {
    const discs = [disc(0, 1.5, 0, 3, 0)];
    const ev = simStep(discs, table, 0.5);
    expect(ev.cushions.length).toBeGreaterThan(0);
    expect(discs[0].vx).toBeLessThan(0);
    const { discs: end } = simulateShot([disc(0, 0, 0, 2, 1)], table);
    expect(anyMoving(end)).toBe(false);
  });

  it("drops a disc into a pocket", () => {
    const discs = [disc(0, 0, 0, 2, 2)];
    const ev = simStep(discs, { ...table, decel: 0, pockets: [{ x: 2, y: 2, r: 0.2 }] }, 2);
    expect(ev.pots).toEqual([{ a: 0, pocket: 0 }]);
    expect(discs[0].active).toBe(false);
  });

  it("speedForDistance makes a disc stop at the requested distance", () => {
    const t = { ...table, decel: 0.4, drag: 0.3, halfW: 50, halfH: 50 };
    const v = speedForDistance(t, 3);
    const { discs } = simulateShot([disc(0, 0, 0, v, 0)], t, 60, 1 / 240);
    expect(discs[0].x).toBeCloseTo(3, 1);
  });

  it("castDisc finds the first ball in the path and its departure direction", () => {
    const discs = [disc(0, 0, 0), disc(1, 1, 0.1), disc(2, 1.5, 0)];
    const hit = castDisc(discs, table, discs[0], 1, 0);
    expect(hit.disc).toBe(1);
    expect(hit.ny).toBeGreaterThan(0.4);
    const wall = castDisc(discs, table, discs[0], 0, 1);
    expect(wall.disc).toBeNull();
    expect(wall.dist).toBeCloseTo(1.9);
  });
});

describe("carrom", () => {
  it("lays out 7 or 19 non-overlapping coins", () => {
    for (const [v, n] of [["quick", 7], ["full", 19]] as const) {
      const coins = carromLayout(v);
      expect(coins).toHaveLength(n);
      expect(coins.filter((c) => c.kind === "queen")).toHaveLength(1);
      expect(coins.filter((c) => c.kind === "white").length).toBe(coins.filter((c) => c.kind === "black").length);
      for (let i = 0; i < coins.length; i++)
        for (let j = i + 1; j < coins.length; j++) expect(Math.hypot(coins[i].x - coins[j].x, coins[i].y - coins[j].y)).toBeGreaterThanOrEqual(COIN_R * 2);
    }
  });

  it("scores coins, grants another shot, and passes the turn on a striker pot", () => {
    const s = { scores: [0, 0], turn: 0, coinsLeft: 7 };
    const a = carromOutcome(s, ["white", "queen"], false);
    expect(a.scores).toEqual([70, 0]);
    expect(a.again).toBe(true);
    expect(a.turn).toBe(0);
    const b = carromOutcome(a, ["black"], true);
    expect(b.scores).toEqual([80, 0]);
    expect(b.turn).toBe(1);
    expect(b.foul).toBe(true);
    const c = carromOutcome({ ...b, coinsLeft: 1 }, ["white"], false);
    expect(c.over).toBe(true);
  });

  it("the robot planner finds a pot for an easy coin", () => {
    const discs: Disc[] = [
      { id: 0, x: 0, y: -2.7, vx: 0, vy: 0, r: 0.206, m: 2.7, active: true },
      { id: 1, x: 2.9, y: 2.9, vx: 0, vy: 0, r: COIN_R, m: 1, active: true },
    ];
    const cands = candidateShots({ discs, table: CARROM_TABLE, cueId: 0, targets: [1], starts: [{ x: 0, y: -2.7 }, { x: 2.3, y: -2.7 }], maxSpeed: 12 });
    const planner = new BotPlanner(discs, CARROM_TABLE, 0, cands, (_d, ev) => ev.pots.filter((p) => p.a === 1).length * 10 - ev.pots.filter((p) => p.a === 0).length * 20);
    let res = planner.work();
    while (!res) res = planner.work();
    expect(res.value).toBe(10);
  });
});

describe("snooker", () => {
  it("racks reds behind the pink without overlaps", () => {
    const reds = redRack(15);
    expect(reds).toHaveLength(15);
    expect(Math.min(...reds.map((r) => r.y))).toBeGreaterThan(SPOTS.pink.y);
    expect(Math.max(...reds.map((r) => r.y))).toBeLessThan(SPOTS.black.y);
  });

  it("goes red, colour, red and keeps the break going", () => {
    let s = newSnooker(2, 2);
    let o = snookerOutcome(s, { firstHit: "red", potted: ["red"] });
    expect(o.points).toBe(1);
    expect(o.keepTurn).toBe(true);
    s = o.state;
    expect(ballsOn(s)).toContain("black");
    o = snookerOutcome(s, { firstHit: "black", potted: ["black"] });
    expect(o.points).toBe(7);
    expect(o.respot).toEqual(["black"]);
    expect(o.state.brk).toBe(8);
    expect(o.state.target).toBe("red");
  });

  it("gives at least 4 to the opponent on a foul and keeps colours on the table", () => {
    const s = newSnooker(2, 6);
    const o = snookerOutcome(s, { firstHit: "pink", potted: ["pink"] });
    expect(o.foul).toBe(true);
    expect(o.state.scores).toEqual([0, 6]);
    expect(o.respot).toEqual(["pink"]);
    expect(o.state.turn).toBe(1);
    const miss = snookerOutcome(s, { firstHit: null, potted: [] });
    expect(miss.state.scores).toEqual([0, 4]);
    const inOff = snookerOutcome(s, { firstHit: "red", potted: ["red", "cue"] });
    expect(inOff.foul).toBe(true);
    expect(inOff.cueInHand).toBe(true);
    expect(inOff.state.redsLeft).toBe(5);
  });

  it("clears the colours in order after the last red and ends the frame", () => {
    let s = newSnooker(2, 1);
    s = snookerOutcome(s, { firstHit: "red", potted: ["red"] }).state;
    s = snookerOutcome(s, { firstHit: "blue", potted: ["blue"] }).state;
    expect(s.target).toBe("sequence");
    expect(ballsOn(s)).toEqual(["yellow"]);
    const wrong = snookerOutcome(s, { firstHit: "green", potted: [] });
    expect(wrong.foul).toBe(true);
    for (const c of ["yellow", "green", "brown", "blue", "pink", "black"] as const) s = snookerOutcome(s, { firstHit: c, potted: [c] }).state;
    expect(s.over).toBe(true);
    expect(s.scores[0]).toBe(1 + 5 + 27);
  });

  it("the table pockets catch a ball rolled into a corner", () => {
    const d: Disc = { id: 0, x: 0, y: 0, vx: 1.5, vy: 3, r: 0.034, m: 1, active: true };
    const angle = Math.atan2(SNOOKER_TABLE.halfH, SNOOKER_TABLE.halfW);
    d.vx = Math.cos(angle) * 3.5;
    d.vy = Math.sin(angle) * 3.5;
    const { events } = simulateShot([d], SNOOKER_TABLE);
    expect(events.pots).toHaveLength(1);
  });
});

describe("darts", () => {
  it("scores segments and rings", () => {
    expect(segmentAt(0, 0.05)).toBe(20);
    expect(segmentAt(0.05, 0)).toBe(6);
    expect(segmentAt(0, -0.05)).toBe(3);
    expect(segmentAt(-0.05, 0)).toBe(11);
    expect(dartScore(0, 0).points).toBe(50);
    expect(dartScore(0.01, 0).points).toBe(25);
    expect(dartScore(0, 0.103).points).toBe(60);
    expect(dartScore(0, 0.166).points).toBe(40);
    expect(dartScore(0, 0.05).points).toBe(20);
    expect(dartScore(0, 0.2).points).toBe(0);
    expect(sumLine([20, 5, 60])).toBe("20 + 5 + 60 = 85");
  });

  it("robot darts get tighter with level", () => {
    let seed = 1;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const spread = (lvl: "easy" | "hard") => {
      let s = 0;
      for (let i = 0; i < 300; i++) {
        const d = robotDart(lvl, rand);
        s += Math.hypot(d.x, d.y - (lvl === "hard" ? 0.103 : 0));
      }
      return s;
    };
    expect(spread("hard")).toBeLessThan(spread("easy"));
  });
});

describe("archery", () => {
  it("scores rings from 10 to 1", () => {
    expect(arrowScore(0, 0)).toMatchObject({ points: 10, inner: true });
    expect(arrowScore(0.05, 0).points).toBe(10);
    expect(arrowScore(0.07, 0).points).toBe(9);
    expect(arrowScore(0.6, 0).points).toBe(1);
    expect(arrowScore(0.62, 0).points).toBe(0);
    expect(windDrift(4)).toBeGreaterThan(0.1);
    expect(windDrift(0)).toBe(0);
  });
});

describe("aim uncertainty and help", () => {
  const seq = (vals: number[]) => {
    let i = 0;
    return () => vals[i++ % vals.length];
  };

  it("table shots stray more on harder levels and harder hits, never past 2 sd", () => {
    expect(aimSpread("hard", 1)).toBeGreaterThan(aimSpread("easy", 1));
    expect(aimSpread("medium", 1)).toBeGreaterThan(aimSpread("medium", 0.1));
    let worst = 0;
    for (let i = 0; i < 500; i++) {
      const j = jitterShot(1, 5, "hard", 1);
      worst = Math.max(worst, Math.abs(j.angle - 1));
      expect(j.speed).toBeGreaterThan(5 * 0.85);
    }
    expect(worst).toBeGreaterThan(0);
    expect(worst).toBeLessThanOrEqual(2 * aimSpread("hard", 1) + 1e-9);
  });

  it("finds the pocket a ball is heading for", () => {
    const t: Table = { ...table, pockets: [{ x: 2, y: 2, r: 0.15 }, { x: -2, y: 2, r: 0.15 }] };
    const n = Math.SQRT1_2;
    expect(pocketOnLine(t, 0, 0, n, n)).toBe(0);
    expect(pocketOnLine(t, 0, 0, -n, n)).toBe(1);
    expect(pocketOnLine(t, 0, 0, 1, 0)).toBe(-1);
    expect(pocketOnLine(t, 0, 0, -n, -n)).toBe(-1);
  });

  it("darts land near the aim, spread by level", () => {
    const spread = (level: "easy" | "hard") => {
      let s = 0;
      for (let i = 0; i < 400; i++) {
        const p = dartLanding(0, 0, level);
        s += Math.hypot(p.x, p.y);
      }
      return s / 400;
    };
    expect(spread("hard")).toBeGreaterThan(spread("easy") * 2);
    expect(suggestedDartTarget("easy")).toMatchObject({ x: 0, y: 0 });
    expect(dartScore(suggestedDartTarget("hard").x, suggestedDartTarget("hard").y).label).toBe("Treble 20");
  });

  it("archery always has some wind, which gusts, and aiming off cancels it on average", () => {
    for (let i = 0; i < 50; i++) {
      const w = rollWind("easy");
      expect(Math.abs(w)).toBeGreaterThan(0);
      expect(Math.abs(w)).toBeLessThanOrEqual(1);
      expect(Math.abs(nextGust(3, "hard") - 3)).toBeLessThanOrEqual(1);
    }
    // With no random error (gaussian of 0), aiming off lands dead centre at full draw.
    const calm = seq([1, 0.25]); // sqrt(-2 ln 1) = 0 → gaussian 0
    const off = aimOff(3);
    const hit = arrowLanding(off, 1, 3, "medium", calm);
    expect(hit.x).toBeCloseTo(0, 6);
    expect(hit.y).toBeCloseTo(0, 6);
    expect(hit.drift).toBeCloseTo(windDrift(3), 6);
    // An early release drops low.
    expect(arrowLanding({ x: 0, y: 0 }, 0.5, 0, "easy", calm).y).toBeLessThan(-0.5);
  });
});

describe("results", () => {
  it("names the winner", () => {
    expect(resultFor([{ name: "You", icon: "", score: 5 }, { name: "Robo", icon: "", score: 3 }], "robot")).toMatchObject({ winner: 0 });
    expect(resultFor([{ name: "A", icon: "", score: 3 }, { name: "B", icon: "", score: 3 }], "friend").winner).toBeNull();
  });
});
