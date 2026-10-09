"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { audioManager } from "@/lib/audio/AudioManager";
import { finishActivity } from "@/lib/activity";
import type { DiceEngine, DiceOptions, DiceSound, DiceState } from "@/lib/board-games/dice-types";
import type { GameLevel } from "@/lib/board-games/types";
import type { ToyEngine } from "@/lib/toy3d/ToyScene";

const ToyGame = dynamic(() => import("@/components/toy3d/ToyGame"), { ssr: false, loading: () => <LoadingSpinner /> });

const LEVELS: { id: GameLevel; icon: string; label: string }[] = [
  { id: "easy", icon: "🐣", label: "Easy" },
  { id: "medium", icon: "🐱", label: "Medium" },
  { id: "hard", icon: "🦁", label: "Hard" },
];

function sound(k: DiceSound, n = 0) {
  switch (k) {
    case "roll":
      audioManager.playNote(2 + Math.floor(Math.random() * 3));
      break;
    case "hop":
      audioManager.playNote(n % 10);
      break;
    case "up":
    case "home":
      audioManager.play("success");
      break;
    case "down":
    case "capture":
      audioManager.playNote(0);
      break;
    case "win":
      audioManager.play("success");
      break;
    case "lose":
      audioManager.play("reward");
      break;
  }
}

const EMPTY: DiceState = { players: [], current: 0, canRoll: false, choosing: false, message: "", winner: null, rolled: null };
const stripEmoji = (s: string) => s.replace(/[\p{Extended_Pictographic}️]/gu, "").trim();

/** Shared page for the 3D dice board games: players strip, roll button, player-count and level chips. */
export function DiceGameShell({ title, moduleId, make, showLevel = false }: { title: string; moduleId: string; make: (container: HTMLElement, opts: DiceOptions) => Promise<DiceEngine>; showLevel?: boolean }) {
  const reduced = useAppReducedMotion();
  const [state, setState] = useState<DiceState>(EMPTY);
  const [count, setCount] = useState(2);
  const [level, setLevel] = useState<GameLevel>("easy");
  const engineRef = useRef<DiceEngine | null>(null);
  const cfgRef = useRef({ players: 2, level: "easy" as GameLevel });
  const lastSpoken = useRef("");
  const key = `dice-game-${moduleId}`;

  useEffect(() => {
    let saved = { players: 2, level: "easy" as GameLevel };
    try {
      const v = JSON.parse(localStorage.getItem(key) ?? "null");
      if (v && [2, 3, 4].includes(v.players) && ["easy", "medium", "hard"].includes(v.level)) saved = v;
    } catch {
      // blocked storage: defaults are fine
    }
    cfgRef.current = saved;
    const t = setTimeout(() => {
      setCount(saved.players);
      setLevel(saved.level);
    }, 0);
    return () => clearTimeout(t);
  }, [key]);

  const apply = (players: number, lv: GameLevel) => {
    cfgRef.current = { players, level: lv };
    setCount(players);
    setLevel(lv);
    try {
      localStorage.setItem(key, JSON.stringify({ players, level: lv }));
    } catch {
      // ignore
    }
    audioManager.play("success");
    engineRef.current?.newGame({ players, level: lv });
  };

  const you = state.players.findIndex((p) => p.human);
  const done = state.winner !== null;
  return (
    <ToyGame
      title={title}
      moduleId={moduleId}
      items={[{ id: "roll", label: "Roll the dice" }]}
      create={async (container) => {
        const engine = await make(container, {
          reducedMotion: reduced,
          players: cfgRef.current.players,
          level: cfgRef.current.level,
          onState: (s) => {
            setState(s);
            if (s.message !== lastSpoken.current) {
              lastSpoken.current = s.message;
              if (/Your turn|ladder|snake|won|roll again|bumped|home|No move|sent/i.test(s.message)) setTimeout(() => audioManager.speak(stripEmoji(s.message)), 150);
            }
          },
          onSound: sound,
          onResult: ({ result, players, level: lv }) => {
            if (result === "win") void finishActivity(moduleId, { score: 1, variant: `${players}p-${lv}` });
          },
        });
        engineRef.current = engine;
        return engine as ToyEngine;
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-[4.6rem] flex justify-center px-3">
        <div className="pointer-events-none flex flex-wrap justify-center gap-2" aria-label="Players">
      {state.players.map((p, i) => (
        <span
          key={i}
          className={`flex items-center gap-1 rounded-2xl px-3 py-1 text-lg font-bold text-white shadow-md transition-transform ${state.current === i && !done ? "scale-110 ring-4 ring-white" : "opacity-85"} ${state.winner === i ? "animate-bounce ring-4 ring-kid-yellow" : ""}`}
          style={{ background: p.color }}
        >
          <span aria-hidden className="text-2xl">{p.emoji}</span>
          <span className="flex flex-col leading-tight">
            <span>{p.name}</span>
            <span className="text-xs font-semibold opacity-90">{p.info}</span>
          </span>
        </span>
      ))}
    </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-3 pb-4">
        <p role="status" className={`rounded-full px-5 py-2 text-xl font-extrabold text-ink shadow-lg ${state.winner === you && done ? "bg-kid-green" : "bg-white"}`}>
          {state.message || "…"}
        </p>
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
          {state.canRoll && (
            <button type="button" onClick={() => engineRef.current?.roll()} aria-label="Roll the dice" className="min-h-16 animate-pulse rounded-3xl bg-kid-green px-8 text-3xl font-extrabold text-ink shadow-xl active:scale-90">
              🎲 Roll!
            </button>
          )}
        </div>
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
          {[2, 3, 4].map((n) => (
            <button key={n} type="button" aria-pressed={count === n} aria-label={`${n} players`} onClick={() => apply(n, level)} className={`min-h-12 rounded-2xl px-3 text-lg font-bold shadow-md active:scale-95 ${count === n ? "bg-kid-blue text-white ring-4 ring-white" : "bg-surface text-foreground"}`}>
              👥 {n}
            </button>
          ))}
          {showLevel &&
            LEVELS.map((l) => (
              <button key={l.id} type="button" aria-pressed={level === l.id} onClick={() => apply(count, l.id)} className={`min-h-12 rounded-2xl px-3 text-lg font-bold shadow-md active:scale-95 ${level === l.id ? "bg-kid-blue text-white ring-4 ring-white" : "bg-surface text-foreground"}`}>
                <span aria-hidden>{l.icon}</span> {l.label}
              </button>
            ))}
          <button type="button" onClick={() => apply(count, level)} className={`min-h-12 rounded-2xl px-4 text-lg font-bold text-ink shadow-md active:scale-95 ${done ? "animate-bounce bg-kid-green" : "bg-kid-yellow"}`}>
            🔄 {done ? "Play again" : "New game"}
          </button>
        </div>
      </div>
    </ToyGame>
  );
}
