"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { audioManager } from "@/lib/audio/AudioManager";
import { finishActivity } from "@/lib/activity";
import { generateRacerQuestion, type RacerQuestion } from "@/lib/math/racer-questions";
import type { RacerEngine } from "@/lib/math-racer/RacerEngine";

const ToyGame = dynamic(() => import("@/components/toy3d/ToyGame"), { ssr: false, loading: () => <LoadingSpinner /> });

const FINISH = 10;
const CHOICE_COLORS = ["bg-kid-orange", "bg-kid-blue", "bg-kid-green", "bg-kid-purple"];
const MODE_KEY = "math-racer-players";
const PLAYER = [
  { name: "Player 1", emoji: "🔴", ring: "ring-red-400", bg: "bg-red-500", dot: "bg-red-400" },
  { name: "Player 2", emoji: "🔵", ring: "ring-blue-400", bg: "bg-blue-500", dot: "bg-blue-400" },
];

type Mode = 1 | 2;

export default function MathRacerPage() {
  const reduced = useAppReducedMotion();
  const [mode, setMode] = useState<Mode>(1);
  const [progress, setProgress] = useState<[number, number]>([0, 0]);
  const [questions, setQuestions] = useState<[RacerQuestion, RacerQuestion]>(() => [generateRacerQuestion(0), generateRacerQuestion(0)]);
  const [winner, setWinner] = useState<number | null>(null);
  const [won, setWon] = useState(false);
  const [shake, setShake] = useState<{ p: number; value: number; n: number }>({ p: 0, value: -1, n: 0 });
  const engine = useRef<RacerEngine | null>(null);
  const modeRef = useRef<Mode>(1);
  const prog = useRef<[number, number]>([0, 0]);
  const over = useRef(false);

  // Remember the last choice (read after mount so the server and first render agree).
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (localStorage.getItem(MODE_KEY) === "2") {
          modeRef.current = 2;
          setMode(2);
          engine.current?.setPlayers(2);
        }
      } catch {
        // storage blocked: one player is fine
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const resetRace = useCallback(() => {
    prog.current = [0, 0];
    over.current = false;
    setProgress([0, 0]);
    setQuestions([generateRacerQuestion(0), generateRacerQuestion(0)]);
    setWinner(null);
    setWon(false);
    engine.current?.reset();
  }, []);

  const pickMode = (m: Mode) => {
    modeRef.current = m;
    setMode(m);
    try {
      localStorage.setItem(MODE_KEY, String(m));
    } catch {
      // ignore
    }
    audioManager.play("success");
    engine.current?.setPlayers(m);
    resetRace();
  };

  const answer = (p: number, value: number) => {
    if (over.current) return;
    if (value !== questions[p].answer) {
      // A wrong answer only wiggles the car; it keeps its speed and position.
      audioManager.play("failure");
      engine.current?.wobble(p);
      setShake((s) => ({ p, value, n: s.n + 1 }));
      return;
    }
    const next = prog.current[p] + 1;
    prog.current = p === 0 ? [next, prog.current[1]] : [prog.current[0], next];
    setProgress(prog.current);
    engine.current?.setProgress(p, next);
    audioManager.playNote(Math.min(9, next - 1) + (p === 1 ? 1 : 0));
    if (next >= FINISH) {
      over.current = true;
      setWinner(p);
      engine.current?.finish(p);
      void finishActivity("math-racer", { score: next, variant: modeRef.current === 2 ? "2p" : undefined });
    } else {
      engine.current?.boost(p);
      setQuestions((qs) => (p === 0 ? [generateRacerQuestion(next), qs[1]] : [qs[0], generateRacerQuestion(next)]));
    }
  };

  const panel = (p: number, compact: boolean) => {
    const q = questions[p];
    return (
      <div key={p} className={`pointer-events-auto flex min-w-0 flex-1 flex-col items-center gap-2 rounded-3xl bg-surface/90 p-2 shadow-xl ring-4 ${compact ? PLAYER[p].ring : "ring-transparent"}`}>
        {compact && <p className="text-lg font-extrabold">{PLAYER[p].emoji} {PLAYER[p].name}</p>}
        <AnimatePresence mode="wait">
          <motion.p
            key={q.prompt + progress[p]}
            initial={reduced ? false : { y: 24, opacity: 0, scale: 0.85 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className={`rounded-full bg-background px-4 py-1 text-center font-extrabold ${compact ? "text-3xl" : "text-5xl"}`}
            aria-live="polite"
          >
            {q.prompt} = ?
          </motion.p>
        </AnimatePresence>
        <div className={compact ? "grid w-full grid-cols-2 gap-2" : "flex flex-wrap justify-center gap-3"}>
          {q.choices.map((c, i) => (
            <motion.button
              key={`${q.prompt}-${c}`}
              type="button"
              aria-label={`${compact ? PLAYER[p].name + ": " : ""}${c}`}
              onClick={() => answer(p, c)}
              initial={reduced ? false : { y: 50, opacity: 0 }}
              animate={shake.p === p && shake.value === c ? { y: 0, opacity: 1, x: [0, -9, 9, -6, 6, 0] } : { y: 0, opacity: 1, x: 0 }}
              transition={shake.p === p && shake.value === c ? { duration: 0.45 } : { type: "spring", stiffness: 260, damping: 16, delay: i * 0.05 }}
              whileTap={{ scale: 0.9 }}
              className={`rounded-3xl font-extrabold text-white shadow-lg ${CHOICE_COLORS[i % CHOICE_COLORS.length]} ${compact ? "min-h-16 text-4xl" : "min-h-touch min-w-28 px-6 text-5xl"}`}
            >
              {c}
            </motion.button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <ToyGame
      title="Math Racer"
      moduleId="math-racer"
      create={async (container) => {
        const { RacerEngine } = await import("@/lib/math-racer/RacerEngine");
        const e = new RacerEngine(container, {
          reducedMotion: reduced,
          onFinished: () => {
            audioManager.play("reward");
            setWon(true);
          },
        });
        engine.current = e;
        if (modeRef.current === 2) e.setPlayers(2);
        return e;
      }}
    >
      {() => (
        <>
          {/* Mode */}
          <div className="pointer-events-auto absolute left-3 top-[4.6rem] flex gap-1 rounded-full bg-surface/90 p-1 shadow-lg" role="group" aria-label="Number of players">
            {([1, 2] as const).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => pickMode(m)} className={`min-h-11 rounded-full px-3 text-lg font-bold active:scale-95 ${mode === m ? "bg-kid-blue text-white" : ""}`}>
                {m === 1 ? "🧒 1" : "🧒🧒 2"}
              </button>
            ))}
          </div>

          {/* Progress: one flag per question */}
          <div className="pointer-events-none absolute inset-x-0 top-20 flex flex-col items-center gap-1 px-3" aria-label={mode === 1 ? `${progress[0]} of ${FINISH} done` : `Player 1 ${progress[0]}, Player 2 ${progress[1]} of ${FINISH}`}>
            {Array.from({ length: mode }, (_, p) => (
              <div key={p} className="flex justify-center gap-1.5">
                {Array.from({ length: FINISH }, (_, i) => (
                  <motion.span
                    key={i}
                    animate={i < progress[p] ? { scale: [1, 1.5, 1], rotate: [0, -12, 0] } : { scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className={`flex items-center justify-center rounded-full text-xs shadow ${mode === 2 ? "h-5 w-5" : "h-7 w-7 text-sm"} ${i < progress[p] ? (mode === 2 ? PLAYER[p].dot : "bg-kid-yellow") : "bg-surface/80"}`}
                  >
                    {i < progress[p] ? (mode === 2 ? "" : "⭐") : i === FINISH - 1 ? "🏁" : ""}
                  </motion.span>
                ))}
              </div>
            ))}
          </div>

          {won ? (
            <motion.div initial={reduced ? false : { scale: 0, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 220, damping: 14 }} className="absolute inset-x-0 bottom-8 mx-auto flex w-fit max-w-[92vw] flex-col items-center gap-3 rounded-3xl bg-surface/95 px-8 py-5 text-center shadow-xl" role="status">
              <p className="text-4xl font-extrabold">{mode === 2 && winner !== null ? `🏆 ${PLAYER[winner].name} wins!` : "🏆 You won the race!"}</p>
              <button type="button" onClick={resetRace} className="min-h-touch rounded-3xl bg-kid-blue px-8 text-2xl font-bold text-white shadow active:scale-95">
                Race again
              </button>
            </motion.div>
          ) : mode === 1 ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center gap-3 px-3">{panel(0, false)}</div>
          ) : (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex gap-2 px-2">
              {panel(0, true)}
              {panel(1, true)}
            </div>
          )}
        </>
      )}
    </ToyGame>
  );
}
