"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const SportsGame = dynamic(() => import("@/components/sports3d/SportsGame"), { ssr: false, loading: () => <LoadingSpinner /> });

export default function PegDropPage() {
  return (
    <SportsGame
      title="Peg Drop"
      moduleId="peg-drop"
      opponents={["solo"]}
      levelLabel="Pegs and cups"
      variant={{ label: "Balls", options: [{ id: "5", text: "5" }, { id: "10", text: "10" }], initial: "5" }}
      hint="Slide along the top, then let go to drop a ball"
      make={async (el, opts) => new (await import("@/lib/physics-play/PegDropEngine")).PegDropEngine(el, opts)}
    />
  );
}
