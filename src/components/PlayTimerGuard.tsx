"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { makeProblem, type AdditionProblem } from "@/lib/play-timer/problem";
import { extend, freshState, isTimeUp, loadState, saveState, type PlayTimerState } from "@/lib/play-timer/state";
import { verifyPin } from "@/lib/storage/pin";
import { getSettings } from "@/lib/storage/settings";
import { ShakeOnWrong } from "./ShakeOnWrong";

export const PLAY_TIMER_CHANGED = "play-timer-changed";
const GAME_ROUTES = /^\/(toddler|early-learning|advanced|others)\//;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✓"];

function Keypad({ value, onChange, onSubmit }: { value: string; onChange: (v: string) => void; onSubmit: () => void }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => (k === "⌫" ? onChange(value.slice(0, -1)) : k === "✓" ? onSubmit() : value.length < 8 && onChange(value + k))}
          className="min-h-touch min-w-touch rounded-2xl bg-background text-3xl font-bold shadow active:scale-95"
        >
          {k}
        </button>
      ))}
    </div>
  );
}

/** Counts play time on game routes; when it runs out, blocks play until a sum is solved (+5 min) or a parent enters the PIN. */
export function PlayTimerGuard() {
  const pathname = usePathname();
  const inGame = GAME_ROUTES.test(pathname ?? "");
  const [limitMin, setLimitMin] = useState<number | null>(null);
  const [state, setState] = useState<PlayTimerState | null>(null);
  const stateRef = useRef<PlayTimerState | null>(null);
  const [problem, setProblem] = useState<AdditionProblem | null>(null);
  const [answer, setAnswer] = useState("");
  const [wobble, setWobble] = useState(0);
  const [parentMode, setParentMode] = useState(false);
  const [pin, setPin] = useState("");

  const commit = useCallback((s: PlayTimerState | null) => {
    stateRef.current = s;
    setState(s);
    if (s) saveState(s);
  }, []);

  // Load the limit from settings, and again whenever the parent dashboard changes it.
  useEffect(() => {
    const load = () =>
      getSettings()
        .then((s) => {
          const m = s.timerMinutes ?? null;
          setLimitMin(m);
          commit(m ? loadState(m) : null);
        })
        .catch(() => {});
    void load();
    window.addEventListener(PLAY_TIMER_CHANGED, load);
    return () => window.removeEventListener(PLAY_TIMER_CHANGED, load);
  }, [commit]);

  // Tick once a second while a game is open and the tab is visible.
  useEffect(() => {
    if (!inGame || !limitMin) return;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const dt = now - last;
      last = now;
      const s = stateRef.current;
      if (!s || document.visibilityState !== "visible" || isTimeUp(s)) return;
      commit({ ...s, usedMs: Math.min(s.usedMs + Math.min(dt, 2000), s.allowanceMs) });
    }, 1000);
    return () => clearInterval(id);
  }, [inGame, limitMin, commit]);

  const locked = inGame && !!state && isTimeUp(state);

  useEffect(() => {
    if (!locked || !state) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProblem((p) => p ?? makeProblem(state.level));
  }, [locked, state]);

  if (!locked || !state || !problem) return null;

  const solve = () => {
    if (Number(answer) === problem.answer) {
      commit(extend(state));
      setProblem(null);
      setAnswer("");
    } else {
      setWobble((n) => n + 1);
      setAnswer("");
    }
  };

  const parentUnlock = async () => {
    const s = await getSettings();
    if (await verifyPin(pin, s.pinSalt, s.pinHash)) {
      commit(freshState(limitMin!));
      setProblem(null);
      setParentMode(false);
    } else setWobble((n) => n + 1);
    setPin("");
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Time is up" className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 overflow-auto bg-background/95 p-4 text-center">
      <div className="text-6xl" aria-hidden>⏰</div>
      <h2 className="text-3xl font-extrabold">Time is up!</h2>
      {parentMode ? (
        <>
          <p>Parent: enter your PIN to restart the timer</p>
          <ShakeOnWrong trigger={wobble}>
            <div className="flex h-16 min-w-48 items-center justify-center rounded-2xl bg-surface text-4xl tracking-widest shadow">{"•".repeat(pin.length) || " "}</div>
          </ShakeOnWrong>
          <Keypad value={pin} onChange={setPin} onSubmit={parentUnlock} />
          <button type="button" className="min-h-touch underline" onClick={() => { setParentMode(false); setPin(""); }}>Back</button>
        </>
      ) : (
        <>
          <p>Solve this to play 5 more minutes</p>
          <p className="text-5xl font-extrabold" aria-live="polite">{problem.a} + {problem.b} = ?</p>
          <ShakeOnWrong trigger={wobble}>
            <div className="flex h-16 min-w-48 items-center justify-center rounded-2xl bg-surface text-4xl shadow">{answer || " "}</div>
          </ShakeOnWrong>
          <Keypad value={answer} onChange={setAnswer} onSubmit={solve} />
          <button type="button" className="min-h-touch underline" onClick={() => setParentMode(true)}>Ask a parent</button>
        </>
      )}
    </div>
  );
}
