/** Who sits where in a game: the first `humans` seats are people (sharing one device), the rest are robots. */
export interface SeatLabel {
  name: string;
  emoji: string;
  human: boolean;
  /** "You" reads as a person speaking to themselves; used to pick "are"/"is" and "Your turn" */
  you: boolean;
}

const HUMAN_EMOJI = ["🐯", "🐼", "🦊", "🐰"];
const BOTS = [
  { name: "Robo", emoji: "🤖" },
  { name: "Froggy", emoji: "🐸" },
  { name: "Unicorn", emoji: "🦄" },
];

export function seatLabel(seat: number, humans: number): SeatLabel {
  if (seat < humans) {
    const you = humans === 1;
    return { name: you ? "You" : `Player ${seat + 1}`, emoji: HUMAN_EMOJI[seat % HUMAN_EMOJI.length], human: true, you };
  }
  const b = BOTS[(seat - humans) % BOTS.length];
  return { ...b, human: false, you: false };
}

/** "You are rolling…" / "Player 2 is rolling…" */
export const is = (l: SeatLabel) => (l.you ? "are" : "is");

/** Keeps the number of people between 1 and the number of seats (and at most 2 for now). */
export const clampHumans = (humans: number, seats: number) => Math.max(1, Math.min(2, humans, seats));
