"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { clampHumans } from "@/lib/board-games/seats";
import { ChipRow, GameSettings } from "./GameSettings";
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
  const [humans, setHumans] = useState(1);
  const [level, setLevel] = useState<GameLevel>("easy");
  const engineRef = useRef<DiceEngine | null>(null);
  const cfgRef = useRef({ players: 2, humans: 1, level: "easy" as GameLevel });
  const lastSpoken = useRef("");
  const key = `dice-game-${moduleId}`;

  useEffect(() => {
    let saved = { players: 2, humans: 1, level: "easy" as GameLevel };
    try {
      const v = JSON.parse(localStorage.getItem(key) ?? "null");
      if (v && [2, 3, 4].includes(v.players) && ["easy", "medium", "hard"].includes(v.level)) saved = { players: v.players, humans: v.humans === 2 ? 2 : 1, level: v.level };
    } catch {
      // blocked storage: defaults are fine
    }
    cfgRef.current = saved;
    const t = setTimeout(() => {
      setCount(saved.players);
      setHumans(saved.humans);
      setLevel(saved.level);
    }, 0);
    return () => clearTimeout(t);
  }, [key]);

  const apply = (players: number, people: number, lv: GameLevel) => {
    const h = clampHumans(people, players);
    cfgRef.current = { players, humans: h, level: lv };
    setCount(players);
    setHumans(h);
    setLevel(lv);
    try {
      localStorage.setItem(key, JSON.stringify({ players, humans: h, level: lv }));
    } catch {
      // ignore
    }
    audioManager.play("success");
    engineRef.current?.newGame({ players, humans: h, level: lv });
  };

  const done = state.winner !== null;
  const humanWon = done && Boolean(state.players[state.winner!]?.human);
  return (
    <ToyGame
      title={title}
      moduleId={moduleId}
      items={[{ id: "roll", label: "Roll the dice" }]}
      create={async (container) => {
        const engine = await make(container, {
          reducedMotion: reduced,
          players: cfgRef.current.players,
          humans: cfgRef.current.humans,
          level: cfgRef.current.level,
          onState: (s) => {
            setState(s);
            if (s.message !== lastSpoken.current) {
              lastSpoken.current = s.message;
              if (/turn|ladder|snake|won|roll again|bumped|home|No move|sent/i.test(s.message)) setTimeout(() => audioManager.speak(stripEmoji(s.message)), 150);
            }
          },
          onSound: sound,
          onResult: ({ result, players, humans: h, level: lv }) => {
            if (result === "win") void finishActivity(moduleId, { score: 1, variant: `${players}p${h}h-${lv}` });
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
        <p role="status" className={`rounded-full px-5 py-2 text-xl font-extrabold text-ink shadow-lg ${humanWon ? "bg-kid-green" : "bg-white"}`}>
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
          <GameSettings title="Game settings">
            {(close) => (
              <>
                <ChipRow
                  label="Who is playing?"
                  value={humans}
                  options={[
                    { id: 1, text: "🧒 1 person", aria: "One person plays against robots" },
                    { id: 2, text: "🧒🧒 2 people", aria: "Two people share the device" },
                  ]}
                  onPick={(h) => {
                    apply(count, h, level);
                    close();
                  }}
                />
                <ChipRow
                  label="How many seats?"
                  value={count}
                  options={[2, 3, 4].map((n) => ({ id: n, text: `👥 ${n}`, aria: `${n} players` }))}
                  onPick={(n) => {
                    apply(n, humans, level);
                    close();
                  }}
                />
                {showLevel && (
                  <ChipRow
                    label="How clever are the robots?"
                    value={level}
                    options={LEVELS.map((l) => ({ id: l.id, text: `${l.icon} ${l.label}` }))}
                    onPick={(l) => {
                      apply(count, humans, l);
                      close();
                    }}
                  />
                )}
              </>
            )}
          </GameSettings>
          <button type="button" onClick={() => apply(count, humans, level)} className={`min-h-14 rounded-2xl px-5 text-xl font-bold text-ink shadow-md active:scale-95 ${done ? "animate-bounce bg-kid-green" : "bg-kid-yellow"}`}>
            🔄 {done ? "Play again" : "New game"}
          </button>
        </div>
      </div>
    </ToyGame>
  );
}
