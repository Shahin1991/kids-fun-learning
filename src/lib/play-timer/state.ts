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
  /** When this allowance started (a new day, a new limit or a parent reset); the newer one wins across tabs. */
  resetAt?: number;
}

const today = () => new Date().toDateString();

export function freshState(limitMin: number): PlayTimerState {
  return { day: today(), limitMin, usedMs: 0, allowanceMs: limitMin * 60_000, level: 0, resetAt: Date.now() };
}

/** The saved state as-is (any day or limit), or null. */
export function readSaved(): PlayTimerState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PlayTimerState) : null;
  } catch {
    return null;
  }
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

/**
 * Combines this tab's state with what another tab saved, keeping the most time used and the most earned,
 * so playing in two tabs never hands out extra time.
 */
export function mergeStates(mine: PlayTimerState, saved: PlayTimerState): PlayTimerState {
  if ((saved.resetAt ?? 0) !== (mine.resetAt ?? 0)) return (saved.resetAt ?? 0) > (mine.resetAt ?? 0) ? saved : mine;
  return {
    ...mine,
    usedMs: Math.max(mine.usedMs, saved.usedMs),
    allowanceMs: Math.max(mine.allowanceMs, saved.allowanceMs),
    level: Math.max(mine.level, saved.level),
  };
}
