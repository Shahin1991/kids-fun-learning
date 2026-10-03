"use client";

import { useState } from "react";
import { ActivityHeader } from "@/components/ActivityHeader";
import { Button } from "@/components/Button";
import { DragPiece } from "@/components/DragPiece";
import { PageContainer } from "@/components/PageContainer";
import { ShakeOnWrong } from "@/components/ShakeOnWrong";
import { SuccessPop } from "@/components/SuccessPop";
import { audioManager } from "@/lib/audio/AudioManager";
import { finishActivity } from "@/lib/activity";

const EMOJI = ["🐘", "🐻", "🐶", "🐱", "🐭"];
const SORT_SIZES = [4, 6, 8];

function BigOrSmall() {
  const [streak, setStreak] = useState(0);
  const [round, setRound] = useState(0);
  const [wobble, setWobble] = useState<{ side: number; n: number }>({ side: -1, n: 0 });

  // Scaffolding: two sizes at first, a third once the streak reaches 4.
  const count = streak >= 4 ? 3 : 2;
  const seed = round * 7919;
  const askBig = round % 2 === 0;
  const emoji = EMOJI[seed % EMOJI.length];
  const sizes = count === 3 ? [3.5, 6, 9] : [4, 8];
  const order = sizes.map((s, i) => ({ s, k: (i * 13 + seed) % 7 })).sort((a, b) => a.k - b.k).map((x) => x.s);
  const target = askBig ? Math.max(...sizes) : Math.min(...sizes);

  const pick = (size: number, index: number) => {
    if (size === target) {
      audioManager.playNote(Math.min(9, streak + 2));
      audioManager.speak(askBig ? "Big!" : "Small!");
      const next = streak + 1;
      setStreak(next);
      setRound((r) => r + 1);
      if (next % 5 === 0) void finishActivity("sizes", { score: next });
    } else {
      audioManager.play("failure");
      setWobble((w) => ({ side: index, n: w.n + 1 }));
    }
  };

  return (
    <>
      <p className="text-center text-3xl font-bold">Tap the {askBig ? "BIG" : "SMALL"} one! 🔥 {streak}</p>
      <div className="flex flex-1 items-center justify-center gap-6">
        {order.map((s, i) => (
          <ShakeOnWrong key={i} trigger={wobble.side === i ? wobble.n : 0}>
            <button type="button" aria-label={`${emoji} size ${s}`} onClick={() => pick(s, i)} className="flex min-h-touch min-w-touch items-center justify-center" style={{ fontSize: `${s}rem` }}>
              {emoji}
            </button>
          </ShakeOnWrong>
        ))}
      </div>
    </>
  );
}

function SortThem() {
  const [slots, setSlots] = useState<(number | null)[]>([null, null, null]);
  const tray = SORT_SIZES.filter((s) => !slots.includes(s));

  const drop = (size: number, slot: string | null) => {
    const idx = slot === null ? -1 : Number(slot);
    if (idx !== SORT_SIZES.indexOf(size)) {
      audioManager.play("failure");
      return;
    }
    audioManager.playNote(idx * 3);
    const next = slots.map((s, i) => (i === idx ? size : s));
    setSlots(next);
    if (next.every((s) => s !== null)) {
      void finishActivity("sizes");
      setTimeout(() => setSlots([null, null, null]), 1500);
    }
  };

  return (
    <>
      <p className="text-center text-2xl font-bold">Put them in order, small to big</p>
      <div className="flex items-end justify-center gap-4">
        {SORT_SIZES.map((s, i) => (
          <div key={s} data-slot={String(i)} className="flex h-44 w-32 items-end justify-center rounded-3xl border-4 border-dashed border-kid-blue/50 bg-white/60 pb-2">
            {slots[i] !== null && <SuccessPop><span style={{ fontSize: `${s}rem` }}>🐘</span></SuccessPop>}
          </div>
        ))}
      </div>
      <div className="mt-auto flex min-h-44 items-end justify-center gap-6">
        {tray.map((s) => (
          <DragPiece key={s} label={`elephant size ${s}`} onDrop={(slot) => drop(s, slot)}>
            <span style={{ fontSize: `${s}rem` }}>🐘</span>
          </DragPiece>
        ))}
      </div>
    </>
  );
}

export default function SizesPage() {
  const [mode, setMode] = useState<"tap" | "sort">("tap");
  return (
    <PageContainer>
      <ActivityHeader title="Big or Small" moduleId="sizes" />
      <div className="flex justify-center gap-3">
        <Button variant={mode === "tap" ? "primary" : "ghost"} onClick={() => setMode("tap")}>Big or Small</Button>
        <Button variant={mode === "sort" ? "primary" : "ghost"} onClick={() => setMode("sort")}>Sort Them</Button>
      </div>
      {mode === "tap" ? <BigOrSmall /> : <SortThem />}
    </PageContainer>
  );
}
