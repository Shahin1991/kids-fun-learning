"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { setAppPaused } from "@/lib/app-pause";
import { audioManager } from "@/lib/audio/AudioManager";
import { makeProblem, type AdditionProblem } from "@/lib/play-timer/problem";
import { extend, freshState, isTimeUp, loadState, mergeStates, readSaved, saveState, type PlayTimerState } from "@/lib/play-timer/state";
import { verifyPin } from "@/lib/storage/pin";
import { getSettings, SETTINGS_CHANGED } from "@/lib/storage/settings";
import { ShakeOnWrong } from "./ShakeOnWrong";

const GAME_ROUTES = /^\/(toddler|early-learning|advanced|others)\//;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✓"];
const KEY_LABELS: Record<string, string> = { "⌫": "Delete", "✓": "Done" };

function Keypad({ value, onChange, onSubmit }: { value: string; onChange: (v: string) => void; onSubmit: () => void }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {KEYS.map((k, i) => (
        <button
          key={k}
          type="button"
          autoFocus={i === 0}
          aria-label={KEY_LABELS[k] ?? k}
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
  const overlayRef = useRef<HTMLDivElement>(null);
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

  /** Pull in what other tabs saved, so the limit holds across tabs. */
  const syncFromStorage = useCallback(() => {
    const mine = stateRef.current;
    const saved = readSaved();
    if (!mine || !saved || saved.limitMin !== mine.limitMin) return;
    const merged = mergeStates(mine, saved);
    stateRef.current = merged;
    setState(merged);
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
    const onVisible = () => document.visibilityState === "visible" && syncFromStorage();
    window.addEventListener(SETTINGS_CHANGED, load);
    window.addEventListener("storage", syncFromStorage);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(SETTINGS_CHANGED, load);
      window.removeEventListener("storage", syncFromStorage);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [commit, syncFromStorage]);

  // Tick once a second while a game is open and the tab is visible.
  useEffect(() => {
    if (!inGame || !limitMin) return;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const dt = now - last;
      last = now;
      if (document.visibilityState !== "visible") return;
      syncFromStorage();
      const s = stateRef.current;
      if (!s || isTimeUp(s)) return;
      commit({ ...s, usedMs: Math.min(s.usedMs + Math.min(dt, 2000), s.allowanceMs) });
    }, 1000);
    return () => clearInterval(id);
  }, [inGame, limitMin, commit, syncFromStorage]);

  const locked = inGame && !!state && isTimeUp(state);

  useEffect(() => {
    if (!locked || !state) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProblem((p) => p ?? makeProblem(state.level));
  }, [locked, state]);

  // While locked, nothing underneath may run or be reached: pause loops, silence audio, make the page inert, swallow keys.
  useEffect(() => {
    if (!locked) return;
    setAppPaused(true);
    const musicWasOn = audioManager.isMusicOn;
    audioManager.setMusic(false);
    audioManager.stopSpeech();
    const overlayRoot = overlayRef.current;
    const others = Array.from(document.body.children).filter((el) => el !== overlayRoot && !el.hasAttribute("inert")) as HTMLElement[];
    others.forEach((el) => el.setAttribute("inert", ""));
    const swallow = (e: KeyboardEvent) => {
      if (overlayRoot?.contains(e.target as Node)) return;
      e.stopImmediatePropagation();
      e.preventDefault();
    };
    window.addEventListener("keydown", swallow, true);
    window.addEventListener("keyup", swallow, true);
    return () => {
      others.forEach((el) => el.removeAttribute("inert"));
      window.removeEventListener("keydown", swallow, true);
      window.removeEventListener("keyup", swallow, true);
      setAppPaused(false);
      if (musicWasOn) audioManager.setMusic(true);
    };
  }, [locked]);

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
    let ok = false;
    try {
      const s = await getSettings();
      ok = await verifyPin(pin, s.pinSalt, s.pinHash);
    } catch {
      ok = false;
    }
    if (ok && limitMin) {
      commit(freshState(limitMin));
      setProblem(null);
      setParentMode(false);
    } else setWobble((n) => n + 1);
    setPin("");
  };

  return (
    <div ref={overlayRef} role="dialog" aria-modal="true" aria-label="Time is up" className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 overflow-auto bg-background/95 p-4 text-center">
      <div className="text-6xl" aria-hidden>⏰</div>
      <h2 className="text-3xl font-extrabold">Time is up!</h2>
      {parentMode ? (
        <>
          <p>Parent: enter your PIN to restart the timer</p>
          <ShakeOnWrong trigger={wobble}>
            <div aria-live="polite" className="flex h-16 min-w-48 items-center justify-center rounded-2xl bg-surface text-4xl tracking-widest shadow">
              <span aria-hidden>{"•".repeat(pin.length) || " "}</span>
              <span className="sr-only">{pin.length} digits entered</span>
            </div>
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
