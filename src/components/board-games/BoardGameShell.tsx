"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { audioManager } from "@/lib/audio/AudioManager";
import { finishActivity } from "@/lib/activity";
import { ChipRow, GameSettings } from "./GameSettings";
import type { BoardEngine, GameLevel, GameStatus } from "@/lib/board-games/types";
import type { ToyEngine } from "@/lib/toy3d/ToyScene";

const ToyGame = dynamic(() => import("@/components/toy3d/ToyGame"), { ssr: false, loading: () => <LoadingSpinner /> });

const LEVELS: { id: GameLevel; icon: string; label: string }[] = [
  { id: "easy", icon: "🐣", label: "Easy" },
  { id: "medium", icon: "🐱", label: "Medium" },
  { id: "hard", icon: "🦁", label: "Hard" },
];

const STATUS: Record<GameStatus, { text: string; say?: string }> = {
  player: { text: "Your turn! 👆", say: "Your turn!" },
  bot: { text: "Robo is thinking… 🤔" },
  win: { text: "You won! 🎉", say: "You won! Hooray!" },
  lose: { text: "Good try! Play again 💪", say: "Good try! Let's play again!" },
  draw: { text: "It's a draw! 🤝", say: "A draw! Well played!" },
};

const KEY = "board-game-level";

type Make = (container: HTMLElement, opts: import("@/lib/board-games/types").BoardOptions) => Promise<BoardEngine>;

/** Shared page for the bot board games: 3D canvas, status pill, difficulty chips and a new-game button. */
export function BoardGameShell({ title, moduleId, make, cells, playerHint }: { title: string; moduleId: string; make: Make; cells: { id: string; label: string }[]; playerHint?: string }) {
  const reduced = useAppReducedMotion();
  const [status, setStatus] = useState<GameStatus>("player");
  const [level, setLevel] = useState<GameLevel>("easy");
  const [wins, setWins] = useState(0);
  const engineRef = useRef<BoardEngine | null>(null);
  const levelRef = useRef<GameLevel>("easy");

  useEffect(() => {
    let saved: GameLevel = "easy";
    try {
      const v = localStorage.getItem(KEY);
      if (v === "easy" || v === "medium" || v === "hard") saved = v;
    } catch {
      // storage can be blocked; the default level is fine
    }
    levelRef.current = saved;
    const t = setTimeout(() => setLevel(saved), 0);
    return () => clearTimeout(t);
  }, []);

  const pickLevel = (l: GameLevel) => {
    levelRef.current = l;
    setLevel(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      // ignore
    }
    audioManager.play("success");
    engineRef.current?.setLevel(l);
  };

  const done = status === "win" || status === "lose" || status === "draw";
  return (
    <ToyGame
      title={title}
      moduleId={moduleId}
      items={cells}
      create={async (container) => {
        const engine = await make(container, {
          reducedMotion: reduced,
          level: levelRef.current,
          onStatus: (s) => {
            setStatus(s);
            const line = STATUS[s].say;
            if (line) setTimeout(() => audioManager.speak(line), s === "player" ? 400 : 600);
          },
          onPlace: ({ by, n }) => audioManager.playNote(by === "player" ? 4 + (n % 4) : 1 + (n % 3)),
          onResult: ({ result, level: lv }) => {
            if (result === "win") {
              audioManager.play("success");
              setWins((w) => w + 1);
              void finishActivity(moduleId, { score: 1, variant: lv });
            } else if (result === "draw" && lv === "hard") {
              void finishActivity(moduleId, { score: 0, variant: lv });
            } else if (result === "lose") {
              audioManager.play("failure");
            }
          },
        });
        engineRef.current = engine;
        return engine as ToyEngine;
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-3 pb-5">
        <p role="status" className={`rounded-full px-6 py-3 text-2xl font-extrabold text-ink shadow-lg ${status === "win" ? "bg-kid-green" : status === "lose" ? "bg-kid-orange" : "bg-white"}`}>
          {status === "player" && playerHint ? playerHint : STATUS[status].text}
        </p>
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
          <GameSettings title="Game settings">
            {(close) => (
              <ChipRow
                label="How clever is the robot?"
                value={level}
                options={LEVELS.map((l) => ({ id: l.id, text: `${l.icon} ${l.label}` }))}
                onPick={(l) => {
                  pickLevel(l);
                  close();
                }}
              />
            )}
          </GameSettings>
          <button
            type="button"
            onClick={() => engineRef.current?.newGame()}
            className={`min-h-14 rounded-2xl px-5 text-xl font-bold shadow-md active:scale-95 ${done ? "animate-bounce bg-kid-green text-ink" : "bg-kid-yellow text-ink"}`}
          >
            🔄 {done ? "Play again" : "New game"}
          </button>
          <span className="rounded-2xl bg-surface px-3 py-3 text-lg font-bold text-foreground shadow" aria-label={`${LEVELS.find((l) => l.id === level)?.label} level`}>
            {LEVELS.find((l) => l.id === level)?.icon}
          </span>
          {wins > 0 && <span className="rounded-2xl bg-surface px-3 py-3 text-xl font-bold text-foreground shadow" aria-label={`${wins} wins`}>🏆 {wins}</span>}
        </div>
      </div>
    </ToyGame>
  );
}
