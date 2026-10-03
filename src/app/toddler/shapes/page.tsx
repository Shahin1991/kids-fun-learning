"use client";

import { useState } from "react";
import { ActivityHeader } from "@/components/ActivityHeader";
import { DragPiece } from "@/components/DragPiece";
import { PageContainer } from "@/components/PageContainer";
import { SuccessPop } from "@/components/SuccessPop";
import { SHAPES, type ShapeDef } from "@/data/shapes";
import { audioManager } from "@/lib/audio/AudioManager";
import { finishActivity } from "@/lib/activity";

function ShapeSvg({ shape, outline }: { shape: ShapeDef; outline?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28" aria-hidden>
      <path d={shape.path} fill={outline ? "none" : shape.color} stroke={outline ? "#9aa" : "white"} strokeWidth={outline ? 3 : 2} strokeDasharray={outline ? "6 5" : undefined} />
    </svg>
  );
}

export default function ShapesPage() {
  const [placed, setPlaced] = useState<string[]>([]);
  const [round, setRound] = useState(0);

  // Scaffolding: begin with 2 shapes, add one per round up to all of them.
  const active = SHAPES.slice(0, Math.min(SHAPES.length, 2 + round));
  const tray = active.filter((s) => !placed.includes(s.id));

  const drop = (shape: ShapeDef, slot: string | null) => {
    if (slot !== shape.id) {
      audioManager.play("failure");
      return;
    }
    audioManager.playNote(placed.length * 2);
    audioManager.speak(shape.label);
    const next = [...placed, shape.id];
    setPlaced(next);
    if (next.length === active.length) {
      void finishActivity("shapes");
      setTimeout(() => {
        setPlaced([]);
        setRound((r) => r + 1);
      }, 1500);
    }
  };

  return (
    <PageContainer>
      <ActivityHeader title="Shapes" moduleId="shapes" />
      <p className="text-center text-xl">Drag each shape to its outline</p>
      <div className="flex flex-wrap justify-center gap-6">
        {active.map((s) => (
          <div key={s.id} data-slot={s.id} className="flex h-36 w-36 items-center justify-center rounded-3xl bg-white/60">
            {placed.includes(s.id) ? <SuccessPop><ShapeSvg shape={s} /></SuccessPop> : <ShapeSvg shape={s} outline />}
          </div>
        ))}
      </div>
      <div className="mt-auto flex min-h-40 flex-wrap items-center justify-center gap-6 rounded-3xl bg-white/40 p-4">
        {tray.map((s) => (
          <DragPiece key={s.id} label={s.label} onDrop={(slot) => drop(s, slot)}>
            <ShapeSvg shape={s} />
          </DragPiece>
        ))}
      </div>
    </PageContainer>
  );
}
