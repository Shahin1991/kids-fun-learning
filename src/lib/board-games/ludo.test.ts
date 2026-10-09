import { describe, expect, it } from "vitest";
import { absOf, applyMove, BASE, botChoose, cellOf, FINISHED, legalMoves, newGame, passTurn, TRACK, LANES, type LudoState } from "./ludo";

const two = () => newGame([0, 2]);

describe("ludo geometry", () => {
  it("track has 52 distinct squares and each start sits where the board says", () => {
    expect(TRACK).toHaveLength(52);
    expect(new Set(TRACK.map((c) => c.join(","))).size).toBe(52);
    expect(cellOf(0, 0)).toEqual([1, 6]);
    expect(cellOf(1, 0)).toEqual([8, 1]);
    expect(cellOf(2, 0)).toEqual([13, 8]);
    expect(cellOf(3, 0)).toEqual([6, 13]);
  });
  it("consecutive squares are neighbours", () => {
    for (let i = 0; i < 52; i++) {
      const [a, b] = [TRACK[i], TRACK[(i + 1) % 52]];
      expect(Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]))).toBe(1); // corners step diagonally
    }
    for (const lane of LANES) expect(lane).toHaveLength(5);
  });
});

describe("ludo rules", () => {
  it("needs a six to leave base", () => {
    expect(legalMoves(two(), 0, 3)).toEqual([]);
    expect(legalMoves(two(), 0, 6)).toEqual([0, 1, 2, 3]);
  });
  it("a six earns another turn, other rolls pass it on", () => {
    const s = two();
    expect(applyMove(s, 0, 0, 6).state.turn).toBe(0);
    const s2: LudoState = { ...s, tokens: s.tokens.map((t, c) => (c === 0 ? [5, BASE, BASE, BASE] : t)) };
    expect(applyMove(s2, 0, 0, 3).state.turn).toBe(1);
  });
  it("captures an opponent on a normal square, but not on a safe one", () => {
    const s = two();
    // red token at p=4 (abs 4). yellow starts at abs 26, so yellow p=30 is abs 4.
    s.tokens[2][0] = 30;
    s.tokens[0][0] = 3;
    const r = applyMove(s, 0, 0, 1);
    expect(r.captured).toEqual([{ colour: 2, token: 0 }]);
    expect(r.state.tokens[2][0]).toBe(BASE);
    expect(r.extraTurn).toBe(true);
    // abs 8 is a star square: no capture
    const safe = two();
    safe.tokens[2][0] = 34; // yellow abs (26+34)%52 = 8
    safe.tokens[0][0] = 7;
    const r2 = applyMove(safe, 0, 0, 1);
    expect(r2.captured).toEqual([]);
    expect(absOf(2, 34)).toBe(8);
  });
  it("needs an exact roll to finish and wins when all four are home", () => {
    const s = two();
    s.tokens[0] = [54, FINISHED, FINISHED, FINISHED];
    expect(legalMoves(s, 0, 3)).toEqual([]);
    expect(legalMoves(s, 0, 2)).toEqual([0]);
    const r = applyMove(s, 0, 0, 2);
    expect(r.state.winner).toBe(0);
  });
  it("passTurn rotates players", () => {
    expect(passTurn(two()).turn).toBe(1);
    expect(passTurn({ ...two(), turn: 1 }).turn).toBe(0);
  });
  it("bots always choose a legal move and medium/hard prefer capturing", () => {
    const s = two();
    s.tokens[2][0] = 30;
    s.tokens[0][0] = 3;
    s.tokens[0][1] = 20;
    for (const level of ["easy", "medium", "hard"] as const) {
      const t = botChoose(s, 0, 1, level);
      expect(legalMoves(s, 0, 1)).toContain(t);
    }
    expect(botChoose(s, 0, 1, "medium")).toBe(0);
    expect(botChoose(s, 0, 1, "hard")).toBe(0);
  });
  it("a random full game always terminates with a winner", () => {
    for (const level of ["easy", "hard"] as const) {
      let s = newGame([0, 1, 2, 3]);
      for (let i = 0; i < 20000 && s.winner === null; i++) {
        const colour = s.players[s.turn];
        const roll = 1 + Math.floor(Math.random() * 6);
        const moves = legalMoves(s, colour, roll);
        s = moves.length ? applyMove(s, colour, botChoose(s, colour, roll, level), roll).state : passTurn(s);
      }
      expect(s.winner).not.toBeNull();
    }
  });
});
