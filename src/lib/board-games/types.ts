import type { ToyEngine } from "@/lib/toy3d/ToyScene";

export type GameLevel = "easy" | "medium" | "hard";
export type GameStatus = "player" | "bot" | "win" | "lose" | "draw";

export interface BoardOptions {
  reducedMotion?: boolean;
  level?: GameLevel;
  onStatus?: (s: GameStatus) => void;
  /** A disc or mark landed on the board (for sound). */
  onPlace?: (p: { by: "player" | "bot"; n: number }) => void;
  onResult?: (r: { result: "win" | "lose" | "draw"; level: GameLevel }) => void;
}

export interface BoardEngine extends ToyEngine {
  setLevel(level: GameLevel): void;
  newGame(): void;
}
