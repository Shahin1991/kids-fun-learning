"use client";

import { motion } from "framer-motion";
import { audioManager } from "@/lib/audio/AudioManager";
import type { AgeChoice } from "@/lib/age-pref";

const OPTIONS: { id: AgeChoice; icon: string; label: string; sub: string; color: string }[] = [
  { id: "toddler", icon: "🧸", label: "2 - 3", sub: "years", color: "bg-toddler" },
  { id: "early-learning", icon: "🎨", label: "4 - 6", sub: "years", color: "bg-early" },
  { id: "advanced", icon: "🚀", label: "7 - 8", sub: "years", color: "bg-advanced" },
  { id: "all", icon: "🎮", label: "Show", sub: "everything", color: "bg-others" },
];

/** First-visit question: picking an age opens just that group, so a small child sees a short, familiar list. */
export function AgePicker({ onPick, onClose }: { onPick: (c: AgeChoice) => void; onClose?: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4" role="dialog" aria-label="How old are you?">
      <motion.div initial={{ scale: 0.7, y: 40 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 240, damping: 16 }} className="flex w-full max-w-md flex-col items-center gap-4 rounded-[2rem] bg-surface p-5 text-foreground shadow-2xl">
        <button type="button" onClick={() => audioManager.speak("How old are you? Tap your age!")} aria-label="Hear the question" className="flex items-center gap-3 text-center active:scale-95">
          <span className="animate-float text-6xl" aria-hidden>🦉</span>
          <span className="text-3xl font-extrabold">
            How old are you? <span aria-hidden>🔊</span>
          </span>
        </button>
        <div className="grid w-full grid-cols-2 gap-3">
          {OPTIONS.map((o, i) => (
            <motion.button
              key={o.id}
              type="button"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => onPick(o.id)}
              aria-label={o.id === "all" ? "Show everything" : `${o.label} years old`}
              className={`flex min-h-32 flex-col items-center justify-center gap-1 rounded-3xl p-3 text-ink shadow-lg ${o.color}`}
            >
              <span className="text-6xl" aria-hidden>{o.icon}</span>
              <span className="text-3xl font-extrabold leading-none">{o.label}</span>
              <span className="text-base font-bold opacity-80">{o.sub}</span>
            </motion.button>
          ))}
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="min-h-12 rounded-2xl px-5 text-lg font-bold opacity-70 active:scale-95">
            Close
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
