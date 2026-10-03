"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { audioManager } from "@/lib/audio/AudioManager";
import { finishActivity } from "@/lib/activity";

const BalloonGame = dynamic(() => import("@/components/balloons/BalloonGame"), {
  ssr: false,
  loading: () => <LoadingSpinner />,
});

export default function BalloonPopPage() {
  const router = useRouter();
  const reduced = useAppReducedMotion();
  return (
    <div className="h-dvh w-full">
      <BalloonGame
        className="h-full w-full"
        reducedMotion={reduced}
        onExit={() => router.push("/")}
        onPop={({ index }) => audioManager.playPop(index)}
        onMilestone={({ total }) => void finishActivity("balloon-pop", { score: total })}
      />
    </div>
  );
}
