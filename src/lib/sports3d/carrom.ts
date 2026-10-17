import type { Table } from "./physics2d";

/** Carrom: board geometry, starting layout and point-carrom scoring. Units are decimetres. */

export type CoinKind = "white" | "black" | "queen";

export const COIN_POINTS: Record<CoinKind, number> = { white: 20, black: 10, queen: 50 };

export const BOARD_HALF = 3.7; // 74 cm playing surface
export const COIN_R = 0.159; // 3.18 cm coins
export const STRIKER_R = 0.206; // 4.13 cm striker
export const POCKET_R = 0.3; // real 4.45 cm hole, made a bit friendlier
export const POCKET_INSET = 0.26;
export const BASELINE = 2.7; // distance from centre to each player's baseline
export const BASELINE_HALF = 2.3; // how far the striker may slide either side
export const MAX_SHOT = 12;

export const CARROM_TABLE: Table = {
  halfW: BOARD_HALF,
  halfH: BOARD_HALF,
  pockets: [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].map(([sx, sy]) => ({ x: sx * (BOARD_HALF - POCKET_INSET), y: sy * (BOARD_HALF - POCKET_INSET), r: POCKET_R })),
  cushionE: 0.65,
  discE: 0.9,
  decel: 2.2,
  drag: 0.6,
  stopSpeed: 0.03,
};

/** Starting coins on a hex pattern around the queen. "quick" = queen + 6, "full" = queen + 18. */
export function carromLayout(variant: string): { kind: CoinKind; x: number; y: number }[] {
  const gap = COIN_R * 2 * 1.01;
  const out: { kind: CoinKind; x: number; y: number }[] = [{ kind: "queen", x: 0, y: 0 }];
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3 + Math.PI / 2;
    out.push({ kind: k % 2 ? "black" : "white", x: Math.cos(a) * gap, y: Math.sin(a) * gap });
  }
  if (variant !== "quick") {
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3 + Math.PI / 2;
      out.push({ kind: k % 2 ? "white" : "black", x: Math.cos(a) * gap * 2, y: Math.sin(a) * gap * 2 });
      const b = a + Math.PI / 6;
      out.push({ kind: k % 2 ? "black" : "white", x: Math.cos(b) * gap * Math.sqrt(3), y: Math.sin(b) * gap * Math.sqrt(3) });
    }
  }
  return out;
}

export interface CarromTurn {
  scores: number[];
  turn: number;
  coinsLeft: number;
}

export interface CarromOutcome extends CarromTurn {
  gained: number;
  foul: boolean;
  /** Same player shoots again. */
  again: boolean;
  over: boolean;
  message: string;
}

/**
 * Kid-friendly point carrom: anyone may pocket any coin (white 20, black 10, queen 50), pocketing
 * a coin earns another shot, and pocketing the striker just ends the turn (coins still count).
 */
export function carromOutcome(state: CarromTurn, potted: CoinKind[], strikerPotted: boolean): CarromOutcome {
  const gained = potted.reduce((s, k) => s + COIN_POINTS[k], 0);
  const scores = state.scores.slice();
  scores[state.turn] += gained;
  const coinsLeft = state.coinsLeft - potted.length;
  const over = coinsLeft <= 0;
  const again = !strikerPotted && potted.length > 0 && !over;
  const turn = again || over ? state.turn : (state.turn + 1) % scores.length;
  let message: string;
  if (strikerPotted) message = gained ? `+${gained}, but the striker fell in!` : "Oops, the striker fell in!";
  else if (potted.includes("queen")) message = `The queen! +${gained} 👑`;
  else if (gained) message = `+${gained}! Shoot again 🎯`;
  else message = "No coin this time";
  return { scores, turn, coinsLeft, gained, foul: strikerPotted, again, over, message };
}
