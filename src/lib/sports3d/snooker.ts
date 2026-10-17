import type { Table } from "./physics2d";

/**
 * Snooker: table geometry, spots and the scoring rules (red then colour, colours re-spotted while
 * reds remain, then the colours in order). Units are metres. Kept: ball-on, fouls worth at least
 * 4 to the opponent, ball in hand in the D. Left out for kids: free ball, the miss rule, re-spotted
 * black on a tie, nominating (the first colour hit counts as the nominated one).
 */

export type Colour = "yellow" | "green" | "brown" | "blue" | "pink" | "black";
export type BallKind = "cue" | "red" | Colour;

export const COLOURS: Colour[] = ["yellow", "green", "brown", "blue", "pink", "black"];
export const VALUES: Record<Exclude<BallKind, "cue">, number> = { red: 1, yellow: 2, green: 3, brown: 4, blue: 5, pink: 6, black: 7 };

// Real table 3569 x 1778 mm. Balls are drawn ~30% larger than 52.5 mm and pockets are generous.
export const HALF_L = 1.7845;
export const HALF_W = 0.889;
export const BALL_R = 0.034;
export const BAULK_Y = -HALF_L + 0.737;
export const D_R = 0.292;
export const MAX_SHOT = 4.2;

export const SPOTS: Record<Colour, { x: number; y: number }> = {
  // Viewed from the baulk end: green left, brown middle, yellow right.
  yellow: { x: D_R, y: BAULK_Y },
  green: { x: -D_R, y: BAULK_Y },
  brown: { x: 0, y: BAULK_Y },
  blue: { x: 0, y: 0 },
  pink: { x: 0, y: HALF_L - 0.892 },
  black: { x: 0, y: HALF_L - 0.324 },
};

export const SNOOKER_TABLE: Table = {
  halfW: HALF_W,
  halfH: HALF_L,
  pockets: [
    { x: -HALF_W, y: -HALF_L, r: BALL_R * 2.1 },
    { x: HALF_W, y: -HALF_L, r: BALL_R * 2.1 },
    { x: -HALF_W, y: HALF_L, r: BALL_R * 2.1 },
    { x: HALF_W, y: HALF_L, r: BALL_R * 2.1 },
    { x: -HALF_W - BALL_R * 0.3, y: 0, r: BALL_R * 2.0 },
    { x: HALF_W + BALL_R * 0.3, y: 0, r: BALL_R * 2.0 },
  ],
  cushionE: 0.75,
  discE: 0.95,
  decel: 0.32,
  drag: 0.28,
  stopSpeed: 0.006,
};

/** Triangle of reds behind the pink, apex nearest the pink. Supports 3, 6, 10 or 15 reds. */
export function redRack(count: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  const gap = BALL_R * 2 * 1.005;
  const apexY = SPOTS.pink.y + BALL_R * 2 + 0.004;
  for (let row = 0; out.length < count; row++) {
    for (let i = 0; i <= row && out.length < count; i++) {
      out.push({ x: (i - row / 2) * gap, y: apexY + row * gap * Math.sin(Math.PI / 3) });
    }
  }
  return out;
}

export type Target = "red" | "colour" | "sequence";

export interface SnookerState {
  scores: number[];
  turn: number;
  redsLeft: number;
  /** Colours still to clear in the final sequence (all six until the reds are gone). */
  sequence: Colour[];
  target: Target;
  /** Points in the current visit. */
  brk: number;
  over: boolean;
}

export function newSnooker(players: number, reds: number): SnookerState {
  return { scores: Array(players).fill(0), turn: 0, redsLeft: reds, sequence: COLOURS.slice(), target: "red", brk: 0, over: false };
}

/** Ball kinds that may legally be struck first. */
export function ballsOn(s: SnookerState): BallKind[] {
  if (s.target === "red") return ["red"];
  if (s.target === "colour") return COLOURS.slice();
  return [s.sequence[0]];
}

