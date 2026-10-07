"use client";

import { BoardGameShell } from "@/components/board-games/BoardGameShell";

const CELLS = Array.from({ length: 9 }, (_, i) => ({ id: String(i), label: `Square ${i + 1}` }));

export default function TicTacToePage() {
  return (
    <BoardGameShell
      title="Tic Tac Toe"
      moduleId="tic-tac-toe"
      cells={CELLS}
      make={async (container, opts) => {
        const { TicTacToeEngine } = await import("@/lib/board-games/TicTacToeEngine");
        return new TicTacToeEngine(container, opts);
      }}
    />
  );
}
