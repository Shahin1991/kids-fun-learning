export type Level = "easy" | "medium" | "hard";
export type Colour = "red" | "yellow" | "green" | "blue";
export const COLOURS: Colour[] = ["red", "yellow", "green", "blue"];
export type Kind = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "skip" | "reverse" | "draw2" | "wild" | "wild4";

export interface Card {
  id: number;
  /** Wild cards have no colour until played */
  colour: Colour | null;
  kind: Kind;
}

export interface UnoState {
  deck: Card[];
  discard: Card[];
  hands: Card[][];
  turn: number;
  dir: 1 | -1;
  /** The colour in force (a wild card sets it) */
  colour: Colour;
  winner: number | null;
  /** The card just drawn this turn, which may still be played */
  drew: number | null;
}

export function buildDeck(): Card[] {
  const cards: Omit<Card, "id">[] = [];
  for (const colour of COLOURS) {
    cards.push({ colour, kind: "0" });
    for (const k of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"] as Kind[]) {
      cards.push({ colour, kind: k }, { colour, kind: k });
    }
  }
  for (let i = 0; i < 4; i++) cards.push({ colour: null, kind: "wild" }, { colour: null, kind: "wild4" });
  return cards.map((c, id) => ({ id, ...c }));
}

export function shuffle<T>(list: T[], rand: () => number = Math.random): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const isWild = (c: Card) => c.kind === "wild" || c.kind === "wild4";
export const isAction = (c: Card) => c.kind === "skip" || c.kind === "reverse" || c.kind === "draw2" || isWild(c);

export function newGame(players: number, rand: () => number = Math.random): UnoState {
  let deck = shuffle(buildDeck(), rand);
  const hands: Card[][] = Array.from({ length: players }, () => []);
  for (let r = 0; r < 7; r++) for (let p = 0; p < players; p++) hands[p].push(deck.pop()!);
  // Start with a plain number card so the first move is simple for kids.
  let first = deck.pop()!;
  while (isAction(first)) {
    deck = shuffle([first, ...deck], rand);
    first = deck.pop()!;
  }
  return { deck, discard: [first], hands, turn: 0, dir: 1, colour: first.colour!, winner: null, drew: null };
}

export const top = (s: UnoState) => s.discard[s.discard.length - 1];

export function canPlay(card: Card, s: UnoState): boolean {
  if (isWild(card)) return true;
  const t = top(s);
  return card.colour === s.colour || (!isWild(t) && card.kind === t.kind) || (isWild(t) && card.kind === t.kind);
}

export const playable = (s: UnoState, p: number): Card[] => s.hands[p].filter((c) => canPlay(c, s));

const nextIndex = (s: UnoState, from: number, steps = 1) => (((from + s.dir * steps) % s.hands.length) + s.hands.length) % s.hands.length;

/** Take `n` cards for player p, reshuffling the discard pile (keeping its top card) when the deck runs out. */
export function drawCards(s: UnoState, p: number, n: number, rand: () => number = Math.random): { state: UnoState; drawn: Card[] } {
  let deck = [...s.deck];
  let discard = [...s.discard];
  const drawn: Card[] = [];
  for (let i = 0; i < n; i++) {
    if (deck.length === 0) {
      if (discard.length <= 1) break;
      const keep = discard.pop()!;
      deck = shuffle(discard, rand);
      discard = [keep];
    }
    drawn.push(deck.pop()!);
  }
  const hands = s.hands.map((h, i) => (i === p ? [...h, ...drawn] : h));
  return { state: { ...s, deck, discard, hands }, drawn };
}

export interface PlayEffect {
  skipped: number | null;
  /** Player who had to pick up cards because of this play */
  penalised: { player: number; count: number } | null;
  reversed: boolean;
}

