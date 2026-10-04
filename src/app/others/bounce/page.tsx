"use client";

import { useEffect, useRef, useState } from "react";
import { ArcadeShell, LcdOverlay } from "@/components/arcade/ArcadeShell";
import { useRaf } from "@/components/arcade/useRaf";
import { newBounce, ringsLeft, stepBounce, type BounceInput, type BounceState } from "@/lib/arcade/bounce";
import { LCD } from "@/lib/arcade/palette";
import { readBest, saveBest } from "@/lib/arcade/storage";
import { audioManager } from "@/lib/audio/AudioManager";

const T = 8;
const VIEW_COLS = 20;
const VIEW_ROWS = 10;

function draw(ctx: CanvasRenderingContext2D, s: BounceState | null, t: number) {
  ctx.fillStyle = LCD.bg;
  ctx.fillRect(0, 0, VIEW_COLS * T, VIEW_ROWS * T);
  if (!s) return;
  const cam = Math.max(0, Math.min(s.cols - VIEW_COLS, s.ball.x - VIEW_COLS / 2));
  const ox = -Math.round(cam * T);
  ctx.fillStyle = LCD.ink;
  ctx.strokeStyle = LCD.ink;
  ctx.lineWidth = 1;
  const open = ringsLeft(s) === 0;
  for (let r = 0; r < VIEW_ROWS; r++) {
    for (let c = Math.max(0, Math.floor(cam) - 1); c < Math.min(s.cols, Math.floor(cam) + VIEW_COLS + 2); c++) {
      const ch = s.map[r][c];
      const x = c * T + ox;
      const y = r * T;
      if (ch === "#") {
        ctx.fillRect(x, y, T, T);
        ctx.fillStyle = LCD.bg;
        ctx.fillRect(x + 1, y + 3, T - 2, 1);
        ctx.fillRect(x + 3, y + 1, 1, 2);
        ctx.fillRect(x + 5, y + 4, 1, 3);
        ctx.fillStyle = LCD.ink;
      } else if (ch === "^") {
        ctx.beginPath();
        ctx.moveTo(x, y + T);
        ctx.lineTo(x + T / 2, y + 2);
        ctx.lineTo(x + T, y + T);
        ctx.closePath();
        ctx.fill();
      } else if (ch === "o" && !s.collected.has(`${c},${r}`)) {
        const bob = Math.sin(t * 4 + c) * 0.6;
        ctx.beginPath();
        ctx.arc(x + T / 2, y + T / 2 + bob, 2.6, 0, Math.PI * 2);
        ctx.stroke();
      } else if (ch === "E") {
        ctx.strokeRect(x + 1.5, y + 0.5, T - 3, T - 1);
        if (open) ctx.fillRect(x + 2, y + 1, T - 4, T - 2);
      }
    }
  }
  // The ball
  const bx = s.ball.x * T + ox;
  const by = s.ball.y * T;
  ctx.fillStyle = LCD.ink;
  ctx.beginPath();
  ctx.arc(bx, by, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = LCD.bg;
  ctx.fillRect(Math.round(bx) - 2, Math.round(by) - 2, 1, 1);
}

const BTN = "flex h-20 touch-none select-none items-center justify-center rounded-2xl bg-slate-700 text-4xl text-white shadow-lg active:scale-95 active:bg-slate-500";

export default function BouncePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef<BounceState | null>(null);
  const input = useRef<BounceInput>({ left: false, right: false, jump: false });
  const clock = useRef(0);
  const [phase, setPhase] = useState<"ready" | "playing" | "complete" | "over" | "won">("ready");
  const [hud, setHud] = useState({ score: 0, lives: 3, rings: 0, level: 1 });
  const [best, setBest] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setBest(readBest("bounce")), 0);
    return () => clearTimeout(t);
  }, []);

  const sync = (s: BounceState) => setHud({ score: s.score, lives: s.lives, rings: ringsLeft(s), level: s.level + 1 });

  const begin = (level: number, lives: number, score: number) => {
    game.current = newBounce(level, lives, score);
    sync(game.current);
    setPhase("playing");
  };

  useEffect(() => {
    const map: Record<string, keyof BounceInput> = { ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right", ArrowUp: "jump", w: "jump", W: "jump", " ": "jump" };
    const set = (e: KeyboardEvent, v: boolean) => {
      const k = map[e.key];
      if (!k) return;
      e.preventDefault();
      input.current[k] = v;
    };
    const down = (e: KeyboardEvent) => set(e, true);
    const up = (e: KeyboardEvent) => set(e, false);
    const release = () => (input.current = { left: false, right: false, jump: false });
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", release);
    };
  }, []);

  useRaf((dt) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    clock.current += dt;
    const s = game.current;
    if (phase === "playing" && s) {
      for (const e of stepBounce(s, input.current, dt)) {
        if (e === "ring") audioManager.playNote(Math.min(9, s.collected.size % 10));
        else if (e === "jump") audioManager.playNote(6);
        else if (e === "die") audioManager.play("failure");
        else if (e === "complete") audioManager.play("success");
        else if (e === "won") audioManager.play("reward");
        else if (e === "over") audioManager.play("failure");
      }
      sync(s);
      if (s.status !== "playing") {
        if (saveBest("bounce", s.score)) setBest(s.score);
        setPhase(s.status);
      }
    }
    draw(ctx, s, clock.current);
  });

  const hold = (k: keyof BounceInput) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      input.current[k] = true;
    },
    onPointerUp: () => (input.current[k] = false),
    onPointerCancel: () => (input.current[k] = false),
    onLostPointerCapture: () => (input.current[k] = false),
  });

  const s = game.current;
  return (
    <ArcadeShell
      title="Bounce"
      score={hud.score}
      best={best}
      ratio={`${VIEW_COLS} / ${VIEW_ROWS}`}
      extra={`Lv ${hud.level} · ${"♥".repeat(Math.max(0, hud.lives))} · ◯ ${hud.rings}`}
      controls={
        <div className="flex w-full max-w-md items-end justify-between gap-3">
          <div className="flex gap-2">
            <button type="button" aria-label="Roll left" className={`${BTN} w-20`} {...hold("left")}>◀</button>
            <button type="button" aria-label="Roll right" className={`${BTN} w-20`} {...hold("right")}>▶</button>
          </div>
          <button type="button" aria-label="Jump" className={`${BTN} w-32 bg-kid-red text-2xl font-extrabold`} {...hold("jump")}>JUMP</button>
        </div>
      }
    >
      <canvas ref={canvasRef} width={VIEW_COLS * T} height={VIEW_ROWS * T} aria-label="Bounce game screen" className="h-full w-full" style={{ imageRendering: "pixelated" }} />
      {phase !== "playing" && (
        <LcdOverlay>
          <div
            className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2"
            onPointerDown={() => {
              if (phase === "complete" && s) begin(s.level + 1, s.lives, s.score);
              else begin(0, 3, 0);
            }}
          >
            {phase === "over" && <p className="text-2xl">GAME OVER</p>}
            {phase === "won" && <p className="text-2xl">YOU WIN!</p>}
            {phase === "complete" && <p className="text-2xl">LEVEL CLEAR!</p>}
            <p className="animate-pulse text-lg">{phase === "complete" ? "Tap for the next level" : phase === "ready" ? "Tap to start" : "Tap to play again"}</p>
            <p className="px-4 text-sm opacity-70">Collect every ◯, then reach the door. Avoid ▲.</p>
          </div>
        </LcdOverlay>
      )}
    </ArcadeShell>
  );
}
