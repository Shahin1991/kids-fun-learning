"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { ANIMALS } from "@/data/animals";
import { audioManager } from "@/lib/audio/AudioManager";
import { finishActivity } from "@/lib/activity";

const ToyGame = dynamic(() => import("@/components/toy3d/ToyGame"), { ssr: false, loading: () => <LoadingSpinner /> });

const ITEMS = ANIMALS.map((a) => ({ id: a.id, label: a.label }));

export default function AnimalsPage() {
  const reduced = useAppReducedMotion();
  return (
    <ToyGame
      title="Animals"
      moduleId="animals"
      items={ITEMS}
      create={async (container) => {
        const { MeadowEngine } = await import("@/lib/animals-meadow/MeadowEngine");
        return new MeadowEngine(container, {
          reducedMotion: reduced,
          onTap: ({ index, label, phrase }) => {
            audioManager.playNote(index % 10);
            audioManager.speak(`${label}. ${phrase}`);
          },
          onMilestone: ({ found }) => void finishActivity("animals", { score: found }),
        });
      }}
    />
  );
}
