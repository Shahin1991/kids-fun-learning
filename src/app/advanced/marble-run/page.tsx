"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const SportsGame = dynamic(() => import("@/components/sports3d/SportsGame"), { ssr: false, loading: () => <LoadingSpinner /> });

export default function MarbleRunPage() {
  return (
    <SportsGame
      title="Marble Run"
      moduleId="marble-run"
      opponents={["solo"]}
      levelLabel="Ghost hints"
      variant={{ label: "Puzzles", options: [{ id: "3", text: "3" }, { id: "4", text: "4" }], initial: "3" }}
      hint="Drag a ramp, tap it to tilt, then tap the marble"
      make={async (el, opts) => new (await import("@/lib/physics-play/MarbleRunEngine")).MarbleRunEngine(el, opts)}
    />
  );
}
