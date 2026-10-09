"use client";

import { DiceGameShell } from "@/components/board-games/DiceGameShell";

export default function LudoPage() {
  return (
    <DiceGameShell
      title="Ludo"
      moduleId="ludo"
      showLevel
      make={async (container, opts) => {
        const { LudoEngine } = await import("@/lib/board-games/LudoEngine");
        return new LudoEngine(container, opts);
      }}
    />
  );
}
