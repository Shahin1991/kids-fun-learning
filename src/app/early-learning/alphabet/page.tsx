"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { ALPHABET } from "@/data/alphabet";
import { audioManager } from "@/lib/audio/AudioManager";
import { finishActivity } from "@/lib/activity";
import type { LetterEngine, LetterMode, LetterSet, Paging } from "@/lib/letter-land/LetterEngine";

const ToyGame = dynamic(() => import("@/components/toy3d/ToyGame"), { ssr: false, loading: () => <LoadingSpinner /> });

const ITEMS = [...ALPHABET.map((a) => ({ id: a.letter, label: a.letter })), ..."1234567890".split("").map((d) => ({ id: d, label: d }))];

const BTN = "min-h-touch min-w-touch rounded-3xl px-3 text-2xl font-bold shadow active:scale-95 sm:px-5";

export default function AlphabetPage() {
  const reduced = useAppReducedMotion();
  const [mode, setMode] = useState<LetterMode>("learn");
  const [set, setSet] = useState<LetterSet>("letters");
  const [paging, setPaging] = useState<Paging>({ show: false, label: "", canPrev: false, canNext: false });
  return (
    <ToyGame
      title="ABC & 123"
      moduleId="alphabet"
      items={ITEMS}
      create={async (container) => {
        const { LetterEngine } = await import("@/lib/letter-land/LetterEngine");
        return new LetterEngine(container, {
          reducedMotion: reduced,
          onPaging: setPaging,
          onSelect: ({ spoken, index }) => {
            audioManager.playNote(index % 10);
            audioManager.speak(spoken);
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
      {(engine) => {
        const e = engine as LetterEngine | null;
        return (
          <>
            <div className="absolute inset-x-0 top-20 flex justify-center gap-2 px-2">
              {(["learn", "trace"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  aria-label={m === "learn" ? "Learn" : "Trace it"}
                  onClick={() => {
                    setMode(m);
                    e?.setMode(m);
                  }}
                  className={`${BTN} ${mode === m ? "bg-kid-blue text-white" : "bg-surface/90 text-foreground"}`}
                >
                  {m === "learn" ? "👀" : "✏️"}<span className="hidden sm:inline">{m === "learn" ? " Learn" : " Trace it!"}</span>
                </button>
              ))}
              {(["letters", "numbers"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={set === s}
                  onClick={() => {
                    setSet(s);
                    e?.setSet(s);
                  }}
                  className={`${BTN} ${set === s ? "bg-kid-green text-white" : "bg-surface/90 text-foreground"}`}
                >
                  {s === "letters" ? "ABC" : "123"}
                </button>
              ))}
            </div>
            {paging.show && (
              <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-3">
                <button type="button" aria-label="Previous" disabled={!paging.canPrev} onClick={() => e?.prev()} className={`${BTN} bg-kid-orange text-white disabled:opacity-40`}>
                  ◀
                </button>
                <span className="min-w-28 rounded-full bg-surface/90 px-4 py-2 text-center text-2xl font-extrabold text-foreground shadow">{paging.label}</span>
                <button type="button" aria-label="Next" disabled={!paging.canNext} onClick={() => e?.next()} className={`${BTN} bg-kid-orange text-white disabled:opacity-40`}>
                  ▶
                </button>
              </div>
            )}
          </>
        );
      }}
    </ToyGame>
  );
}
