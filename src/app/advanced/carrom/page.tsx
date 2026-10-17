"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const SportsGame = dynamic(() => import("@/components/sports3d/SportsGame"), { ssr: false, loading: () => <LoadingSpinner /> });

export default function CarromPage() {
  return (
    <SportsGame
      title="Carrom"
      moduleId="carrom"
      opponents={["robot", "friend", "solo"]}
      variant={{ label: "Coins", options: [{ id: "quick", text: "⚡ Quick (7)" }, { id: "full", text: "🎯 Full (19)" }], initial: "quick" }}
      hint="Drag the striker along your line, then pull back from it and let go"
      make={async (el, opts) => new (await import("@/lib/sports3d/CarromEngine")).CarromEngine(el, opts)}
    />
  );
}
