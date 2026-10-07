export type Dir = "up" | "down" | "left" | "right";

export interface RobotLevel {
  /** Rows of: R robot, S star, # rock, . empty */
  grid: string[];
}

export const DELTA: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export const ROBOT_LEVELS: RobotLevel[] = [
  { grid: ["R.S.", "....", "....", "...."] },
  { grid: ["R...", "....", "..S.", "...."] },
  { grid: ["R#..", ".#..", ".S..", "...."] },
  { grid: ["R.#.", "..#.", "..#S", "...."] },
  { grid: ["R...", ".##.", ".#S.", "...."] },
  { grid: ["R.#..", ".##..", "...#.", ".#.S.", "...#."] },
];

export function findCell(grid: string[], ch: string): [number, number] {
  for (let y = 0; y < grid.length; y++) {
    const x = grid[y].indexOf(ch);
    if (x >= 0) return [x, y];
  }
  return [0, 0];
}

export type StepResult = { at: [number, number]; bumped: boolean };

/** Applies one move; walls and rocks block it. */
export function step(grid: string[], at: [number, number], dir: Dir): StepResult {
  const [dx, dy] = DELTA[dir];
  const nx = at[0] + dx;
  const ny = at[1] + dy;
  if (ny < 0 || ny >= grid.length || nx < 0 || nx >= grid[0].length || grid[ny][nx] === "#") return { at, bumped: true };
  return { at: [nx, ny], bumped: false };
}

/** Runs a whole program; true when the robot finishes on the star without bumping. */
export function solves(grid: string[], program: Dir[]): boolean {
  let at = findCell(grid, "R");
  for (const d of program) {
    const r = step(grid, at, d);
    if (r.bumped) return false;
    at = r.at;
  }
  const [sx, sy] = findCell(grid, "S");
  return at[0] === sx && at[1] === sy;
}

/** Breadth-first shortest solution, used to prove every level can be solved. */
export function shortestSolution(grid: string[]): Dir[] | null {
  const start = findCell(grid, "R");
  const [sx, sy] = findCell(grid, "S");
  const seen = new Set([start.join(",")]);
  const queue: { at: [number, number]; path: Dir[] }[] = [{ at: start, path: [] }];
  while (queue.length) {
    const { at, path } = queue.shift()!;
    if (at[0] === sx && at[1] === sy) return path;
    for (const d of Object.keys(DELTA) as Dir[]) {
      const r = step(grid, at, d);
      if (!r.bumped && !seen.has(r.at.join(","))) {
        seen.add(r.at.join(","));
        queue.push({ at: r.at, path: [...path, d] });
      }
    }
  }
  return null;
}
