"use client";

import type { ReactNode } from "react";
import { HomeButton } from "@/components/HomeButton";
import { SoundToggle } from "@/components/SoundToggle";
import { LCD } from "@/lib/arcade/palette";

export interface ArcadeShellProps {
  title: string;
  score: number;
  best: number;
  /** Extra HUD text, e.g. lives */
  extra?: ReactNode;
  /** Retro screen content (the canvas) */
  children: ReactNode;
  /** On-screen buttons below the screen */
  controls?: ReactNode;
  /** Screen shape; defaults to the wide Nokia-style ratio */
  ratio?: string;
}

/** Old-phone frame shared by the retro games: header, LCD screen, and a control area. */
export function ArcadeShell({ title, score, best, extra, children, controls, ratio = "10 / 7" }: ArcadeShellProps) {
  const [w, h] = ratio.split("/").map((n) => Number(n.trim()));
  const num = w / (h || 1);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-3 p-3">
      <header className="flex items-center justify-between gap-2">
        <HomeButton />
        <h1 className="flex-1 text-center text-2xl font-extrabold sm:text-3xl">{title}</h1>
        <SoundToggle />
      </header>
      <div className="flex items-center justify-center gap-2 text-lg font-extrabold sm:text-xl" role="status" aria-live="off">
        <span className="rounded-full bg-surface px-4 py-1 shadow">Score {score}</span>
        <span className="rounded-full bg-surface px-4 py-1 shadow">Best {best}</span>
        {extra && <span className="rounded-full bg-surface px-4 py-1 shadow">{extra}</span>}
      </div>
      {/* The screen never grows so tall that the controls fall off a short window. */}
      <div className="mx-auto w-full rounded-[2rem] bg-slate-800 p-3 shadow-xl" style={{ maxWidth: `max(16rem, calc((100dvh - ${controls ? 25 : 12}rem) * ${num}))` }}>
        <div className="relative w-full overflow-hidden rounded-xl" style={{ background: LCD.bg, aspectRatio: ratio, border: "4px solid #1f2a16" }}>
          {children}
        </div>
      </div>
      {controls && <div className="flex flex-1 items-center justify-center pb-3">{controls}</div>}
    </main>
  );
}

/** Full-size overlay inside the LCD for start and game-over messages. */
export function LcdOverlay({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center font-mono font-bold" style={{ background: "rgba(199,217,165,0.88)", color: LCD.ink }}>
      {children}
    </div>
  );
}
