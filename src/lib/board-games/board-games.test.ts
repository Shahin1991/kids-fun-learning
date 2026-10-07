import { describe, expect, it } from "vitest";
import * as c4 from "./connect4";
import * as ttt from "./tictactoe";

describe("tic tac toe", () => {
  it("detects wins", () => {
    expect(ttt.winnerOf(["X", "X", "X", null, "O", "O", null, null, null])?.line).toEqual([0, 1, 2]);
    expect(ttt.winnerOf(Array(9).fill(null))).toBeNull();
  });
  it("medium bot takes a win and blocks", () => {
    expect(ttt.botMove(["O", "O", null, "X", "X", null, null, null, null], "O", "medium", () => 0)).toBe(2);
    expect(ttt.botMove(["X", "X", null, null, "O", null, null, null, null], "O", "medium", () => 0)).toBe(2);
  });
  it("hard bot never loses to random play", () => {
    for (let g = 0; g < 200; g++) {
      let b: ttt.Cell[] = Array(9).fill(null);
      let turn: ttt.Mark = g % 2 ? "X" : "O"; // alternate who starts
      const bot: ttt.Mark = "O";
      while (!ttt.winnerOf(b) && !ttt.isFull(b)) {
        const free = b.flatMap((v, i) => (v ? [] : [i]));
        const i = turn === bot ? ttt.botMove(b, bot, "hard") : free[Math.floor(Math.random() * free.length)];
        b = b.map((v, k) => (k === i ? turn : v));
        turn = ttt.other(turn);
      }
      expect(ttt.winnerOf(b)?.mark).not.toBe("X");
    }
  });
});

describe("connect 4", () => {
  it("detects horizontal, vertical and diagonal wins", () => {
    let b = c4.emptyBoard();
    for (let c = 0; c < 4; c++) b = c4.drop(b, c, 1)!;
    expect(c4.findWin(b)?.disc).toBe(1);
    b = c4.emptyBoard();
    for (let i = 0; i < 4; i++) b = c4.drop(b, 2, 2)!;
    expect(c4.findWin(b)?.disc).toBe(2);
    b = c4.emptyBoard();
    b = c4.drop(b, 0, 1)!;
    b = c4.drop(b, 1, 2)!; b = c4.drop(b, 1, 1)!;
    b = c4.drop(b, 2, 2)!; b = c4.drop(b, 2, 2)!; b = c4.drop(b, 2, 1)!;
    b = c4.drop(b, 3, 2)!; b = c4.drop(b, 3, 2)!; b = c4.drop(b, 3, 2)!; b = c4.drop(b, 3, 1)!;
    expect(c4.findWin(b)?.disc).toBe(1);
  });
  it("full column refuses discs", () => {
    let b = c4.emptyBoard();
    for (let i = 0; i < c4.ROWS; i++) b = c4.drop(b, 0, i % 2 ? 1 : 2)!;
    expect(c4.drop(b, 0, 1)).toBeNull();
  });
  it("medium and hard bots win now and block", () => {
    let b = c4.emptyBoard();
    for (let c = 0; c < 3; c++) b = c4.drop(b, c, 2)!;
    for (const level of ["medium", "hard"] as const) {
      expect(c4.botColumn(b, 2, level)).toBe(3);
      expect(c4.botColumn(b, 1, level)).toBe(3);
    }
  });
  it("hard bot answers quickly", () => {
    let b = c4.emptyBoard();
    b = c4.drop(b, 3, 1)!;
    const t = Date.now();
    c4.botColumn(b, 2, "hard");
    expect(Date.now() - t).toBeLessThan(3000);
  });
});