/** Plays a card from player p's hand; `colour` is required for wilds. */
export function playCard(s: UnoState, p: number, cardId: number, colour?: Colour, rand: () => number = Math.random): { state: UnoState; effect: PlayEffect } {
  const card = s.hands[p].find((c) => c.id === cardId);
  if (!card || !canPlay(card, s)) throw new Error("illegal play");
  let state: UnoState = {
    ...s,
    hands: s.hands.map((h, i) => (i === p ? h.filter((c) => c.id !== cardId) : h)),
    discard: [...s.discard, card],
    colour: isWild(card) ? (colour ?? COLOURS[0]) : card.colour!,
    drew: null,
  };
  const effect: PlayEffect = { skipped: null, penalised: null, reversed: false };
  if (state.hands[p].length === 0) return { state: { ...state, winner: p }, effect };
  let steps = 1;
  const victim = nextIndex(state, p);
  if (card.kind === "reverse") {
    effect.reversed = true;
    if (state.hands.length === 2) {
      effect.skipped = victim;
      steps = 2;
    } else {
      state = { ...state, dir: (state.dir === 1 ? -1 : 1) as 1 | -1 };
    }
  } else if (card.kind === "skip") {
    effect.skipped = victim;
    steps = 2;
  } else if (card.kind === "draw2" || card.kind === "wild4") {
    const n = card.kind === "draw2" ? 2 : 4;
    const r = drawCards(state, victim, n, rand);
    state = r.state;
    effect.penalised = { player: victim, count: r.drawn.length };
    effect.skipped = victim;
    steps = 2;
  }
  return { state: { ...state, turn: nextIndex(state, p, steps) }, effect };
}

/** Player p draws one card (no playable card in hand). It stays in `drew` so it can be played straight away. */
export function drawOne(s: UnoState, p: number, rand: () => number = Math.random): { state: UnoState; card: Card | null; canPlayIt: boolean } {
  const r = drawCards(s, p, 1, rand);
  const card = r.drawn[0] ?? null;
  const state = { ...r.state, drew: card ? card.id : null };
  return { state, card, canPlayIt: card ? canPlay(card, state) : false };
}

export function passTurn(s: UnoState): UnoState {
  return { ...s, turn: nextIndex(s, s.turn), drew: null };
}

const colourCounts = (hand: Card[]) => {
  const n: Record<Colour, number> = { red: 0, yellow: 0, green: 0, blue: 0 };
  hand.forEach((c) => c.colour && (n[c.colour] += 1));
  return n;
};

export function bestColour(hand: Card[]): Colour {
  const n = colourCounts(hand);
  return COLOURS.reduce((a, b) => (n[b] > n[a] ? b : a));
}

export type BotAction = { type: "play"; cardId: number; colour?: Colour } | { type: "draw" } | { type: "pass" };

/**
 * Easy: any playable card. Medium: prefers action cards, saves wilds, picks its most common colour.
 * Hard: also attacks when the next player is nearly out and plays the colour it holds most of.
 */
export function botAction(s: UnoState, p: number, level: Level, rand: () => number = Math.random): BotAction {
  const options = playable(s, p);
  // After drawing, only the drawn card may be played.
  const pool = s.drew !== null ? options.filter((c) => c.id === s.drew) : options;
  if (pool.length === 0) return s.drew !== null ? { type: "pass" } : { type: "draw" };
  const hand = s.hands[p];
  const finish = (c: Card): BotAction => ({ type: "play", cardId: c.id, colour: isWild(c) ? bestColour(hand.filter((h) => h.id !== c.id)) : undefined });
  if (level === "easy") return finish(pool[Math.floor(rand() * pool.length)]);
  const nextHand = s.hands[nextIndex(s, p)].length;
  const counts = colourCounts(hand);
  const scored = pool.map((c) => {
    let sc = rand();
    if (c.kind === "skip" || c.kind === "reverse") sc += 3;
    if (c.kind === "draw2") sc += nextHand <= 3 ? 8 : 4;
    if (isWild(c)) sc += pool.length === 1 ? 10 : hand.length <= 2 || (level === "hard" && nextHand <= 2 && c.kind === "wild4") ? 6 : -4;
    if (c.kind === "wild4" && level === "medium") sc -= 2;
    if (!isWild(c) && c.colour) sc += counts[c.colour] * (level === "hard" ? 1.2 : 0.4);
    if (!isWild(c) && /^\d$/.test(c.kind)) sc += Number(c.kind) * 0.15;
    return { c, sc };
  });
  return finish(scored.sort((a, b) => b.sc - a.sc)[0].c);
}
