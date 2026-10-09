import type { ToyEngine } from "@/lib/toy3d/ToyScene";
import type { GameLevel } from "./types";

export interface DicePlayer {
  name: string;
  emoji: string;
  /** CSS colour used for the player chip */
  color: string;
  info: string;
  human: boolean;
}

export interface DiceState {
  players: DicePlayer[];
  current: number;
  canRoll: boolean;
  /** The child must tap one of their glowing pawns */
  choosing: boolean;
  message: string;
  winner: number | null;
  rolled: number | null;
}

export type DiceSound = "roll" | "hop" | "up" | "down" | "capture" | "home" | "win" | "lose" | "pass";

export interface DiceOptions {
  reducedMotion?: boolean;
  players?: number;
  level?: GameLevel;
  onState?: (s: DiceState) => void;
  onSound?: (k: DiceSound, n?: number) => void;
  onResult?: (r: { result: "win" | "lose"; players: number; level: GameLevel }) => void;
}

export interface DiceEngine extends ToyEngine {
  newGame(cfg: { players: number; level: GameLevel }): void;
  roll(): void;
}
