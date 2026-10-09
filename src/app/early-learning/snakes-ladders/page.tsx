"use client";

import { DiceGameShell } from "@/components/board-games/DiceGameShell";

export default function SnakesLaddersPage() {
  return (
    <DiceGameShell
      title="Snakes & Ladders"
      moduleId="snakes-ladders"
      make={async (container, opts) => {
        const { SnakesLaddersEngine } = await import("@/lib/board-games/SnakesLaddersEngine");
        return new SnakesLaddersEngine(container, opts);
      }}
    />
  );
}
