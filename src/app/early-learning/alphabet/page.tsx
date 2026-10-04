"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { ALPHABET } from "@/data/alphabet";
import { audioManager } from "@/lib/audio/AudioManager";
import { finishActivity } from "@/lib/activity";
import type { LetterEngine, LetterMode } from "@/lib/letter-land/LetterEngine";

const ToyGame = dynamic(() => import("@/components/toy3d/ToyGame"), { ssr: false, loading: () => <LoadingSpinner /> });

const ITEMS = ALPHABET.map((a) => ({ id: a.letter, label: a.letter }));

export default function AlphabetPage() {
  const reduced = useAppReducedMotion();
  const [mode, setMode] = useState<LetterMode>("learn");
  return (
    <ToyGame
      title="Alphabet"
      moduleId="alphabet"
      items={ITEMS}
      create={async (container) => {
        const { LetterEngine } = await import("@/lib/letter-land/LetterEngine");
        return new LetterEngine(container, {
          reducedMotion: reduced,
          onSelect: ({ letter, word, index }) => {
            audioManager.playNote(index % 10);
            audioManager.speak(`${letter}. ${letter} is for ${word}`);
          },
          onTrace: ({ n, total }) => audioManager.playNote(Math.min(9, Math.floor((n / total) * 9))),
          onTraceDone: ({ letter }) => {
            audioManager.play("success");
            audioManager.speak(`Great job! ${letter}!`);
            void finishActivity("alphabet", { score: 1 });
          },
          onMilestone: ({ found }) => void finishActivity("alphabet", { score: found }),
        });
      }}
    >
      {(engine) => (
        <div className="absolute inset-x-0 top-20 flex justify-center gap-3">
          {(["learn", "trace"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => {
                setMode(m);
                (engine as LetterEngine | null)?.setMode(m);
              }}
              className={`min-h-touch rounded-3xl px-6 text-2xl font-bold shadow active:scale-95 ${mode === m ? "bg-kid-blue text-white" : "bg-surface/90 text-foreground"}`}
            >
              {m === "learn" ? "👀 Learn" : "✏️ Trace it!"}
            </button>
          ))}
        </div>
      )}
    </ToyGame>
  );
}
