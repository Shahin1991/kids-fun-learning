"use client";

import { useEffect, useRef, useState } from "react";
import type { ParadeEngine, ParadeMode, ParadeOptions } from "@/lib/parade/ParadeEngine";

export interface ParadeGameProps {
  onPrompt?: ParadeOptions["onPrompt"];
  onCorrect?: ParadeOptions["onCorrect"];
  onWrong?: ParadeOptions["onWrong"];
  onExit?: () => void;
  reducedMotion?: boolean;
  className?: string;
}

const ROUND = "flex min-h-touch min-w-touch items-center justify-center rounded-full bg-surface/90 text-3xl shadow active:scale-95";
const PILL = "flex min-h-touch items-center justify-center rounded-3xl px-6 text-2xl font-bold shadow active:scale-95";

export default function ParadeGame({ onPrompt, onCorrect, onWrong, onExit, reducedMotion, className = "" }: ParadeGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ParadeEngine | null>(null);
  const handlers = useRef({ onPrompt, onCorrect, onWrong });
  const [mode, setModeState] = useState<ParadeMode>("letters");
  const [prompt, setPrompt] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    handlers.current = { onPrompt, onCorrect, onWrong };
  }, [onPrompt, onCorrect, onWrong]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    import("@/lib/parade/ParadeEngine")
      .then(({ ParadeEngine }) => {
        if (cancelled) return;
        const engine = new ParadeEngine(el, {
          reducedMotion,
          onPrompt: (p) => {
            setPrompt(p.char);
            handlers.current.onPrompt?.(p);
          },
          onCorrect: (p) => handlers.current.onCorrect?.(p),
          onWrong: (p) => handlers.current.onWrong?.(p),
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

  const pick = (m: ParadeMode) => {
    setModeState(m);
    engineRef.current?.setMode(m);
  };

  return (
    <div ref={containerRef} className={`relative touch-none overflow-hidden ${className}`} style={{ position: "relative", overflow: "hidden", touchAction: "none" }}>
      {onExit && (
        <button type="button" aria-label="Exit" onClick={onExit} className={`${ROUND} absolute left-3 top-3`}>
          ✕
        </button>
      )}
      <button
        type="button"
        onClick={() => engineRef.current?.repeat()}
        aria-label={`Find ${prompt}. Tap to hear it again`}
        className="absolute left-1/2 top-3 flex min-h-touch -translate-x-1/2 items-center gap-3 rounded-full bg-surface/95 px-6 text-3xl font-extrabold text-foreground shadow active:scale-95"
      >
        🔊 {failed ? "3D is not available" : `Find ${prompt}`}
      </button>
      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-3">
        <button type="button" aria-pressed={mode === "letters"} onClick={() => pick("letters")} className={`${PILL} ${mode === "letters" ? "bg-kid-blue text-white" : "bg-surface/90 text-foreground"}`}>
          🔤 Letters
        </button>
        <button type="button" aria-pressed={mode === "numbers"} onClick={() => pick("numbers")} className={`${PILL} ${mode === "numbers" ? "bg-kid-green text-white" : "bg-surface/90 text-foreground"}`}>
          🔢 Numbers
        </button>
      </div>
    </div>
  );
}
