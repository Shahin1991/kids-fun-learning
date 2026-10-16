export const EXTENSION_MS = 5 * 60 * 1000;
const KEY = "play-timer-v1";

export interface PlayTimerState {
  /** Local date the state belongs to; a new day starts fresh. */
  day: string;
  /** The parent limit (minutes) this state was built for. */
  limitMin: number;
  usedMs: number;
  allowanceMs: number;
  /** How many extensions have been earned; drives problem difficulty. */
  level: number;
}

const today = () => new Date().toDateString();

export function freshState(limitMin: number): PlayTimerState {
  return { day: today(), limitMin, usedMs: 0, allowanceMs: limitMin * 60_000, level: 0 };
}

export function loadState(limitMin: number): PlayTimerState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as PlayTimerState;
      if (s.day === today() && s.limitMin === limitMin) return s;
    }
  } catch {
    // fall through to a fresh state
  }
  return freshState(limitMin);
}

export function saveState(s: PlayTimerState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage unavailable: timer still works for this page load
  }
}

export const isTimeUp = (s: PlayTimerState) => s.usedMs >= s.allowanceMs;

export function extend(s: PlayTimerState): PlayTimerState {
  return { ...s, allowanceMs: s.allowanceMs + EXTENSION_MS, level: s.level + 1 };
}
