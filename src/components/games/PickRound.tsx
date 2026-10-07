"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ShakeOnWrong } from "@/components/ShakeOnWrong";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { audioManager } from "@/lib/audio/AudioManager";
import { finishActivity } from "@/lib/activity";

export interface PickChoice {
  id: string;
  node: ReactNode;
  /** Used for screen readers and when speaking a wrong answer back */
  label: string;
}

export interface PickRoundData {
  /** Big picture shown above the choices */
  prompt: ReactNode;
  /** Spoken (and re-spoken on tap or after a pause) */
  say: string;
  choices: PickChoice[];
  answerId: string;
  /** Kind, explanatory feedback for a wrong pick */
  wrongSay?: (picked: PickChoice) => string;
  /** Spoken after a right pick */
  praise?: string;
}

const CHEERS = ["Great job!", "You got it!", "Awesome!", "Super!", "Well done!", "Yes!"];
const IDLE_MS = 9000;

/**
 * One-question-at-a-time game shell for non-readers: the question is spoken, repeated after a pause,
 * wrong answers get a kind explanation (never a buzzer), and after two misses the answer gently glows.
 */
export function PickRound({ moduleId, makeRound, starEvery = 5 }: { moduleId: string; makeRound: (streak: number) => PickRoundData; starEvery?: number }) {
  const reduced = useAppReducedMotion();
  const [streak, setStreak] = useState(0);
  const [round, setRound] = useState<PickRoundData | null>(null);
  const [misses, setMisses] = useState(0);
  const [wobble, setWobble] = useState({ id: "", n: 0 });
  const [done, setDone] = useState<string | null>(null);
  const idle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const ask = useCallback((r: PickRoundData) => audioManager.speak(r.say), []);

  const arm = useCallback(
    (r: PickRoundData) => {
      clearTimeout(idle.current);
      idle.current = setTimeout(() => {
        ask(r);
        setMisses((m) => Math.max(m, 2));
      }, IDLE_MS);
    },
    [ask],
  );

  const next = useCallback(
    (s: number) => {
      const r = makeRound(s);
      const lead = s === 0 ? 1600 : 450;
      setRound(r);
      setMisses(0);
      setDone(null);
      // Wait a beat so the speech from the previous answer is not cut off mid-word.
      setTimeout(() => ask(r), lead);
      arm(r);
    },
    [makeRound, ask, arm],
  );

  useEffect(() => {
    const t = setTimeout(() => next(0), 0);
    return () => {
      clearTimeout(t);
      clearTimeout(idle.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!round) return null;

  const pick = (c: PickChoice) => {
    if (done) return;
    if (c.id !== round.answerId) {
      audioManager.play("failure");
      audioManager.speak(round.wrongSay ? round.wrongSay(c) : `Not quite. ${round.say}`);
      setWobble((w) => ({ id: c.id, n: w.n + 1 }));
      setMisses((m) => m + 1);
      arm(round);
      return;
    }
    clearTimeout(idle.current);
    const s = streak + 1;
    setStreak(s);
    setDone(c.id);
    audioManager.playNote(Math.min(9, s));
    audioManager.speak(`${round.praise ?? ""} ${CHEERS[s % CHEERS.length]}`.trim());
    if (s % starEvery === 0) void finishActivity(moduleId, { score: s });
    setTimeout(() => next(s), 1700);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8">
      <motion.button
        key={round.say}
        type="button"
        onClick={() => ask(round)}
        aria-label="Hear the question again"
        initial={reduced ? false : { scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex min-h-touch items-center gap-3 rounded-3xl bg-surface px-8 py-5 text-5xl font-extrabold shadow-md active:scale-95"
      >
        <span aria-hidden>🔊</span>
        {round.prompt}
      </motion.button>
      <div className="flex flex-wrap justify-center gap-5">
        {round.choices.map((c) => {
          const hint = misses >= 2 && c.id === round.answerId && !done;
          return (
            <ShakeOnWrong key={c.id} trigger={wobble.id === c.id ? wobble.n : 0}>
              <button
                type="button"
                aria-label={c.label}
                onClick={() => pick(c)}
                className={`flex min-h-40 min-w-40 items-center justify-center rounded-3xl bg-surface p-4 text-7xl font-extrabold shadow-md transition-transform active:scale-90 ${hint && !reduced ? "animate-pulse ring-8 ring-kid-yellow" : ""} ${done === c.id ? "ring-8 ring-kid-green" : ""}`}
              >
                {c.node}
              </button>
            </ShakeOnWrong>
          );
        })}
      </div>
      <AnimatePresence>
        {done && (
          <motion.p initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="text-5xl" role="status" aria-label="Correct">
            🎉⭐🎉
          </motion.p>
        )}
      </AnimatePresence>
      <p className="text-xl font-bold" aria-label={`${streak} in a row`}>🔥 {streak}</p>
    </div>
  );
}

export function shuffled<T>(list: readonly T[]): T[] {
  return [...list].sort(() => Math.random() - 0.5);
}
