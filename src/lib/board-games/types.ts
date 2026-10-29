import type { ToyEngine } from "@/lib/toy3d/ToyScene";

export type GameLevel = "easy" | "medium" | "hard";
export type GameStatus = "player" | "bot" | "win" | "lose" | "draw";

export interface BoardOptions {
  reducedMotion?: boolean;
  level?: GameLevel;
  /** Two people share the device: the robot's side ("bot") is played by Player 2. */
  friend?: boolean;
  onStatus?: (s: GameStatus) => void;
  /** A disc or mark landed on the board (for sound). */
  onPlace?: (p: { by: "player" | "bot"; n: number }) => void;
  /** True when there is a move of yours that can be taken back (the 'Oops' button) */
  onUndoable?: (can: boolean) => void;
  onResult?: (r: { result: "win" | "lose" | "draw"; level: GameLevel }) => void;
}

export interface BoardEngine extends ToyEngine {
  setLevel(level: GameLevel): void;
  /** Switch between playing the robot and a friend; starts a new game. */
  setFriend(friend: boolean): void;
  newGame(): void;
  /** Take back your last move and the bot's reply (with a friend: just the last move) */
  undo(): void;
}
