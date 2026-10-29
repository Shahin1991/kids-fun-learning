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

/** With a friend, "player" is Player 1 and "bot" is Player 2; `side` is each one's colour. */
const friendStatus = (s: GameStatus, side: [string, string]): { text: string; say?: string } => {
  switch (s) {
    case "player":
      return { text: `${side[0]} Player 1's turn`, say: "Player 1's turn!" };
    case "bot":
      return { text: `${side[1]} Player 2's turn`, say: "Player 2's turn!" };
    case "win":
      return { text: `${side[0]} Player 1 wins! 🎉`, say: "Player 1 wins! Well played, both of you!" };
    case "lose":
      return { text: `${side[1]} Player 2 wins! 🎉`, say: "Player 2 wins! Well played, both of you!" };
    case "draw":
      return STATUS.draw;
  }
};

const KEY = "board-game-level";
const FRIEND_KEY = "board-game-friend";

type Make = (container: HTMLElement, opts: import("@/lib/board-games/types").BoardOptions) => Promise<BoardEngine>;

/**
 * Shared page for the board games: 3D canvas, status pill, robot-or-friend and difficulty chips, and a new-game button.
 * `sides` are the two players' colours, shown when two people share the device.
 */
export function BoardGameShell({ title, moduleId, make, cells, playerHint, sides = ["🔵", "🔴"] }: { title: string; moduleId: string; make: Make; cells: { id: string; label: string }[]; playerHint?: string; sides?: [string, string] }) {
  const reduced = useAppReducedMotion();
  const [status, setStatus] = useState<GameStatus>("player");
  const [level, setLevel] = useState<GameLevel>("easy");
  const [friend, setFriend] = useState(false);
  const [wins, setWins] = useState(0);
  /** Games won by Player 1 and Player 2 when playing with a friend */
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [undoable, setUndoable] = useState(false);
  const engineRef = useRef<BoardEngine | null>(null);
  const levelRef = useRef<GameLevel>("easy");
  const friendRef = useRef(false);

  useEffect(() => {
    let saved: GameLevel = "easy";
    let savedFriend = false;
    try {
      const v = localStorage.getItem(KEY);
      if (v === "easy" || v === "medium" || v === "hard") saved = v;
      savedFriend = localStorage.getItem(FRIEND_KEY) === "1";
    } catch {
      // storage can be blocked; the defaults are fine
    }
    levelRef.current = saved;
    friendRef.current = savedFriend;
    const t = setTimeout(() => {
      setLevel(saved);
      setFriend(savedFriend);
    }, 0);
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

  const pickFriend = (f: boolean) => {
    friendRef.current = f;
    setFriend(f);
    setScore([0, 0]);
    try {
      localStorage.setItem(FRIEND_KEY, f ? "1" : "0");
    } catch {
      // ignore
    }
    audioManager.play("success");
    engineRef.current?.setFriend(f);
  };

  const shown = (s: GameStatus) => (friendRef.current ? friendStatus(s, sides) : STATUS[s]);

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
          friend: friendRef.current,
          onUndoable: setUndoable,
          onStatus: (s) => {
            setStatus(s);
            const line = shown(s).say;
            if (line) setTimeout(() => audioManager.speak(line), s === "player" ? 400 : 600);
          },
          onPlace: ({ by, n }) => audioManager.playNote(by === "player" ? 4 + (n % 4) : 1 + (n % 3)),
          onResult: ({ result, level: lv }) => {
            if (friendRef.current) {
              // Two people played a whole game together: a star whoever won
              if (result !== "draw") audioManager.play("success");
              if (result !== "draw") setScore(([a, b]) => (result === "win" ? [a + 1, b] : [a, b + 1]));
              void finishActivity(moduleId, { score: 1, variant: "friend" });
            } else if (result === "win") {
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
        <p role="status" className={`rounded-full px-6 py-3 text-2xl font-extrabold text-ink shadow-lg ${status === "win" || (friend && status === "lose") ? "bg-kid-green" : status === "lose" ? "bg-kid-orange" : "bg-white"}`}>
          {friend ? friendStatus(status, sides).text : status === "player" && playerHint ? playerHint : STATUS[status].text}
        </p>
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
          <GameSettings title="Game settings">
            {(close) => (
              <>
                <ChipRow
                  label="Play with"
                  value={friend ? "friend" : "robot"}
                  options={[
                    { id: "robot", text: "🤖 Robo" },
                    { id: "friend", text: "👫 Friend" },
                  ]}
                  onPick={(o) => {
                    pickFriend(o === "friend");
                    close();
                  }}
                />
                {!friend && (
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
              </>
            )}
          </GameSettings>
          <button
            type="button"
            disabled={!undoable}
            aria-label={friend ? "Oops, take back the last move" : "Oops, take back my last move"}
            onClick={() => {
              audioManager.speak("No problem! Try again.");
              engineRef.current?.undo();
            }}
            className="min-h-14 rounded-2xl bg-surface px-4 text-xl font-bold text-foreground shadow-md active:scale-95 disabled:opacity-35"
          >
            ↩️ Oops
          </button>
          <button
            type="button"
            onClick={() => engineRef.current?.newGame()}
            className={`min-h-14 rounded-2xl px-5 text-xl font-bold shadow-md active:scale-95 ${done ? "animate-bounce bg-kid-green text-ink" : "bg-kid-yellow text-ink"}`}
          >
            🔄 {done ? "Play again" : "New game"}
          </button>
          {friend ? (
            <span className="rounded-2xl bg-surface px-3 py-3 text-xl font-bold text-foreground shadow" aria-label={`Player 1 has ${score[0]}, Player 2 has ${score[1]}`}>
              {sides[0]} {score[0]} – {score[1]} {sides[1]}
            </span>
          ) : (
            <span className="rounded-2xl bg-surface px-3 py-3 text-lg font-bold text-foreground shadow" aria-label={`${LEVELS.find((l) => l.id === level)?.label} level`}>
              {LEVELS.find((l) => l.id === level)?.icon}
            </span>
          )}
          {!friend && wins > 0 && <span className="rounded-2xl bg-surface px-3 py-3 text-xl font-bold text-foreground shadow" aria-label={`${wins} wins`}>🏆 {wins}</span>}
        </div>
      </div>
    </ToyGame>
  );
}
