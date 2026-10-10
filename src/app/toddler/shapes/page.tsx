"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { SHAPES } from "@/data/shapes";
import { audioManager } from "@/lib/audio/AudioManager";
import { finishActivity } from "@/lib/activity";

const ToyGame = dynamic(() => import("@/components/toy3d/ToyGame"), { ssr: false, loading: () => <LoadingSpinner /> });

const ITEMS = SHAPES.map((s) => ({ id: s.id, label: s.label }));

export default function ShapesPage() {
  const reduced = useAppReducedMotion();
  return (
    <ToyGame
      title="Shapes"
      moduleId="shapes"
      items={ITEMS}
      create={async (container) => {
        const { SorterEngine } = await import("@/lib/shape-sorter/SorterEngine");
        return new SorterEngine(container, {
          reducedMotion: reduced,
          onPlaced: ({ label, index }) => {
            audioManager.playNote(index * 2 + 1);
            audioManager.speak(label);
          },
          onWrong: () => audioManager.play("failure"),
          onRound: ({ round }) => void finishActivity("shapes", { score: round }),
        });
      }}
    >
      {() => <p className="pointer-events-none absolute inset-x-0 bottom-4 px-6 text-center text-lg font-bold leading-snug text-slate-700 drop-shadow sm:text-xl">Drag each shape to its hole, or just tap it!</p>}
    </ToyGame>
  );
}
