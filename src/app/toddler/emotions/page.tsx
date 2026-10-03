"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { EMOTIONS } from "@/data/emotions";
import { audioManager } from "@/lib/audio/AudioManager";
import { finishActivity } from "@/lib/activity";

const ToyGame = dynamic(() => import("@/components/toy3d/ToyGame"), { ssr: false, loading: () => <LoadingSpinner /> });

const ITEMS = EMOTIONS.map((e) => ({ id: e.id, label: e.label }));

export default function EmotionsPage() {
  const reduced = useAppReducedMotion();
  return (
    <ToyGame
      title="Feelings"
      moduleId="emotions"
      items={ITEMS}
      create={async (container) => {
        const { FeelingsEngine } = await import("@/lib/feelings/FeelingsEngine");
        return new FeelingsEngine(container, {
          reducedMotion: reduced,
          onTap: ({ index, label, phrase }) => {
            audioManager.playNote(index % 10);
            audioManager.speak(`${label}. ${phrase}`);
          },
          onMilestone: ({ found }) => void finishActivity("emotions", { score: found }),
        });
      }}
    />
  );
}
