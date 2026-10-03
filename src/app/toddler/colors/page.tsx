"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { COLORS } from "@/data/colors";
import { audioManager } from "@/lib/audio/AudioManager";
import { finishActivity } from "@/lib/activity";

const ToyGame = dynamic(() => import("@/components/toy3d/ToyGame"), { ssr: false, loading: () => <LoadingSpinner /> });

const ITEMS = COLORS.map((c) => ({ id: c.id, label: c.label }));

export default function ColorsPage() {
  const reduced = useAppReducedMotion();
  return (
    <ToyGame
      title="Colors"
      moduleId="colors"
      items={ITEMS}
      create={async (container) => {
        const { PaintEngine } = await import("@/lib/paint-world/PaintEngine");
        return new PaintEngine(container, {
          reducedMotion: reduced,
          onTap: ({ index, label, phrase }) => {
            audioManager.playNote(index * 2);
            audioManager.speak(`${label}. ${phrase}`);
          },
          onMilestone: ({ found }) => void finishActivity("colors", { score: found }),
        });
      }}
    />
  );
}
