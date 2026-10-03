"use client";

import { useEffect, useRef, useState } from "react";
import type { BlockTowerEngine, TowerMode, TowerOptions, TowerState } from "@/lib/block-tower/BlockTowerEngine";

export interface BlockTowerGameProps {
  onMilestone?: TowerOptions["onMilestone"];
  onSound?: TowerOptions["onSound"];
  onExit?: () => void;
  reducedMotion?: boolean;
  className?: string;
}

const ROUND = "flex min-h-touch min-w-touch items-center justify-center rounded-full bg-surface/90 text-3xl shadow active:scale-95";
const PILL = "flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-3xl px-5 text-2xl font-bold shadow active:scale-95";

export default function BlockTowerGame({ onMilestone, onSound, onExit, reducedMotion, className = "" }: BlockTowerGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<BlockTowerEngine | null>(null);
  const handlers = useRef({ onMilestone, onSound });
  const [state, setState] = useState<TowerState>({ blocks: 0, height: 0 });
  const [mode, setModeState] = useState<TowerMode>("build");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    handlers.current = { onMilestone, onSound };
  }, [onMilestone, onSound]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    import("@/lib/block-tower/BlockTowerEngine")
      .then(({ BlockTowerEngine }) => {
        if (cancelled) return;
        const engine = new BlockTowerEngine(el, {
          reducedMotion,
          onState: setState,
          onMilestone: (m) => handlers.current.onMilestone?.(m),
          onSound: (e) => handlers.current.onSound?.(e),
        });
        engineRef.current = engine;
        ro = new ResizeObserver(() => engine.resize());
        ro.observe(el);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      ro?.disconnect();
      engineRef.current?.destroy();
      engineRef.current = null;
    };
    // Created once; the reduced-motion flag is read at start-up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = failed
    ? "3D is not available on this device"
    : state.blocks === 0
      ? "Drag, then let go to drop a block"
      : `Blocks: ${state.blocks} · Height: ${state.height} m`;

  return (
    <div ref={containerRef} className={`relative touch-none overflow-hidden ${className}`} style={{ position: "relative", overflow: "hidden", touchAction: "none" }}>
      {onExit && (
        <button type="button" aria-label="Exit" onClick={onExit} className={`${ROUND} absolute left-3 top-3`}>
          ✕
        </button>
      )}
      <div role="status" className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-surface/90 px-5 py-2 text-xl font-bold text-foreground shadow">
        {status}
      </div>
      <button type="button" aria-label="Start over" onClick={() => engineRef.current?.reset()} className={`${ROUND} absolute right-3 top-3`}>
        ↺
      </button>
      <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-3">
        <button
          type="button"
          aria-pressed={mode === "build"}
          onClick={() => {
            setModeState("build");
            engineRef.current?.setMode("build");
          }}
          className={`${PILL} ${mode === "build" ? "bg-kid-blue text-white" : "bg-surface/90 text-foreground"}`}
        >
          🧱 Build
        </button>
        <button
          type="button"
          aria-pressed={mode === "knock"}
          onClick={() => {
            setModeState("knock");
            engineRef.current?.setMode("knock");
          }}
          className={`${PILL} ${mode === "knock" ? "bg-kid-orange text-white" : "bg-surface/90 text-foreground"}`}
        >
          👆 Poke
        </button>
        <button type="button" onClick={() => engineRef.current?.boom()} className={`${PILL} bg-kid-red text-white`}>
          💥 Boom!
        </button>
      </div>
    </div>
  );
}
