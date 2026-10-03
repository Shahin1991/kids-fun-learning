"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { audioManager } from "@/lib/audio/AudioManager";
import type { PartyEngine, PartyStyle } from "@/lib/party-stage/PartyEngine";

const ToyGame = dynamic(() => import("@/components/toy3d/ToyGame"), { ssr: false, loading: () => <LoadingSpinner /> });

const STYLES: { id: PartyStyle; icon: string; label: string }[] = [
  { id: "firework", icon: "🎆", label: "Fireworks" },
  { id: "confetti", icon: "🎉", label: "Confetti" },
  { id: "bubble", icon: "🫧", label: "Bubbles" },
  { id: "splash", icon: "💦", label: "Splash" },
];

// No stars or achievements on purpose: Tap Party is pure free play.
export default function TapFunPage() {
  const reduced = useAppReducedMotion();
  const [style, setStyle] = useState<PartyStyle>("firework");
  return (
    <ToyGame
      title="Tap Party"
      items={STYLES.map((s) => ({ id: s.id, label: s.label }))}
      create={async (container) => {
        const { PartyEngine } = await import("@/lib/party-stage/PartyEngine");
        return new PartyEngine(container, {
          reducedMotion: reduced,
          onBurst: ({ x }) => audioManager.playNote(Math.round(x * 9)),
        });
      }}
    >
      {(engine) => (
        <>
          <p className="pointer-events-none absolute inset-x-0 top-24 text-center text-3xl font-extrabold text-white/70 drop-shadow">Tap anywhere!</p>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-3">
            {STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-label={s.label}
                aria-pressed={style === s.id}
                onClick={() => {
                  setStyle(s.id);
                  (engine as PartyEngine | null)?.setStyle(s.id);
                }}
                className={`flex min-h-touch min-w-touch items-center justify-center rounded-full text-4xl shadow-lg active:scale-95 ${style === s.id ? "bg-kid-yellow" : "bg-white/90"}`}
              >
                {s.icon}
              </button>
            ))}
          </div>
        </>
      )}
    </ToyGame>
  );
}
