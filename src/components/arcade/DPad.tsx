"use client";

import type { Dir } from "@/lib/arcade/snake";

const BTN = "flex h-20 w-20 touch-none select-none items-center justify-center rounded-2xl bg-slate-700 text-4xl text-white shadow-lg active:scale-95 active:bg-slate-500";

/** Four 80px arrow buttons laid out like a D-pad. */
export function DPad({ onPress }: { onPress: (d: Dir) => void }) {
  const b = (d: Dir, label: string, glyph: string, cls: string) => (
    <button type="button" aria-label={label} className={`${BTN} ${cls}`} onPointerDown={(e) => { e.preventDefault(); onPress(d); }}>
      {glyph}
    </button>
  );
  return (
    <div className="grid grid-cols-3 grid-rows-2 gap-2">
      {b("up", "Up", "▲", "col-start-2 row-start-1")}
      {b("left", "Left", "◀", "col-start-1 row-start-2")}
      {b("down", "Down", "▼", "col-start-2 row-start-2")}
      {b("right", "Right", "▶", "col-start-3 row-start-2")}
    </div>
  );
}
