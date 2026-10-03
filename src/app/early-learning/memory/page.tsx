"use client";

import { useEffect, useState } from "react";
import { ActivityHeader } from "@/components/ActivityHeader";
import { Button } from "@/components/Button";
import { PageContainer } from "@/components/PageContainer";
import { audioManager } from "@/lib/audio/AudioManager";
import { finishActivity } from "@/lib/activity";
import { getBestMoves } from "@/lib/progress/progress";
import { unlockAchievement } from "@/lib/rewards/RewardManager";

const FACES = ["🐶", "🐱", "🐸", "🦁", "🐼", "🐵", "🦊", "🐰"];
const SIZES = { easy: 3, medium: 6, hard: 8 } as const;
type Level = keyof typeof SIZES;

interface Card {
  id: number;
  face: string;
}

function deal(level: Level): Card[] {
  const faces = FACES.slice(0, SIZES[level]);
  return [...faces, ...faces].map((face, id) => ({ id, face })).sort(() => Math.random() - 0.5);
}

function Game({ level, onBack }: { level: Level; onBack: () => void }) {
  const [cards] = useState(() => deal(level));
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [best, setBest] = useState<number | null>(null);

  useEffect(() => {
    getBestMoves("memory", level).then(setBest).catch(() => {});
  }, [level]);

  const flip = (card: Card) => {
    if (open.length === 2 || open.includes(card.id) || matched.includes(card.face)) return;
    audioManager.playNote(card.id % 10);
    const next = [...open, card.id];
    setOpen(next);
    if (next.length < 2) return;
    setMoves((m) => m + 1);
    const [a, b] = next.map((id) => cards.find((c) => c.id === id)!);
    if (a.face === b.face) {
      const done = [...matched, a.face];
      setMatched(done);
      setOpen([]);
      audioManager.play("success");
      if (done.length === SIZES[level]) {
        void finishActivity("memory", { moves: moves + 1, variant: level });
        if (level === "hard") void unlockAchievement("memory-master");
      }
    } else {
      // Cards just flip back gently; no penalty.
      setTimeout(() => setOpen([]), 900);
    }
  };

  const won = matched.length === SIZES[level];
  return (
    <>
      <div className="flex items-center justify-between text-xl font-bold">
        <Button variant="ghost" onClick={onBack}>← Levels</Button>
        <span>Moves: {moves}{best !== null && ` · Best: ${best}`}</span>
      </div>
      {won && <p className="text-center text-3xl font-extrabold" role="status">🎉 You found them all!</p>}
      <div className="grid grid-cols-4 gap-3">
        {cards.map((c) => {
          const shown = open.includes(c.id) || matched.includes(c.face);
          return (
            <button key={c.id} type="button" aria-label={shown ? c.face : "Hidden card"} onClick={() => flip(c)} className={`aspect-square min-h-touch rounded-2xl text-5xl shadow-md transition-transform ${shown ? "bg-surface" : "bg-kid-purple"}`}>
              {shown ? c.face : "❓"}
            </button>
          );
        })}
      </div>
    </>
  );
}

export default function MemoryPage() {
  const [level, setLevel] = useState<Level | null>(null);
  const [gameNo, setGameNo] = useState(0);
  return (
    <PageContainer>
      <ActivityHeader title="Memory Match" moduleId="memory" />
      {level ? (
        <Game key={gameNo} level={level} onBack={() => setLevel(null)} />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          {(Object.keys(SIZES) as Level[]).map((l) => (
            <Button key={l} className="w-64 capitalize" onClick={() => {
              setGameNo((n) => n + 1);
              setLevel(l);
            }}>{l}</Button>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
