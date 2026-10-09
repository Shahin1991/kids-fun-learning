import { describe, expect, it } from "vitest";
import { botAction, buildDeck, canPlay, drawCards, drawOne, newGame, passTurn, playable, playCard, top, type Card, type UnoState } from "./uno";

const card = (id: number, colour: Card["colour"], kind: Card["kind"]): Card => ({ id, colour, kind });
const base = (over: Partial<UnoState> = {}): UnoState => ({
  deck: [card(900, "red", "1"), card(901, "blue", "2"), card(902, "green", "3"), card(903, "yellow", "4"), card(904, "red", "5"), card(905, "blue", "6")],
  discard: [card(800, "red", "5")],
  hands: [[card(1, "red", "7"), card(2, "blue", "5"), card(3, null, "wild")], [card(4, "green", "9"), card(5, "yellow", "skip")], [card(6, "blue", "1"), card(7, "red", "2")]],
  turn: 0, dir: 1, colour: "red", winner: null, drew: null, ...over,
});

describe("uno deck and play rules", () => {
  it("builds the standard 108 cards", () => {
    const d = buildDeck();
    expect(d).toHaveLength(108);
    expect(d.filter((c) => c.kind === "wild")).toHaveLength(4);
    expect(d.filter((c) => c.kind === "wild4")).toHaveLength(4);
    expect(d.filter((c) => c.kind === "0")).toHaveLength(4);
    expect(new Set(d.map((c) => c.id)).size).toBe(108);
  });
  it("deals 7 each and starts on a number card", () => {
    for (let i = 0; i < 30; i++) {
      const s = newGame(3);
      s.hands.forEach((h) => expect(h).toHaveLength(7));
      expect(/^\d$/.test(top(s).kind)).toBe(true);
      expect(s.colour).toBe(top(s).colour);
    }
  });
  it("matches by colour, by number, or with a wild", () => {
    const s = base();
    expect(canPlay(card(1, "red", "7"), s)).toBe(true);
    expect(canPlay(card(2, "blue", "5"), s)).toBe(true);
    expect(canPlay(card(9, "blue", "7"), s)).toBe(false);
    expect(canPlay(card(3, null, "wild"), s)).toBe(true);
    expect(playable(s, 0).map((c) => c.id)).toEqual([1, 2, 3]);
  });
  it("skip, reverse, draw two and wild four do what they say", () => {
    let s = base({ hands: [[card(1, "red", "skip"), card(8, "red", "1")], [card(4, "green", "9")], [card(6, "blue", "1")]] });
    let r = playCard(s, 0, 1);
    expect(r.state.turn).toBe(2);
    expect(r.effect.skipped).toBe(1);
    s = base({ hands: [[card(1, "red", "reverse"), card(8, "red", "1")], [card(4, "green", "9")], [card(6, "blue", "1")]] });
    r = playCard(s, 0, 1);
    expect(r.state.dir).toBe(-1);
    expect(r.state.turn).toBe(2);
    s = base({ hands: [[card(1, "red", "reverse"), card(8, "red", "1")], [card(4, "green", "9")]] });
    expect(playCard(s, 0, 1).state.turn).toBe(0); // two players: reverse acts as skip
    s = base({ hands: [[card(1, "red", "draw2"), card(8, "red", "1")], [card(4, "green", "9")], [card(6, "blue", "1")]] });
    r = playCard(s, 0, 1);
    expect(r.state.hands[1]).toHaveLength(3);
    expect(r.state.turn).toBe(2);
    s = base({ hands: [[card(3, null, "wild4"), card(8, "red", "1")], [card(4, "green", "9")], [card(6, "blue", "1")]] });
    r = playCard(s, 0, 3, "green");
    expect(r.state.hands[1]).toHaveLength(5);
    expect(r.state.colour).toBe("green");
  });
  it("emptying your hand wins", () => {
    const s = base({ hands: [[card(1, "red", "7")], [card(4, "green", "9")]] });
    expect(playCard(s, 0, 1).state.winner).toBe(0);
  });
  it("rejects illegal plays", () => {
    const s = base();
    s.hands[0].push(card(50, "green", "9"));
    expect(() => playCard(s, 0, 50)).toThrow();
  });
  it("reshuffles the discard pile when the deck runs out, keeping the top card", () => {
    const s = base({ deck: [card(900, "red", "1")], discard: [card(801, "blue", "1"), card(802, "green", "2"), card(800, "red", "5")] });
    const r = drawCards(s, 0, 3);
    expect(r.drawn).toHaveLength(3);
    expect(r.state.discard.map((c) => c.id)).toEqual([800]);
  });
  it("drawing leaves the card playable and passing moves on", () => {
    const s = base();
    const r = drawOne(s, 0);
    expect(r.state.drew).toBe(r.card!.id);
    expect(passTurn(r.state).turn).toBe(1);
    expect(passTurn(r.state).drew).toBeNull();
  });
});

describe("uno bots", () => {
  it("always return a legal action and random games finish", () => {
    for (const level of ["easy", "medium", "hard"] as const) {
      let s = newGame(4);
      for (let i = 0; i < 4000 && s.winner === null; i++) {
        const a = botAction(s, s.turn, level);
        if (a.type === "play") s = playCard(s, s.turn, a.cardId, a.colour).state;
        else if (a.type === "draw") {
          const d = drawOne(s, s.turn);
          s = d.state;
          if (!d.canPlayIt) s = passTurn(s);
        } else s = passTurn(s);
      }
      expect(s.winner).not.toBeNull();
    }
  });
});
