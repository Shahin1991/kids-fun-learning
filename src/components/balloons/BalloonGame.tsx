"use client";

import { useEffect, useRef, useState } from "react";
import type { BalloonEngine, BalloonOptions } from "@/lib/balloons/BalloonEngine";

export interface BalloonGameProps {
  onPop?: BalloonOptions["onPop"];
  onMilestone?: BalloonOptions["onMilestone"];
  onExit?: () => void;
  reducedMotion?: boolean;
  className?: string;
}

export default function BalloonGame({ onPop, onMilestone, onExit, reducedMotion, className = "" }: BalloonGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<BalloonEngine | null>(null);
  const handlers = useRef({ onPop, onMilestone });
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    handlers.current = { onPop, onMilestone };
  }, [onPop, onMilestone]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    import("@/lib/balloons/BalloonEngine")
      .then(({ BalloonEngine }) => {
        if (cancelled) return;
        const engine = new BalloonEngine(el, {
          reducedMotion,
          onPop: (p) => {
            setTotal(p.total);
            handlers.current.onPop?.(p);
          },
          onMilestone: (p) => handlers.current.onMilestone?.(p),
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

  return (
    <div ref={containerRef} className={`relative touch-none overflow-hidden ${className}`} style={{ position: "relative", overflow: "hidden", touchAction: "none" }}>
      {onExit && (
        <button type="button" aria-label="Exit" onClick={onExit} className="absolute left-3 top-3 flex min-h-touch min-w-touch items-center justify-center rounded-full bg-surface/90 text-3xl shadow active:scale-95">
          ✕
        </button>
      )}
      <div role="status" className="absolute right-3 top-3 flex min-h-touch items-center rounded-full bg-surface/90 px-5 text-3xl font-extrabold text-foreground shadow">
        {failed ? "3D is not available" : `🎈 ${total}`}
      </div>
    </div>
  );
}
