"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { finishActivity } from "@/lib/activity";

const BalanceScaleGame = dynamic(() => import("@/components/balance-scale/BalanceScaleGame"), {
  ssr: false,
  loading: () => <LoadingSpinner />,
});

export default function BalanceScalePage() {
  const router = useRouter();
  const [challenge, setChallenge] = useState(false);

  return (
    <div className="relative h-dvh w-full">
      <BalanceScaleGame
        className="h-full w-full"
        mode={challenge ? "challenge" : "sandbox"}
        targetWeight={5}
        onExit={() => router.push("/")}
        onBalanced={({ moves }) => {
          // In puzzle mode the engine moves on to the next target itself, after its celebration.
          void finishActivity("balance-scale", { moves });
        }}
      />
      <button
        type="button"
        onClick={() => setChallenge((c) => !c)}
        className="absolute bottom-4 right-4 min-h-touch rounded-3xl bg-surface/90 px-6 text-xl font-bold shadow"
      >
        {challenge ? "🧩 Puzzle mode" : "🎲 Free play"} · switch
      </button>
    </div>
  );
}
