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
  const [target, setTarget] = useState(5);

  return (
    <div className="relative h-dvh w-full">
      <BalanceScaleGame
        className="h-full w-full"
        mode={challenge ? "challenge" : "sandbox"}
        targetWeight={target}
        onExit={() => router.push("/")}
        onBalanced={({ moves }) => {
          void finishActivity("balance-scale", { moves });
          if (challenge) setTimeout(() => setTarget((t) => Math.min(20, t + 1 + Math.floor(Math.random() * 3))), 0);
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
