"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const SportsGame = dynamic(() => import("@/components/sports3d/SportsGame"), { ssr: false, loading: () => <LoadingSpinner /> });

export default function ArcheryPage() {
  return (
    <SportsGame
      title="Archery"
      moduleId="archery"
      opponents={["robot", "friend", "solo"]}
      variant={{ label: "Ends (3 arrows each)", options: [{ id: "3", text: "3" }, { id: "5", text: "5" }], initial: "3" }}
      hint="Hold to pull the bow until the ring turns green, aim, then let go"
      make={async (el, opts) => new (await import("@/lib/sports3d/ArcheryEngine")).ArcheryEngine(el, opts)}
    />
  );
}
