"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { FactItem } from "@/data/facts";
import { audioManager } from "@/lib/audio/AudioManager";
import { finishActivity } from "@/lib/activity";
import { makeChoiceRound } from "@/lib/choice-round";
import { ItemArt } from "./ItemArt";
import { ShakeOnWrong } from "./ShakeOnWrong";

/** Shows a name; the child taps the matching picture. Starts with 2 choices and widens to 4. */
export function ChoiceQuiz({ moduleId, items }: { moduleId: string; items: FactItem[] }) {
  const [streak, setStreak] = useState(0);
  const [round, setRound] = useState(() => makeChoiceRound(items, 0));
  const [burst, setBurst] = useState(0);
  const [wobble, setWobble] = useState({ id: "", n: 0 });

  const pick = (id: string) => {
    if (id !== round.target.id) {
      audioManager.play("failure");
      setWobble((w) => ({ id, n: w.n + 1 }));
      return;
    }
    const next = streak + 1;
    audioManager.playNote(Math.min(9, next));
    audioManager.speak(round.target.label);
    setStreak(next);
    setBurst((b) => b + 1);
    if (next % 5 === 0) void finishActivity(moduleId, { score: next });
    setRound(makeChoiceRound(items, next));
  };

  return (
    <div className="flex flex-1 flex-col items-center gap-6">
      <div className="relative">
        <motion.button key={round.target.id} type="button" onClick={() => audioManager.speak(round.target.label)} initial={{ scale: 0.7, rotate: -4 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 10 }} className="rounded-3xl bg-surface px-6 py-3 text-4xl font-extrabold shadow-md">
          🔊 {round.target.label}
        </motion.button>
        <AnimatePresence>
          {burst > 0 &&
            ["🎉", "⭐", "✨", "🎊", "💫"].map((e, i) => (
              <motion.span key={`${burst}-${i}`} className="pointer-events-none absolute left-1/2 top-1/2 text-3xl" initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }} animate={{ x: (i - 2) * 56, y: -70 - (i % 2) * 30, opacity: 0, scale: 1.2 }} transition={{ duration: 0.9 }} aria-hidden>
                {e}
              </motion.span>
            ))}
        </AnimatePresence>
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        {round.choices.map((c) => (
          <ShakeOnWrong key={c.id} trigger={wobble.id === c.id ? wobble.n : 0}>
            <button type="button" aria-label={c.label} onClick={() => pick(c.id)} className="flex min-h-touch min-w-40 items-center justify-center rounded-3xl bg-surface p-4 shadow-md transition-transform hover:scale-105 active:scale-90">
              <ItemArt art={c.art} emoji={c.emoji} label={c.label} size={96} />
            </button>
          </ShakeOnWrong>
        ))}
      </div>
      <p className="text-xl font-bold">🔥 {streak}</p>
    </div>
  );
}
