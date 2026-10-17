"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const SportsGame = dynamic(() => import("@/components/sports3d/SportsGame"), { ssr: false, loading: () => <LoadingSpinner /> });

export default function SnookerPage() {
  return (
    <SportsGame
      title="Snooker"
      moduleId="snooker"
      opponents={["robot", "friend", "solo"]}
      variant={{ label: "Reds", options: [{ id: "3", text: "3" }, { id: "6", text: "6" }, { id: "10", text: "10" }, { id: "15", text: "15" }], initial: "6" }}
      hint="Pull back from the white ball like a slingshot, then let go"
      make={async (el, opts) => new (await import("@/lib/sports3d/SnookerEngine")).SnookerEngine(el, opts)}
    />
  );
}
