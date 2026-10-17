/** Shared contract between the 3D sports engines (carrom, snooker, darts, archery) and the React shell. */

export type Opponent = "robot" | "friend" | "solo";
export type SportLevel = "easy" | "medium" | "hard";

export interface SportPlayer {
  name: string;
  icon: string;
  score: number;
}

export interface SportHud {
  players: SportPlayer[];
  /** Index of the player whose turn it is. */
  turn: number;
  /** Big status line, e.g. "Pot a red 🔴". */
  message: string;
  /** Smaller line under it, e.g. "20 + 5 + 1 = 26". */
  detail?: string;
  /** Spoken aloud when it changes (kept short). */
  say?: string;
}

export interface SportResult {
  /** Winning player index, or null for a draw / solo game. */
  winner: number | null;
  scores: number[];
  /** Line for the end panel, e.g. "You won! 🎉". */
  text: string;
}

export type SportSoundKind = "clack" | "cushion" | "pot" | "throw" | "thud" | "score" | "foul" | "cheer";

export interface SportSound {
  kind: SportSoundKind;
  /** 0..1 */
  strength: number;
}

export interface SportSetup {
  opponent: Opponent;
  level: SportLevel;
  /** Game-specific length/size choice, e.g. "6" reds or "5" rounds. */
  variant: string;
}

export interface SportOptions extends SportSetup {
  reducedMotion?: boolean;
  onHud: (hud: SportHud) => void;
  onSound: (e: SportSound) => void;
  onGameOver: (r: SportResult) => void;
}

export interface SportEngine {
  resize(): void;
  destroy(): void;
  newGame(setup: SportSetup): void;
}

export function playerList(opponent: Opponent): SportPlayer[] {
  if (opponent === "solo") return [{ name: "You", icon: "🧒", score: 0 }];
  if (opponent === "robot") return [
    { name: "You", icon: "🧒", score: 0 },
    { name: "Robo", icon: "🤖", score: 0 },
  ];
  return [
    { name: "Player 1", icon: "🧒", score: 0 },
    { name: "Player 2", icon: "👧", score: 0 },
  ];
}

export function resultFor(players: SportPlayer[], opponent: Opponent): SportResult {
  const scores = players.map((p) => p.score);
  if (players.length === 1) return { winner: null, scores, text: `You scored ${scores[0]}! 🎉` };
  if (scores[0] === scores[1]) return { winner: null, scores, text: "It's a draw! 🤝" };
  const winner = scores[0] > scores[1] ? 0 : 1;
  if (opponent === "robot") return { winner, scores, text: winner === 0 ? "You won! 🎉" : "Robo won this time. Play again! 💪" };
  return { winner, scores, text: `${players[winner].name} wins! 🎉` };
}

/** Normal-ish random number (mean 0, sd 1). */
export function gaussian(rand: () => number = Math.random): number {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}
