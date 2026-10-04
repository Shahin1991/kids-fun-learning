"use client";

import { useRef, useState } from "react";
import ToyGame from "@/components/toy3d/ToyGame";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import { FOLDS, SHAPE_DEFS, type FoldId, type TileShape } from "@/lib/magna-tiles/geometry";
import type { MagnaEngine, MagnaState } from "@/lib/magna-tiles/MagnaEngine";
import { TILE_COLORS } from "@/lib/magna-tiles/MagnaEngine";

const SHAPES: TileShape[] = ["square", "triangle", "rect"];
const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

function ShapeIcon({ shape, color }: { shape: TileShape; color: string }) {
  const verts = SHAPE_DEFS[shape].verts;
  const xs = verts.map((v) => v[0]);
  const ys = verts.map((v) => v[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(...xs) - minX;
  const h = Math.max(...ys) - minY;
  const s = 40 / Math.max(w, h);
  const pts = verts.map(([x, y]) => `${(x - minX) * s + 4},${(h - (y - minY)) * s + 4}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w * s + 8} ${h * s + 8}`} className="h-10 w-10" aria-hidden>
      <polygon points={pts} fill={color} fillOpacity={0.75} stroke={color} strokeWidth={4} strokeLinejoin="round" />
    </svg>
  );
}

const btn = "min-h-14 min-w-14 rounded-2xl px-3 text-lg font-extrabold shadow transition-transform active:scale-95";

export default function MagnaTilesGame() {
  const reduced = useAppReducedMotion();
  const engine = useRef<MagnaEngine | null>(null);
  const [shape, setShape] = useState<TileShape>("square");
  const [color, setColor] = useState(TILE_COLORS[4]);
  const [fold, setFold] = useState<FoldId>("wall");
  const [info, setInfo] = useState<MagnaState>({ count: 0, selected: false, canRefold: false });

  return (
    <ToyGame
      title="Magna Tiles"
      moduleId="magna-tiles"
      items={[...SHAPES.map((s) => ({ id: s, label: `Add ${SHAPE_DEFS[s].label}` }))]}
      create={async (container) => {
        const { MagnaEngine } = await import("@/lib/magna-tiles/MagnaEngine");
        const e = new MagnaEngine(container, {
          reducedMotion: reduced,
          onChange: setInfo,
          onPlace: ({ count }) => audioManager.playNote(count % 10),
          onMilestone: (count) => {
            audioManager.play("success");
            void finishActivity("magna-tiles", { score: count });
          },
        });
        engine.current = e;
        return e;
      }}
    >
      {() => (
        <>
          <p className="pointer-events-none absolute inset-x-0 top-20 px-4 text-center text-base font-bold text-slate-700 drop-shadow sm:text-xl">
            {info.count === 0 ? "Tap the floor to put down your first tile!" : info.selected ? "Tap a glowing edge to snap on another tile" : "Tap a tile to pick it, drag to look around"}
          </p>
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 rounded-t-3xl bg-surface/95 p-3 shadow-[0_-6px_20px_rgba(0,0,0,0.15)]">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {SHAPES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-label={SHAPE_DEFS[s].label}
                  aria-pressed={shape === s}
                  onClick={() => {
                    setShape(s);
                    engine.current?.setShape(s);
                    audioManager.playNote(3);
                  }}
                  className={`flex min-h-touch min-w-touch items-center justify-center rounded-2xl shadow ${shape === s ? "bg-kid-blue/30 ring-4 ring-kid-blue" : "bg-tint"}`}
                >
                  <ShapeIcon shape={s} color={hex(color)} />
                </button>
              ))}
              <div className="flex flex-wrap justify-center gap-1.5" role="group" aria-label="Tile color">
                {TILE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Color ${hex(c)}`}
                    aria-pressed={color === c}
                    onClick={() => {
                      setColor(c);
                      engine.current?.setColor(c);
                      audioManager.playNote(TILE_COLORS.indexOf(c) + 1);
                    }}
                    className={`h-12 w-12 rounded-full border-4 shadow ${color === c ? "border-foreground" : "border-white"}`}
                    style={{ background: hex(c) }}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {FOLDS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={fold === f.id}
                  onClick={() => {
                    setFold(f.id);
                    engine.current?.setFold(f.id);
                    audioManager.playNote(5);
                  }}
                  className={`${btn} ${fold === f.id ? "bg-kid-blue text-white" : "bg-tint text-foreground"}`}
                >
                  {f.label}
                </button>
              ))}
              <button type="button" onClick={() => engine.current?.flipSide()} className={`${btn} bg-tint text-foreground`}>
                ↔ Flip
              </button>
              <span className="mx-1 hidden h-8 w-px bg-black/20 sm:block" />
              <button type="button" onClick={() => engine.current?.undo()} disabled={!info.count} className={`${btn} bg-tint text-foreground disabled:opacity-40`}>
                ↩ Undo
              </button>
              <button type="button" onClick={() => engine.current?.removeSelected()} disabled={!info.selected} className={`${btn} bg-tint text-foreground disabled:opacity-40`}>
                🗑 Remove
              </button>
              <button type="button" onClick={() => engine.current?.clearAll()} disabled={!info.count} className={`${btn} bg-tint text-foreground disabled:opacity-40`}>
                ✨ Clear
              </button>
            </div>
          </div>
        </>
      )}
    </ToyGame>
  );
}
