export const LADDERS: Record<number, number> = { 4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81, 71: 91 };
export const SNAKES: Record<number, number> = { 17: 7, 54: 34, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 99: 78 };
export const END = 100;

export interface Jump {
  from: number;
  to: number;
  kind: "snake" | "ladder";
}

export interface Move {
  /** Squares hopped over one at a time, ending where the dice ran out */
  path: number[];
  landed: number;
  jump: Jump | null;
  final: number;
  won: boolean;
}

/**
 * Walk `roll` squares from `pos`. Going past 100 bounces back (so a child is never stuck waiting for an exact number).
 * Then a snake slides you down or a ladder lifts you up.
 */
export function moveFrom(pos: number, roll: number): Move {
  const path: number[] = [];
  let at = pos;
  let dir = 1;
  for (let i = 0; i < roll; i++) {
    if (at + dir > END) dir = -1;
    at += dir;
    path.push(at);
  }
  const landed = at;
  const to = LADDERS[landed] ?? SNAKES[landed];
  const jump: Jump | null = to === undefined ? null : { from: landed, to, kind: LADDERS[landed] !== undefined ? "ladder" : "snake" };
  const final = jump ? jump.to : landed;
  return { path, landed, jump, final, won: final === END };
}

/** Square number -> column/row on the 10x10 board (row 0 is the bottom; rows snake left-right then right-left). */
export function squareCell(n: number): { col: number; row: number } {
  const i = n - 1;
  const row = Math.floor(i / 10);
  const col = row % 2 === 0 ? i % 10 : 9 - (i % 10);
  return { col, row };
}
