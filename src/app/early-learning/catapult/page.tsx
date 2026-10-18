"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const SportsGame = dynamic(() => import("@/components/sports3d/SportsGame"), { ssr: false, loading: () => <LoadingSpinner /> });

export default function CatapultPage() {
  return (
    <SportsGame
      title="Catapult"
      moduleId="catapult"
      opponents={["solo"]}
      levelLabel="How far away"
      variant={{ label: "Towers", options: [{ id: "3", text: "3" }, { id: "5", text: "5" }], initial: "3" }}
      hint="Pull back anywhere, aim with the dots, let go!"
      make={async (el, opts) => new (await import("@/lib/physics-play/CatapultEngine")).CatapultEngine(el, opts)}
    />
  );
}
