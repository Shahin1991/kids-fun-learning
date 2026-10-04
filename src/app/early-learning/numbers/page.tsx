"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { audioManager } from "@/lib/audio/AudioManager";
import { finishActivity } from "@/lib/activity";

const ToyGame = dynamic(() => import("@/components/toy3d/ToyGame"), { ssr: false, loading: () => <LoadingSpinner /> });

const ITEMS = Array.from({ length: 10 }, (_, i) => ({ id: String(i + 1), label: String(i + 1) }));

export default function NumbersPage() {
  const reduced = useAppReducedMotion();
  return (
    <ToyGame
      title="Numbers"
      moduleId="numbers"
      items={ITEMS}
      create={async (container) => {
        const { CountingEngine } = await import("@/lib/counting-garden/CountingEngine");
        return new CountingEngine(container, {
          reducedMotion: reduced,
          onPrompt: ({ spoken }) => audioManager.speak(spoken),
          onCount: ({ n }) => {
            audioManager.playNote(Math.min(9, n - 1));
            audioManager.speak(String(n));
          },
          onCorrect: ({ answer, total }) => {
            audioManager.play("success");
            audioManager.speak(`${answer}! Great counting!`);
            if (total % 5 === 0) void finishActivity("numbers", { score: total });
          },
          onWrong: () => audioManager.play("failure"),
        });
      }}
    />
  );
}
