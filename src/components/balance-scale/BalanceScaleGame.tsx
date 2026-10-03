"use client";

import { useEffect, useRef, useState } from "react";
import type { BalanceGameModule, BalanceState } from "@/lib/balance-scale/BalanceGameModule";

export interface BalanceScaleGameProps {
  sharedAudioCtx?: AudioContext;
  mode?: "sandbox" | "challenge";
  targetWeight?: number;
  onBalanced?: (r: { leftWeight: number; rightWeight: number; moves: number }) => void;
  onExit?: () => void;
  className?: string;
}

const PILL = "absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-surface/90 px-5 py-2 text-xl font-bold text-foreground shadow";
const ROUND_BTN = "absolute top-3 flex min-h-touch min-w-touch items-center justify-center rounded-full bg-surface/90 text-3xl shadow active:scale-95";

export default function BalanceScaleGame({ sharedAudioCtx, mode = "sandbox", targetWeight, onBalanced, onExit, className = "" }: BalanceScaleGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<BalanceGameModule | null>(null);
  const balancedRef = useRef(onBalanced);
  const [state, setState] = useState<BalanceState>({ left: 0, right: 0, balanced: false });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    balancedRef.current = onBalanced;
  }, [onBalanced]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    import("@/lib/balance-scale/BalanceGameModule")
      .then(({ BalanceGameModule }) => {
        if (cancelled) return;
        const engine = new BalanceGameModule(el, {
          sharedAudioCtx,
          mode,
          targetWeight,
          onState: setState,
          onBalanced: (r) => balancedRef.current?.(r),
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
    // The engine is created once; mode and target changes go through setMode below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setMode(mode, targetWeight);
  }, [mode, targetWeight]);

  const status = state.balanced
    ? "Balanced! 🎉"
    : mode === "challenge"
      ? `Left: ${state.left} | Right: ${state.right > 0 ? state.right : "?"}`
      : "Make both sides equal";

  return (
    <div ref={containerRef} className={`relative touch-none overflow-hidden ${className}`} style={{ position: "relative", overflow: "hidden", touchAction: "none" }}>
      {onExit && (
        <button type="button" aria-label="Exit" onClick={onExit} className={`${ROUND_BTN} left-3`}>
          ✕
        </button>
      )}
      <div role="status" className={PILL}>{failed ? "3D is not available on this device" : status}</div>
      <button type="button" aria-label="Reset" onClick={() => engineRef.current?.reset()} className={`${ROUND_BTN} right-3`}>
        ↺
      </button>
    </div>
  );
}
