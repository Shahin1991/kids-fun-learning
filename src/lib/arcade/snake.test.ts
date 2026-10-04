import { describe, expect, it } from "vitest";
import { newSnake, placeFood, step, tickMs, turn } from "./snake";

const fixed = () => 0;

describe("snake", () => {
  it("moves one cell forward and keeps its length", () => {
    const s = newSnake(20, 14, fixed);
    const head = s.body[0];
    expect(step(s, fixed)).toBe("moved");
    expect(s.body[0]).toEqual({ x: head.x + 1, y: head.y });
    expect(s.body).toHaveLength(3);
  });

  it("grows and scores when it eats", () => {
    const s = newSnake(20, 14, fixed);
    s.food = { x: s.body[0].x + 1, y: s.body[0].y };
    expect(step(s, fixed)).toBe("ate");
    expect(s.body).toHaveLength(4);
    expect(s.score).toBe(1);
    expect(s.body.some((b) => b.x === s.food.x && b.y === s.food.y)).toBe(false);
  });

  it("dies on a wall", () => {
    const s = newSnake(6, 6, fixed);
    let r = "moved";
    for (let i = 0; i < 10 && r !== "dead"; i++) r = step(s, fixed);
    expect(r).toBe("dead");
    expect(s.alive).toBe(false);
  });

  it("cannot reverse into its own neck", () => {
    const s = newSnake(20, 14, fixed);
    turn(s, "left");
    expect(s.dir).toBe("right");
    turn(s, "up");
    expect(s.dir).toBe("up");
  });

  it("dies when it runs into itself", () => {
    const s = newSnake(20, 14, fixed);
    s.body = [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 4, y: 6 }, { x: 4, y: 5 }, { x: 4, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 }];
    s.dir = "left";
    s.moved = "up";
    s.food = { x: 0, y: 0 };
    expect(step(s, fixed)).toBe("dead");
  });

  it("never places food on the snake and speeds up with score", () => {
    const body = [{ x: 0, y: 0 }, { x: 1, y: 0 }];
    for (let i = 0; i < 30; i++) {
      const f = placeFood(2, 2, body, Math.random);
      expect(body.some((b) => b.x === f.x && b.y === f.y)).toBe(false);
    }
    expect(tickMs(0)).toBeGreaterThan(tickMs(20));
    expect(tickMs(100)).toBe(70);
  });
});
