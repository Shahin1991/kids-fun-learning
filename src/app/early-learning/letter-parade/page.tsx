"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { audioManager } from "@/lib/audio/AudioManager";
import { finishActivity } from "@/lib/activity";

const ParadeGame = dynamic(() => import("@/components/parade/ParadeGame"), {
  ssr: false,
  loading: () => <LoadingSpinner />,
});

export default function LetterParadePage() {
  const router = useRouter();
  const reduced = useAppReducedMotion();
  return (
    <div className="h-dvh w-full">
      <ParadeGame
        className="h-full w-full"
        reducedMotion={reduced}
        onExit={() => router.push("/")}
        onPrompt={({ char, mode }) => audioManager.speak(`Find the ${mode === "letters" ? "letter" : "number"} ${char}`)}
        onCorrect={({ char, streak }) => {
          audioManager.play("success");
          audioManager.speak(`Yay! ${char}!`);
          if (streak % 5 === 0) void finishActivity("letter-parade", { score: streak });
        }}
        onWrong={() => audioManager.play("failure")}
      />
    </div>
  );
}
