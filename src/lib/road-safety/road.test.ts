import { describe, expect, it } from "vitest";
import { act, becomeSafe, CAR_LEN, CROSSING, crossingClear, moveLane, nextAction, QUIZ, roundKind, startCars, startCrossing, type Action, type Car } from "./road";

describe("road safety", () => {
  it("crosses in order: ask, wait, look both ways, walk", () => {
    let s = startCrossing("lights");
    expect(nextAction(s)).toBe("ask");
    expect(act(s, "walk").ok).toBe(false);
    s = act(s, "ask").state;
    expect(nextAction(s)).toBe("wait");
    const early = act(s, "walk");
    expect(early.ok).toBe(false);
    expect(early.say).toMatch(/red/);
    s = becomeSafe(s);
    expect(act(s, "walk").say).toMatch(/left and right/);
    for (const a of ["lookRight", "lookLeft"] as Action[]) s = act(s, a).state;
    expect(nextAction(s)).toBe("walk");
    expect(act(s, "walk").ok).toBe(true);
  });

  it("explains a missing look", () => {
    const s = act(becomeSafe(act(startCrossing("zebra"), "ask").state), "lookLeft").state;
    expect(act(s, "walk").say).toMatch(/Look right/);
  });

  it("cars queue before the crossing and never stop on it", () => {
    let cars = startCars();
    for (let t = 0; t < 300; t++) {
      const near = moveLane(
        cars.filter((c) => c.dir === 1),
        1 / 30,
        t > 30,
      );
      const far = moveLane(
        cars.filter((c) => c.dir === -1),
        1 / 30,
        t > 30,
      );
      cars = [...near, ...far];
    }
    expect(crossingClear(cars)).toBe(true);
    for (const dir of [1, -1] as const) {
      const lane = cars
        .filter((c) => c.dir === dir)
        .map((c) => c.x)
        .sort((a, b) => a - b);
      for (let i = 1; i < lane.length; i++) expect(lane[i] - lane[i - 1]).toBeGreaterThanOrEqual(CAR_LEN);
    }
  });

  it("cars keep driving when they don't need to stop", () => {
    const car: Car = { id: 1, x: CROSSING.left - CAR_LEN - 2, dir: 1 };
    expect(moveLane([car], 1, false)[0].x).toBeGreaterThan(car.x);
    expect(moveLane([car], 1, true)[0].x).toBe(car.x);
  });

  it("each quiz has one right answer, and every third round is a quiz", () => {
    for (const q of QUIZ) expect(q.choices.filter((c) => c.right)).toHaveLength(1);
    expect([0, 1, 2, 3, 4, 5].map((n) => roundKind(n).kind)).toEqual(["cross", "cross", "quiz", "cross", "cross", "quiz"]);
    const scenes = [0, 1, 3, 4].map((n) => roundKind(n)).map((k) => (k.kind === "cross" ? k.scene : null));
    expect(scenes).toEqual(["lights", "zebra", "lights", "zebra"]);
  });
});
