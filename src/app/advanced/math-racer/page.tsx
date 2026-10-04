"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { audioManager } from "@/lib/audio/AudioManager";
import { finishActivity } from "@/lib/activity";
import { generateRacerQuestion, type RacerQuestion } from "@/lib/math/racer-questions";
import type { RacerEngine } from "@/lib/math-racer/RacerEngine";

const ToyGame = dynamic(() => import("@/components/toy3d/ToyGame"), { ssr: false, loading: () => <LoadingSpinner /> });

const FINISH = 10;
const CHOICE_COLORS = ["bg-kid-orange", "bg-kid-blue", "bg-kid-green", "bg-kid-purple"];

export default function MathRacerPage() {
  const reduced = useAppReducedMotion();
  const [correct, setCorrect] = useState(0);
  const [question, setQuestion] = useState<RacerQuestion>(() => generateRacerQuestion(0));
  const [won, setWon] = useState(false);
  const [shake, setShake] = useState({ value: -1, n: 0 });
  const engine = useRef<RacerEngine | null>(null);

  const answer = (value: number) => {
    if (won || correct >= FINISH) return;
    if (value !== question.answer) {
      // A wrong answer only wiggles the car; it keeps its speed and position.
      audioManager.play("failure");
      engine.current?.wobble();
      setShake((s) => ({ value, n: s.n + 1 }));
      return;
    }
    const next = correct + 1;
    audioManager.playNote(Math.min(9, next - 1));
    setCorrect(next);
    if (next >= FINISH) {
      engine.current?.finish();
      void finishActivity("math-racer", { score: next });
    } else {
      engine.current?.boost();
      setQuestion(generateRacerQuestion(next));
    }
  };

  const restart = () => {
    setCorrect(0);
    setWon(false);
    setQuestion(generateRacerQuestion(0));
    engine.current?.reset();
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
        return e;
      }}
    >
      {() => (
        <>
          {/* Progress: one flag per question */}
          <div className="pointer-events-none absolute inset-x-0 top-20 flex justify-center gap-1.5 px-3" aria-label={`${correct} of ${FINISH} done`}>
            {Array.from({ length: FINISH }, (_, i) => (
              <motion.span
                key={i}
                animate={i < correct ? { scale: [1, 1.5, 1], rotate: [0, -12, 0] } : { scale: 1 }}
                transition={{ duration: 0.4 }}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm shadow ${i < correct ? "bg-kid-yellow" : "bg-surface/80"}`}
              >
                {i < correct ? "⭐" : i === FINISH - 1 ? "🏁" : ""}
              </motion.span>
            ))}
          </div>

          {won ? (
            <motion.div initial={reduced ? false : { scale: 0, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 220, damping: 14 }} className="absolute inset-x-0 bottom-8 mx-auto flex w-fit flex-col items-center gap-3 rounded-3xl bg-surface/95 px-8 py-5 shadow-xl" role="status">
              <p className="text-4xl font-extrabold">🏆 You won the race!</p>
              <button type="button" onClick={restart} className="min-h-touch rounded-3xl bg-kid-blue px-8 text-2xl font-bold text-white shadow active:scale-95">
                Race again
              </button>
            </motion.div>
          ) : (
            <div className="absolute inset-x-0 bottom-4 flex flex-col items-center gap-3 px-3">
              <AnimatePresence mode="wait">
                <motion.p
                  key={question.prompt + correct}
                  initial={reduced ? false : { y: 30, opacity: 0, scale: 0.8 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  className="rounded-full bg-surface/95 px-8 py-2 text-5xl font-extrabold shadow-lg"
                  aria-live="polite"
                >
                  {question.prompt} = ?
                </motion.p>
              </AnimatePresence>
              <div className="flex flex-wrap justify-center gap-3">
                {question.choices.map((c, i) => (
                  <motion.button
                    key={`${question.prompt}-${c}`}
                    type="button"
                    onClick={() => answer(c)}
                    initial={reduced ? false : { y: 60, opacity: 0 }}
                    animate={shake.value === c ? { y: 0, opacity: 1, x: [0, -9, 9, -6, 6, 0] } : { y: 0, opacity: 1, x: 0 }}
                    transition={shake.value === c ? { duration: 0.45 } : { type: "spring", stiffness: 260, damping: 16, delay: i * 0.06 }}
                    whileTap={{ scale: 0.9 }}
                    className={`min-h-touch min-w-28 rounded-3xl px-6 text-5xl font-extrabold text-white shadow-lg ${CHOICE_COLORS[i % CHOICE_COLORS.length]}`}
                  >
                    {c}
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </ToyGame>
  );
}
