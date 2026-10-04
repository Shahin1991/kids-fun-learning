"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArcadeShell, LcdOverlay } from "@/components/arcade/ArcadeShell";
import { useRaf } from "@/components/arcade/useRaf";
import { BH, BW, GROUND, H, LIVES, W, drop, hookX, hookY, newBloxx, update, type BloxxState } from "@/lib/arcade/bloxx";
import { LCD } from "@/lib/arcade/palette";
import { readBest, saveBest } from "@/lib/arcade/storage";
import { audioManager } from "@/lib/audio/AudioManager";

function floor(ctx: CanvasRenderingContext2D, x: number, y: number, kind: number) {
  const left = Math.round(x - BW / 2);
  const top = Math.round(y);
  ctx.fillStyle = LCD.ink;
  ctx.fillRect(left, top, BW, BH);
  ctx.fillStyle = LCD.bg;
  // Windows vary a little by floor so the tower looks like a city.
  const n = kind % 3 === 0 ? 3 : kind % 3 === 1 ? 4 : 2;
  const gap = BW / (n + 1);
  for (let i = 1; i <= n; i++) ctx.fillRect(Math.round(left + gap * i - 1), top + 3, 3, 4);
  if (kind === 4) ctx.fillRect(left, top, BW, 1);
}

function draw(ctx: CanvasRenderingContext2D, s: BloxxState, t: number) {
  ctx.fillStyle = LCD.bg;
  ctx.fillRect(0, 0, W, H);
  const cy = Math.round(s.cam);
  ctx.save();
  ctx.translate(0, -cy);
  // ground
  ctx.fillStyle = LCD.ink;
  ctx.fillRect(0, GROUND, W, H + 400);
  ctx.fillStyle = LCD.dim;
  ctx.fillRect(Math.round(s.base - BW / 2 - 2), GROUND - 1, BW + 4, 1);

  // tower sways a touch after each landing
  const sway = Math.sin(t * 18) * s.wobble * 0.15;
  s.tower.forEach((b, i) => {
    floor(ctx, b.x + sway * Math.min(1, (i + 1) / Math.max(1, s.tower.length)), GROUND - (i + 1) * BH, b.kind);
  });

  for (const l of s.lost) {
    ctx.save();
    ctx.translate(l.x, l.y + BH / 2);
    ctx.rotate(l.rot);
    ctx.translate(-l.x, -(l.y + BH / 2));
    floor(ctx, l.x, l.y, 1);
    ctx.restore();
  }

  // crane: rope from the top of the view down to the hook
  const hx = Math.round(hookX(s));
  const hy = Math.round(hookY(s));
  ctx.fillStyle = LCD.ink;
  ctx.fillRect(hx, hy - 400, 1, 400 + 1);
  ctx.fillRect(hx - 2, hy, 5, 2);
  if (s.falling) floor(ctx, s.falling.x, s.falling.y, s.tower.length % 5);
  else if (!s.over) floor(ctx, hx, hy + 2, s.tower.length % 5);
  ctx.restore();
}

export default function CityBloxxPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef<BloxxState>(newBloxx());
  const clock = useRef(0);
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [best, setBest] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setBest(readBest("city-bloxx")), 0);
    return () => clearTimeout(t);
  }, []);

  const start = useCallback(() => {
    game.current = newBloxx();
    setScore(0);
    setLives(LIVES);
    setPhase("playing");
  }, []);

  const act = useCallback(() => {
    if (phase !== "playing") start();
    else drop(game.current);
  }, [phase, start]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter" || e.key === "ArrowDown") {
        e.preventDefault();
        if (!e.repeat) act();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act]);

  useRaf((dt) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    clock.current += dt;
    const s = game.current;
    if (phase === "playing") {
      const ev = update(s, Math.min(dt, 0.05));
      if (ev) {
        setScore(s.score);
        setLives(s.lives);
        if (ev === "perfect") audioManager.playNote(Math.min(9, 4 + s.combo));
        else if (ev === "land") audioManager.playNote(2);
        else audioManager.play("failure");
        if (ev === "over") {
          if (saveBest("city-bloxx", s.score)) setBest(s.score);
          setPhase("over");
        }
      }
    } else update(s, Math.min(dt, 0.05));
    draw(ctx, s, clock.current);
  });

  return (
    <ArcadeShell
      title="City Bloxx"
      score={score}
      best={best}
      extra={<span aria-label={`${lives} lives`}>{"♥".repeat(Math.max(0, lives))}</span>}
      ratio={`${W} / ${H}`}
      controls={
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            act();
          }}
          className="min-h-20 min-w-60 touch-none select-none rounded-3xl bg-slate-800 px-10 py-4 text-3xl font-extrabold text-white shadow-lg active:translate-y-1"
        >
          DROP
        </button>
      }
    >
      <div className="absolute inset-0 touch-none" onPointerDown={() => act()}>
        <canvas ref={canvasRef} width={W} height={H} aria-label="City Bloxx tower" className="h-full w-full" style={{ imageRendering: "pixelated" }} />
        {phase !== "playing" && (
          <LcdOverlay>
            {phase === "over" && <p className="text-2xl">TOWER DONE</p>}
            {phase === "over" && <p>Score {score}</p>}
            <p className="animate-pulse text-lg">{phase === "over" ? "Tap to build again" : "Tap or press space"}</p>
            <p className="px-4 text-sm opacity-70">Drop each block on the tower. Miss three and the city is done.</p>
          </LcdOverlay>
        )}
      </div>
    </ArcadeShell>
  );
}
