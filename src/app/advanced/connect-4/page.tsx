"use client";

import { BoardGameShell } from "@/components/board-games/BoardGameShell";

const COLUMNS = Array.from({ length: 7 }, (_, i) => ({ id: String(i), label: `Column ${i + 1}` }));

export default function Connect4Page() {
  return (
    <BoardGameShell
      title="Connect 4"
      moduleId="connect-4"
      cells={COLUMNS}
      playerHint="Slide to aim, let go to drop ⬇️"
      make={async (container, opts) => {
        const { Connect4Engine } = await import("@/lib/board-games/Connect4Engine");
        return new Connect4Engine(container, opts);
      }}
    />
  );
}
