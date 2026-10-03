"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { audioManager } from "@/lib/audio/AudioManager";
import { finishActivity } from "@/lib/activity";
import type { SizeAsk, SizeEngine, SizeMode } from "@/lib/size-playground/SizeEngine";

const ToyGame = dynamic(() => import("@/components/toy3d/ToyGame"), { ssr: false, loading: () => <LoadingSpinner /> });

export default function SizesPage() {
  const reduced = useAppReducedMotion();
  const [mode, setMode] = useState<SizeMode>("tap");
  const [ask, setAsk] = useState<SizeAsk | null>("big");
  const [streak, setStreak] = useState(0);

  return (
    <ToyGame
      title="Big or Small"
      moduleId="sizes"
      create={async (container) => {
        const { SizeEngine } = await import("@/lib/size-playground/SizeEngine");
        return new SizeEngine(container, {
          reducedMotion: reduced,
          onPrompt: ({ ask: a, mode: m, streak: s }) => {
            setAsk(a);
            setStreak(s);
            audioManager.speak(m === "tap" ? `Tap the ${a} one!` : "Put them in order, small to big");
          },
          onCorrect: ({ streak: s }) => {
            setStreak(s);
            audioManager.playNote(Math.min(9, s + 2));
          },
          onWrong: () => audioManager.play("failure"),
          onRound: ({ streak: s }) => {
            if (s > 0 && s % 5 === 0) void finishActivity("sizes", { score: s });
            else if (s === 0) void finishActivity("sizes");
          },
        });
      }}
    >
      {(engine) => (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-20 flex justify-center">
            <p role="status" className="rounded-full bg-surface/95 px-6 py-2 text-3xl font-extrabold text-foreground shadow">
              {mode === "tap" ? `Tap the ${ask === "small" ? "SMALL" : "BIG"} one!  🔥 ${streak}` : "Small ➜ Big: put them on the steps"}
            </p>
          </div>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-3">
            {(["tap", "sort"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => {
                  setMode(m);
                  (engine as SizeEngine | null)?.setMode(m);
                }}
                className={`min-h-touch rounded-3xl px-6 text-2xl font-bold shadow active:scale-95 ${mode === m ? "bg-kid-green text-white" : "bg-surface/90 text-foreground"}`}
              >
                {m === "tap" ? "🐘 Big or Small" : "🪜 Sort Them"}
              </button>
            ))}
          </div>
        </>
      )}
    </ToyGame>
  );
}
