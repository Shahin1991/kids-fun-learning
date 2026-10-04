export type Dir = "up" | "down" | "left" | "right";
export interface Pt {
  x: number;
  y: number;
}

export interface SnakeState {
  cols: number;
  rows: number;
  /** head first */
  body: Pt[];
  dir: Dir;
  /** direction applied on the last step; turning back on it is not allowed */
  moved: Dir;
  food: Pt;
  score: number;
  alive: boolean;
}

const VEC: Record<Dir, Pt> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };

export function placeFood(cols: number, rows: number, body: Pt[], rand: () => number): Pt {
  const free: Pt[] = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (!body.some((b) => b.x === x && b.y === y)) free.push({ x, y });
  return free.length ? free[Math.floor(rand() * free.length)] : { x: -1, y: -1 };
}

export function newSnake(cols = 20, rows = 14, rand: () => number = Math.random): SnakeState {
  const y = Math.floor(rows / 2);
  const body = [{ x: 5, y }, { x: 4, y }, { x: 3, y }];
  return { cols, rows, body, dir: "right", moved: "right", food: placeFood(cols, rows, body, rand), score: 0, alive: true };
}

/** Queue a turn; reversing straight into the neck is ignored. */
export function turn(s: SnakeState, d: Dir) {
  if (d !== OPPOSITE[s.moved]) s.dir = d;
}

export function step(s: SnakeState, rand: () => number = Math.random): "moved" | "ate" | "dead" {
  if (!s.alive) return "dead";
  const v = VEC[s.dir];
  const head = { x: s.body[0].x + v.x, y: s.body[0].y + v.y };
  const eating = head.x === s.food.x && head.y === s.food.y;
  // The tail moves out of the way this step unless the snake is growing.
  const solid = eating ? s.body : s.body.slice(0, -1);
  if (head.x < 0 || head.y < 0 || head.x >= s.cols || head.y >= s.rows || solid.some((b) => b.x === head.x && b.y === head.y)) {
    s.alive = false;
    return "dead";
  }
  s.body.unshift(head);
  s.moved = s.dir;
  if (eating) {
    s.score += 1;
    s.food = placeFood(s.cols, s.rows, s.body, rand);
    return "ate";
  }
  s.body.pop();
  return "moved";
}

/** Milliseconds per step: starts relaxed and speeds up as the snake grows. */
export function tickMs(score: number): number {
  return Math.max(70, 170 - score * 6);
}
