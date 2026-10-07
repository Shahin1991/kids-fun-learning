"use client";

import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { ActivityHeader } from "@/components/ActivityHeader";
import { Button } from "@/components/Button";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import { audioManager } from "@/lib/audio/AudioManager";
import { finishActivity } from "@/lib/activity";

const COLS = 5;
const END = 20;
const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const SCENERY = ["🌳", "🌷", "🍄", "🦋", "🌼", "🐝"];

/** Square n (1-based) -> grid cell; rows snake back and forth like a board game, 1 at the bottom. */
function cellOf(n: number) {
  const i = n - 1;
  const row = Math.floor(i / COLS);
  const col = row % 2 === 0 ? i % COLS : COLS - 1 - (i % COLS);
  return { row, col };
}

function Die({ value, rolling }: { value: number; rolling: boolean }) {
  return (
    <motion.div animate={rolling ? { rotate: [0, 180, 360], scale: [1, 1.15, 1] } : { rotate: 0 }} transition={{ duration: 0.6 }} className="grid h-24 w-24 grid-cols-3 grid-rows-3 gap-1 rounded-3xl bg-white p-3 shadow-lg" aria-label={`Dice shows ${value}`}>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={`rounded-full ${PIPS[value]?.includes(i) ? "bg-kid-red" : ""}`} />
      ))}
    </motion.div>
  );
}

/** Linear number board game (research: the best-evidenced early-maths game type): roll, count aloud while hopping. */
function Game() {
  const [pos, setPos] = useState(1);
  const [die, setDie] = useState(1);
  const [busy, setBusy] = useState(false);
  const [won, setWon] = useState(false);
  const rolls = useRef(0);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const roll = async () => {
    if (busy) return;
    setBusy(true);
    // Small dice first so counting stays easy; the die grows as the child gets near the end.
    const max = rolls.current < 3 ? 3 : 6;
    const v = 1 + Math.floor(Math.random() * max);
    rolls.current += 1;
    setDie(v);
    audioManager.play("success");
    audioManager.speak(`${v}! Let's hop ${v}.`);
    await sleep(1400);
    let p = pos;
    for (let s = 0; s < v && p < END; s++) {
      p += 1;
      setPos(p);
      audioManager.playNote(p % 10);
      audioManager.speak(String(p));
      await sleep(850);
    }
    if (p >= END) {
      setWon(true);
      audioManager.speak("You made it to twenty! Hooray!");
      void finishActivity("number-path", { score: rolls.current });
    }
    setBusy(false);
  };

  const again = () => {
    rolls.current = 0;
    setPos(1);
    setWon(false);
  };

  const rows = Math.ceil(END / COLS);
  const { row, col } = cellOf(pos);
  return (
    <div className="flex flex-1 flex-col items-center gap-5">
      <div className="relative aspect-[5/4] w-full max-w-lg rounded-3xl bg-kid-green/30 p-2">
        <div className="grid h-full w-full gap-1" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
          {Array.from({ length: END }, (_, i) => {
            const n = i + 1;
            const c = cellOf(n);
            return (
              <button
                key={n}
                type="button"
                aria-label={`Square ${n}`}
                onClick={() => audioManager.speak(String(n))}
                className={`relative flex items-center justify-center rounded-2xl text-3xl font-extrabold text-ink shadow ${n % 2 ? "bg-white" : "bg-kid-yellow/70"} ${n === END ? "ring-4 ring-kid-red" : ""}`}
                style={{ gridColumn: c.col + 1, gridRow: rows - c.row }}
              >
                {n === END ? "🏁" : n}
                <span className="absolute right-1 top-0 text-base opacity-70" aria-hidden>{SCENERY[n % SCENERY.length]}</span>
              </button>
            );
          })}
        </div>
        <motion.div
          className="pointer-events-none absolute flex items-center justify-center text-5xl"
          initial={false}
          animate={{ left: `${(col * 100) / COLS + 0.5}%`, top: `${((rows - 1 - row) * 100) / rows + 1}%`, y: busy ? [0, -14, 0] : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          style={{ width: `${100 / COLS}%`, height: `${100 / rows}%` }}
          aria-label={`You are on square ${pos}`}
        >
          🐰
        </motion.div>
      </div>
      <div className="flex items-center gap-6">
        <Die value={die} rolling={busy} />
        {won ? (
          <Button onClick={again}>🎉 Play again</Button>
        ) : (
          <Button onClick={roll} disabled={busy} className="disabled:opacity-60" aria-label="Roll the dice">
            🎲 Roll!
          </Button>
        )}
      </div>
    </div>
  );
}

export default function NumberPathPage() {
  return (
    <PageContainer>
      <ActivityHeader title="Number Path" moduleId="number-path" />
      <ClientOnly>
        <Game />
      </ClientOnly>
    </PageContainer>
  );
}
