"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArcadeShell, LcdOverlay } from "@/components/arcade/ArcadeShell";
import { DPad } from "@/components/arcade/DPad";
import { useRaf } from "@/components/arcade/useRaf";
import { LCD } from "@/lib/arcade/palette";
import { newSnake, step, tickMs, turn, type Dir, type SnakeState } from "@/lib/arcade/snake";
import { readBest, saveBest } from "@/lib/arcade/storage";
import { audioManager } from "@/lib/audio/AudioManager";

const CELL = 8;
const COLS = 20;
const ROWS = 14;
const KEYS: Record<string, Dir> = { ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down", ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" };

function draw(ctx: CanvasRenderingContext2D, s: SnakeState | null, t: number) {
  ctx.fillStyle = LCD.bg;
  ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);
  if (!s) return;
  ctx.fillStyle = LCD.ink;
  s.body.forEach((p, i) => {
    // The head is a little bigger so it is easy to follow.
    const pad = i === 0 ? 0 : 1;
    ctx.fillRect(p.x * CELL + pad, p.y * CELL + pad, CELL - pad * 2, CELL - pad * 2);
  });
  const f = s.food;
  if (f.x >= 0 && Math.floor(t * 4) % 2 === 0) {
    const cx = f.x * CELL;
    const cy = f.y * CELL;
    ctx.fillRect(cx + 3, cy + 1, 2, 6);
    ctx.fillRect(cx + 1, cy + 3, 6, 2);
  } else if (f.x >= 0) {
    ctx.fillRect(f.x * CELL + 2, f.y * CELL + 2, 4, 4);
  }
}

export default function SnakePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef<SnakeState | null>(null);
  const acc = useRef(0);
  const clock = useRef(0);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setBest(readBest("snake")), 0);
    return () => clearTimeout(t);
  }, []);

  const start = useCallback(() => {
    game.current = newSnake(COLS, ROWS);
    acc.current = 0;
    setScore(0);
    setPhase("playing");
  }, []);

  const press = useCallback(
    (d: Dir) => {
      if (phase !== "playing") return;
      if (game.current) turn(game.current, d);
    },
    [phase],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const d = KEYS[e.key];
      if (d) {
        e.preventDefault();
        if (phase === "playing") press(d);
        else start();
      } else if (e.key === " " || e.key === "Enter") {
        if (phase !== "playing") start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, press, start]);

  useRaf((dt) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    clock.current += dt;
    const s = game.current;
    if (phase === "playing" && s) {
      acc.current += dt * 1000;
      while (acc.current >= tickMs(s.score) && s.alive) {
        acc.current -= tickMs(s.score);
        const r = step(s);
        if (r === "ate") {
          setScore(s.score);
          audioManager.playNote(Math.min(9, s.score % 10));
        } else if (r === "dead") {
          audioManager.play("failure");
          if (saveBest("snake", s.score)) setBest(s.score);
          setPhase("over");
        }
      }
    }
    draw(ctx, s, clock.current);
  });

  return (
    <ArcadeShell
      title="Snake"
      score={score}
      best={best}
      ratio={`${COLS} / ${ROWS}`}
      controls={<DPad onPress={press} />}
    >
      <div
        className="absolute inset-0 touch-none"
        onPointerDown={(e) => {
          swipe.current = { x: e.clientX, y: e.clientY };
          if (phase !== "playing") start();
        }}
        onPointerUp={(e) => {
          const s = swipe.current;
          swipe.current = null;
          if (!s) return;
          const dx = e.clientX - s.x;
          const dy = e.clientY - s.y;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
          press(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
        }}
      >
        <canvas ref={canvasRef} width={COLS * CELL} height={ROWS * CELL} aria-label="Snake game board" className="h-full w-full" style={{ imageRendering: "pixelated" }} />
        {phase !== "playing" && (
          <LcdOverlay>
            {phase === "over" && <p className="text-2xl">GAME OVER</p>}
            {phase === "over" && <p>Score {score}</p>}
            <p className="animate-pulse text-lg">{phase === "over" ? "Tap to play again" : "Tap or press a key to start"}</p>
            <p className="text-sm opacity-70">Swipe or use the arrows</p>
          </LcdOverlay>
        )}
      </div>
    </ArcadeShell>
  );
}
