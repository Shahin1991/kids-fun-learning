"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { audioManager } from "@/lib/audio/AudioManager";
import { finishActivity } from "@/lib/activity";

const BlockTowerGame = dynamic(() => import("@/components/block-tower/BlockTowerGame"), {
  ssr: false,
  loading: () => <LoadingSpinner />,
});

export default function BlockTowerPage() {
  const router = useRouter();
  const reduced = useAppReducedMotion();
  return (
    <div className="h-dvh w-full">
      <BlockTowerGame
        className="h-full w-full"
        reducedMotion={reduced}
        onExit={() => router.push("/")}
        onSound={({ kind, height, strength }) => {
          // Pitch rises with the tower; tumbles stay low and soft.
          if (kind === "tumble") audioManager.playNote(Math.floor(strength * 2));
          else audioManager.playNote(Math.min(9, 2 + Math.floor(height / 1.2)));
        }}
        onMilestone={({ level }) => void finishActivity("block-tower", { score: level })}
      />
    </div>
  );
}
