"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const SportsGame = dynamic(() => import("@/components/sports3d/SportsGame"), { ssr: false, loading: () => <LoadingSpinner /> });

export default function DartsPage() {
  return (
    <SportsGame
      title="Darts"
      moduleId="darts"
      opponents={["robot", "friend", "solo"]}
      variant={{ label: "Rounds", options: [{ id: "3", text: "3" }, { id: "5", text: "5" }, { id: "8", text: "8" }], initial: "5" }}
      hint="Touch to aim, slide to move the target ring, let go to throw"
      make={async (el, opts) => new (await import("@/lib/sports3d/DartsEngine")).DartsEngine(el, opts)}
    />
  );
}
