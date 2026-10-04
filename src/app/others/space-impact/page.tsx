"use client";

import { useEffect, useRef, useState } from "react";
import { ArcadeShell, LcdOverlay } from "@/components/arcade/ArcadeShell";
import { useRaf } from "@/components/arcade/useRaf";
import { LCD } from "@/lib/arcade/palette";
import { H, newSpace, stepSpace, W, type SpaceInput, type SpaceState } from "@/lib/arcade/space";
import { readBest, saveBest } from "@/lib/arcade/storage";
import { audioManager } from "@/lib/audio/AudioManager";

const stars = Array.from({ length: 24 }, (_, i) => ({ x: (i * 37) % W, y: (i * 53) % H, s: 6 + (i % 4) * 7 }));

function draw(ctx: CanvasRenderingContext2D, s: SpaceState | null, t: number) {
  ctx.fillStyle = LCD.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = LCD.dim;
  for (const st of stars) ctx.fillRect(Math.floor((((st.x - t * st.s) % W) + W) % W), st.y, 1, 1);
  if (!s) return;
  ctx.fillStyle = LCD.ink;

  // Pickups
  for (const k of s.pickups) {
    ctx.strokeRect(k.x + 0.5, k.y + 0.5, k.w - 1, k.h - 1);
    ctx.fillRect(k.x + 2, k.y + 2, k.kind === "life" ? 3 : 4, k.kind === "life" ? 3 : 2);
  }

  // Enemies
  for (const e of s.enemies) {
    if (e.kind === "drone") {
      ctx.beginPath();
      ctx.arc(e.x + 4, e.y + 3.5, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = LCD.bg;
      ctx.fillRect(e.x + 2, e.y + 3, 2, 1);
      ctx.fillStyle = LCD.ink;
    } else if (e.kind === "fighter") {
      ctx.beginPath();
      ctx.moveTo(e.x, e.y + 4);
      ctx.lineTo(e.x + 10, e.y);
      ctx.lineTo(e.x + 7, e.y + 4);
      ctx.lineTo(e.x + 10, e.y + 8);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(e.x + 3, e.y, 2, 8);
      ctx.fillRect(e.x, e.y + 3, 8, 2);
    }
  }

  // Boss
  if (s.boss) {
    const b = s.boss;
    ctx.fillRect(b.x, b.y + 4, b.w, b.h - 8);
    ctx.fillRect(b.x - 4, b.y + b.h / 2 - 2, 6, 4);
    ctx.fillRect(b.x + 4, b.y, 10, 4);
    ctx.fillRect(b.x + 4, b.y + b.h - 4, 10, 4);
    ctx.fillStyle = LCD.bg;
    ctx.fillRect(b.x + 6, b.y + 8, 4, 3);
    ctx.fillStyle = LCD.ink;
    ctx.strokeRect(W / 2 - 24 + 0.5, 3.5, 48, 4);
    ctx.fillRect(W / 2 - 23, 4.5, Math.max(0, (46 * b.hp) / b.maxHp), 2);
  }

  // Bullets
  for (const b of s.bullets) ctx.fillRect(b.x, b.y, b.w, b.h);
  for (const b of s.enemyBullets) ctx.fillRect(b.x, b.y, b.w, b.h);

  // The ship blinks while invulnerable
  const p = s.player;
  if (p.invuln <= 0 || Math.floor(t * 12) % 2 === 0) {
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 12, p.y + 3.5);
    ctx.lineTo(p.x, p.y + 7);
    ctx.lineTo(p.x + 3, p.y + 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(p.x - 2, p.y + 2.5, 3, 2);
  }
}

const BTN = "flex h-20 touch-none select-none items-center justify-center rounded-2xl bg-slate-700 text-3xl text-white shadow-lg active:scale-95 active:bg-slate-500";

export default function SpaceImpactPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef<SpaceState | null>(null);
  const input = useRef<SpaceInput>({ up: false, down: false, left: false, right: false, fire: false, missile: false });
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const clock = useRef(0);
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  const [hud, setHud] = useState({ score: 0, lives: 3, missiles: 3, level: 1 });
  const [best, setBest] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setBest(readBest("space-impact")), 0);
    return () => clearTimeout(t);
  }, []);

  const begin = () => {
    game.current = newSpace();
    setPhase("playing");
  };

  useEffect(() => {
    const map: Record<string, keyof SpaceInput> = { ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down", ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right", " ": "fire", m: "missile", M: "missile", Shift: "missile" };
    const set = (e: KeyboardEvent, v: boolean) => {
      const k = map[e.key];
      if (!k) return;
      e.preventDefault();
      input.current[k] = v;
    };
    const down = (e: KeyboardEvent) => set(e, true);
    const up = (e: KeyboardEvent) => set(e, false);
    const release = () => (input.current = { up: false, down: false, left: false, right: false, fire: false, missile: false });
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
      const events = stepSpace(s, input.current, dt);
      input.current.missile = false; // a missile press counts once
      for (const e of events) {
        if (e === "missile") audioManager.playNote(2);
        else if (e === "kill") audioManager.playNote(7);
        else if (e === "hit") audioManager.play("failure");
        else if (e === "pickup") audioManager.play("success");
        else if (e === "bossdown") audioManager.play("reward");
        else if (e === "over") audioManager.play("failure");
      }
      setHud({ score: s.score, lives: s.lives, missiles: s.missiles, level: s.level });
      if (s.status === "over") {
        if (saveBest("space-impact", s.score)) setBest(s.score);
        setPhase("over");
      }
    }
    draw(ctx, s, clock.current);
  });

  const hold = (k: keyof SpaceInput) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      input.current[k] = true;
    },
    onPointerUp: () => (input.current[k] = k === "missile" ? input.current[k] : false),
    onPointerCancel: () => (input.current[k] = false),
    onLostPointerCapture: () => (k === "missile" ? undefined : (input.current[k] = false)),
  });

  return (
    <ArcadeShell
      title="Space Impact"
      score={hud.score}
      best={best}
      ratio={`${W} / ${H}`}
      extra={`Lv ${hud.level} · ${"♥".repeat(Math.max(0, hud.lives))} · 🚀 ${hud.missiles}`}
      controls={
        <div className="flex w-full max-w-lg items-end justify-between gap-3">
          <div className="grid grid-cols-3 grid-rows-2 gap-1.5">
            <button type="button" aria-label="Up" className={`${BTN} col-start-2 row-start-1 w-20`} {...hold("up")}>▲</button>
            <button type="button" aria-label="Left" className={`${BTN} col-start-1 row-start-2 w-20`} {...hold("left")}>◀</button>
            <button type="button" aria-label="Down" className={`${BTN} col-start-2 row-start-2 w-20`} {...hold("down")}>▼</button>
            <button type="button" aria-label="Right" className={`${BTN} col-start-3 row-start-2 w-20`} {...hold("right")}>▶</button>
          </div>
          <div className="flex flex-col gap-2">
            <button type="button" aria-label="Missile" className={`${BTN} w-28 bg-kid-orange text-xl font-extrabold`} {...hold("missile")}>🚀</button>
            <button type="button" aria-label="Fire" className={`${BTN} w-28 bg-kid-red text-xl font-extrabold`} {...hold("fire")}>FIRE</button>
          </div>
        </div>
      }
    >
      <div
        className="absolute inset-0 touch-none"
        onPointerDown={(e) => {
          if (phase !== "playing") return begin();
          const s = game.current;
          const box = e.currentTarget.getBoundingClientRect();
          if (s) drag.current = { dx: s.player.x - ((e.clientX - box.left) / box.width) * W, dy: s.player.y - ((e.clientY - box.top) / box.height) * H };
          input.current.fire = true;
        }}
        onPointerMove={(e) => {
          const s = game.current;
          if (!drag.current || !s) return;
          const box = e.currentTarget.getBoundingClientRect();
          s.player.x = Math.max(0, Math.min(W * 0.55, ((e.clientX - box.left) / box.width) * W + drag.current.dx));
          s.player.y = Math.max(0, Math.min(H - s.player.h, ((e.clientY - box.top) / box.height) * H + drag.current.dy));
        }}
        onPointerUp={() => {
          drag.current = null;
          input.current.fire = false;
        }}
        onPointerCancel={() => {
          drag.current = null;
          input.current.fire = false;
        }}
      >
        <canvas ref={canvasRef} width={W} height={H} aria-label="Space Impact screen" className="h-full w-full" style={{ imageRendering: "pixelated" }} />
        {phase !== "playing" && (
          <LcdOverlay>
            {phase === "over" && <p className="text-2xl">GAME OVER</p>}
            {phase === "over" && <p>Score {hud.score}</p>}
            <p className="animate-pulse text-lg">{phase === "over" ? "Tap to play again" : "Tap to start"}</p>
            <p className="px-4 text-sm opacity-70">Drag the screen to fly and shoot, or use the buttons</p>
          </LcdOverlay>
        )}
      </div>
    </ArcadeShell>
  );
}