export function targetLabel(s: SnookerState): string {
  if (s.target === "red") return "Pot a red 🔴";
  if (s.target === "colour") return "Now pot any colour 🌈";
  return `Pot the ${s.sequence[0]} (${VALUES[s.sequence[0]]})`;
}

export interface SnookerShot {
  firstHit: BallKind | null;
  potted: BallKind[];
}

export interface SnookerOutcome {
  state: SnookerState;
  foul: boolean;
  /** Points scored by the striker (or awarded to the opponent on a foul). */
  points: number;
  /** Colours to put back on their spots. */
  respot: Colour[];
  cueInHand: boolean;
  keepTurn: boolean;
  message: string;
}

export function snookerOutcome(s: SnookerState, shot: SnookerShot): SnookerOutcome {
  const on = ballsOn(s);
  const balls = shot.potted.filter((k): k is Exclude<BallKind, "cue"> => k !== "cue");
  const cuePotted = shot.potted.includes("cue");
  const redsPotted = balls.filter((k) => k === "red").length;
  const coloursPotted = balls.filter((k): k is Colour => k !== "red");
  const players = s.scores.length;
  const next = { ...s, scores: s.scores.slice(), sequence: s.sequence.slice() };

  let foulWhy = "";
  if (shot.firstHit === null) foulWhy = "missed everything";
  else if (shot.firstHit === "cue" || !on.includes(shot.firstHit)) foulWhy = `hit the ${shot.firstHit} first`;
  else if (cuePotted) foulWhy = "the white went in";
  else if (s.target === "red" && coloursPotted.length) foulWhy = `potted the ${coloursPotted[0]}`;
  else if (s.target === "colour" && (redsPotted || coloursPotted.some((c) => c !== shot.firstHit))) foulWhy = "potted the wrong ball";
  else if (s.target === "sequence" && balls.some((k) => k !== s.sequence[0])) foulWhy = "potted the wrong ball";

  if (foulWhy) {
    const involved = [shot.firstHit, ...balls].filter((k): k is Exclude<BallKind, "cue"> => !!k && k !== "cue").map((k) => VALUES[k]);
    const onValue = s.target === "sequence" ? VALUES[s.sequence[0]] : 0;
    const points = Math.max(4, onValue, ...involved);
    // Reds stay down; colours always come back after a foul.
    next.redsLeft -= redsPotted;
    if (players > 1) {
      const opp = (s.turn + 1) % players;
      next.scores[opp] += points;
      next.turn = opp;
    }
    next.brk = 0;
    next.target = next.redsLeft > 0 ? "red" : "sequence";
    return { state: next, foul: true, points, respot: coloursPotted, cueInHand: cuePotted, keepTurn: false, message: `Foul: ${foulWhy}. ${players > 1 ? `+${points} to the other side` : "Try again"}` };
  }

  let points = 0;
  let respot: Colour[] = [];
  if (s.target === "red") {
    points = redsPotted;
    next.redsLeft -= redsPotted;
    if (redsPotted) next.target = "colour";
  } else if (s.target === "colour") {
    if (coloursPotted.length) {
      points = VALUES[coloursPotted[0]];
      respot = coloursPotted;
    }
    next.target = next.redsLeft > 0 ? "red" : "sequence";
  } else if (coloursPotted.length) {
    points = VALUES[coloursPotted[0]];
    next.sequence.shift();
    if (!next.sequence.length) next.over = true;
  }

  next.scores[s.turn] += points;
  const keepTurn = points > 0 && !next.over;
  if (keepTurn) next.brk = s.brk + points;
  else {
    next.brk = 0;
    if (!next.over) {
      next.turn = (s.turn + 1) % players;
      if (s.target !== "sequence") next.target = next.redsLeft > 0 ? "red" : "sequence";
    }
  }
  const message = points ? `+${points}${keepTurn && next.brk > points ? ` · break ${next.brk}` : ""}` : "No pot";
  return { state: next, foul: false, points, respot, cueInHand: false, keepTurn, message };
}
