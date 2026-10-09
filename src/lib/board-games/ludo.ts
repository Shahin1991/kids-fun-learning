export type Level = "easy" | "medium" | "hard";

/** Token progress: -1 in base, 0-50 on the shared track (0 = own start square), 51-55 home lane, 56 finished. */
export const BASE = -1;
export const LANE_START = 51;
export const FINISHED = 56;
export const TRACK_LEN = 52;
export const COLOURS = ["red", "green", "yellow", "blue"] as const;
export const START_ABS = [0, 13, 26, 39];
/** Squares nobody can be captured on: the four start squares and four stars. */
export const SAFE = new Set([0, 13, 26, 39, 8, 21, 34, 47]);

export type Tokens = number[][];

export interface LudoState {
  /** Colour indexes in play (e.g. [0, 2] for a 2-player game) */
  players: number[];
  tokens: Tokens;
  /** Index into `players` whose turn it is */
  turn: number;
  winner: number | null;
}

/** The 52 shared track squares on the 15x15 grid [col,row], clockwise from red's start square. */
export const TRACK: [number, number][] = [
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], [7, 0], [8, 0],
  [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], [14, 7], [14, 8],
  [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14], [7, 14], [6, 14],
  [6, 13], [6, 12], [6, 11], [6, 10], [6, 9], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8], [0, 7], [0, 6],
];

/** Five home-lane squares per colour, leading to the centre. */
export const LANES: [number, number][][] = [
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
];
export const CENTRE: [number, number] = [7, 7];
/** Where a colour's four base slots sit on the grid. */
export const BASE_SLOTS: [number, number][][] = [
  [[1.5, 1.5], [3.5, 1.5], [1.5, 3.5], [3.5, 3.5]],
  [[10.5, 1.5], [12.5, 1.5], [10.5, 3.5], [12.5, 3.5]],
  [[10.5, 10.5], [12.5, 10.5], [10.5, 12.5], [12.5, 12.5]],
  [[1.5, 10.5], [3.5, 10.5], [1.5, 12.5], [3.5, 12.5]],
];

export const absOf = (colour: number, p: number) => (START_ABS[colour] + p) % TRACK_LEN;

/** Grid position of a token with progress p (base slots are handled by BASE_SLOTS). */
export function cellOf(colour: number, p: number, slot = 0): [number, number] {
  if (p === BASE) return BASE_SLOTS[colour][slot];
  if (p <= 50) return TRACK[absOf(colour, p)];
  if (p < FINISHED) return LANES[colour][p - LANE_START];
  return CENTRE;
}

export function newGame(players: number[]): LudoState {
  return { players, tokens: COLOURS.map(() => [BASE, BASE, BASE, BASE]), turn: 0, winner: null };
}

/** Token indexes (0-3) of `colour` that can move with this roll. */
export function legalMoves(state: LudoState, colour: number, roll: number): number[] {
  const out: number[] = [];
  state.tokens[colour].forEach((p, i) => {
    if (p === FINISHED) return;
    if (p === BASE) {
      if (roll === 6) out.push(i);
      return;
    }
    if (p + roll <= FINISHED) out.push(i);
  });
  return out;
}

export interface MoveResult {
  state: LudoState;
  from: number;
  to: number;
  captured: { colour: number; token: number }[];
  reachedHome: boolean;
  extraTurn: boolean;
}

/** Applies one move and decides whose turn comes next. A 6 earns another roll. */
export function applyMove(state: LudoState, colour: number, token: number, roll: number): MoveResult {
  const tokens = state.tokens.map((t) => [...t]);
  const from = tokens[colour][token];
  const to = from === BASE ? 0 : from + roll;
  tokens[colour][token] = to;
  const captured: { colour: number; token: number }[] = [];
  if (to <= 50) {
    const abs = absOf(colour, to);
    if (!SAFE.has(abs)) {
      state.players.forEach((c) => {
        if (c === colour) return;
        tokens[c].forEach((p, i) => {
          if (p >= 0 && p <= 50 && absOf(c, p) === abs) {
            tokens[c][i] = BASE;
            captured.push({ colour: c, token: i });
          }
        });
      });
    }
  }
  const won = tokens[colour].every((p) => p === FINISHED);
  const extraTurn = !won && (roll === 6 || captured.length > 0 || to === FINISHED);
  const next: LudoState = {
    ...state,
    tokens,
    winner: won ? colour : state.winner,
    turn: won || extraTurn ? state.turn : (state.turn + 1) % state.players.length,
  };
  return { state: next, from, to, captured, reachedHome: to === FINISHED, extraTurn };
}

/** Turn passes on when no token can move. */
export function passTurn(state: LudoState): LudoState {
  return { ...state, turn: (state.turn + 1) % state.players.length };
}

/** True if an opponent could land on this absolute square with one roll of 1-6 (ignoring leaving base). */
function threatened(state: LudoState, colour: number, abs: number): boolean {
  if (SAFE.has(abs)) return false;
  return state.players.some(
    (c) =>
      c !== colour &&
      state.tokens[c].some((p) => {
        if (p < 0 || p > 50) return false;
        const d = (abs - absOf(c, p) + TRACK_LEN) % TRACK_LEN;
        return d >= 1 && d <= 6 && p + d <= 50;
      }),
  );
}

/**
 * Easy: any legal move. Medium: enter > capture > finish > furthest token. Hard: scores each move
 * (captures, reaching safe squares, leaving danger, entering the lane) and picks the best.
 */
export function botChoose(state: LudoState, colour: number, roll: number, level: Level, rand: () => number = Math.random): number {
  const moves = legalMoves(state, colour, roll);
  if (moves.length === 1 || level === "easy") return moves[Math.floor(rand() * moves.length)];
  const scored = moves.map((t) => {
    const r = applyMove(state, colour, t, roll);
    const from = state.tokens[colour][t];
    let s = 0;
    if (r.captured.length) s += 60 * r.captured.length + r.captured.reduce((a, c) => a + state.tokens[c.colour][c.token], 0);
    if (r.reachedHome) s += 50;
    if (from === BASE) s += level === "medium" ? 40 : 30;
    if (r.to >= LANE_START && from < LANE_START) s += 25;
    s += r.to * (level === "medium" ? 0.6 : 0.3);
    if (level === "hard") {
      const toAbs = r.to <= 50 ? absOf(colour, r.to) : -1;
      if (toAbs >= 0 && SAFE.has(toAbs)) s += 18;
      if (toAbs >= 0 && threatened(r.state, colour, toAbs)) s -= 35 + r.to * 0.3;
      if (from >= 0 && from <= 50 && threatened(state, colour, absOf(colour, from))) s += 28;
    }
    return { t, s: s + rand() * 0.5 };
  });
  return scored.sort((a, b) => b.s - a.s)[0].t;
}
