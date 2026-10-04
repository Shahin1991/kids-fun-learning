"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { HomeButton } from "@/components/HomeButton";
import { ProgressStars } from "@/components/ProgressStars";
import { SoundToggle } from "@/components/SoundToggle";
import type { ToyEngine } from "@/lib/toy3d/ToyScene";

export interface ToyGameProps {
  /** Creates the engine inside `container`; called once, on the client only. */
  create: (container: HTMLElement) => Promise<ToyEngine>;
  title: string;
  moduleId?: string;
  /** Mirrored as hidden buttons so keyboard and screen-reader users can play too. */
  items?: { id: string; label: string }[];
  className?: string;
  /** Overlay content; a function receives the engine once it exists. */
  children?: ReactNode | ((engine: ToyEngine | null) => ReactNode);
}

/** Shared shell for the 3D toy games: canvas host, header, fallback and teardown. */
export default function ToyGame({ create, title, moduleId, items, className = "", children }: ToyGameProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<ToyEngine | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    let cancelled = false;
    let made: ToyEngine | null = null;
    let ro: ResizeObserver | null = null;
    create(el)
      .then((e) => {
        if (cancelled) {
          e.destroy();
          return;
        }
        made = e;
        setEngine(e);
        ro = new ResizeObserver(() => e.resize());
        ro.observe(el);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      ro?.disconnect();
      made?.destroy();
      setEngine(null);
    };
    // The engine is created once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`relative h-dvh w-full touch-none overflow-hidden ${className}`} style={{ position: "relative", overflow: "hidden", touchAction: "none" }}>
      <div ref={hostRef} role="application" aria-label={title} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
        <div className="pointer-events-auto">
          <HomeButton />
        </div>
        <h1 className="mt-2 max-w-[42%] truncate rounded-full bg-surface/90 px-4 py-2 text-lg font-extrabold text-foreground shadow sm:max-w-none sm:px-5 sm:text-2xl">{failed ? "3D is not available on this device" : title}</h1>
        <div className="pointer-events-auto flex items-center gap-2">
          {moduleId && <ProgressStars moduleId={moduleId} />}
          <SoundToggle />
        </div>
      </div>
      {items && engine?.activate && (
        <div className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:bottom-3 focus-within:left-3 focus-within:z-20 focus-within:flex focus-within:flex-wrap focus-within:gap-2 focus-within:rounded-2xl focus-within:bg-surface/95 focus-within:p-2">
          {items.map((it) => (
            <button key={it.id} type="button" onClick={() => engine.activate?.(it.id)} className="rounded-xl bg-kid-blue px-3 py-2 font-bold text-white">
              {it.label}
            </button>
          ))}
        </div>
      )}
      {typeof children === "function" ? children(engine) : children}
    </div>
  );
}
