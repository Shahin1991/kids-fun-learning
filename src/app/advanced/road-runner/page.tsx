"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityHeader } from "@/components/ActivityHeader";
import { Button } from "@/components/Button";
import { PageContainer } from "@/components/PageContainer";
import { audioManager } from "@/lib/audio/AudioManager";
import { finishActivity } from "@/lib/activity";

// Deviates from the no-fail-states principle on purpose: 3 lives, then game over.
const W = 360;
const H = 560;
const LANE_W = W / 3;
const PLAYER_Y = H - 90;
const LIVES = 3;

interface Thing {
  lane: number;
  y: number;
  kind: "rock" | "cone" | "star";
}

interface Game {
  lane: number;
  things: Thing[];
  score: number;
  lives: number;
  speed: number;
  spawnIn: number;
  hurtUntil: number;
  offset: number;
  last: number;
  hudAt: number;
}

const FACE = { rock: "🪨", cone: "🚧", star: "⭐" } as const;

function newGame(): Game {
  return { lane: 1, things: [], score: 0, lives: LIVES, speed: 180, spawnIn: 0.8, hurtUntil: 0, offset: 0, last: 0, hudAt: 0 };
}

export default function RoadRunnerPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef<Game>(newGame());
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  const [hud, setHud] = useState({ score: 0, lives: LIVES });
  const [final, setFinal] = useState(0);

  const steer = useCallback((dir: -1 | 1) => {
    const g = game.current;
    g.lane = Math.max(0, Math.min(2, g.lane + dir));
  }, []);

  const start = () => {
    game.current = newGame();
    setHud({ score: 0, lives: LIVES });
    setPhase("playing");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") steer(-1);
      if (e.key === "ArrowRight" || e.key === "d") steer(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [steer]);

  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let raf = 0;

    const frame = (now: number) => {
      const g = game.current;
      const dt = g.last ? Math.min(0.05, (now - g.last) / 1000) : 0;
      g.last = now;
      g.speed = 180 + g.score * 1.5;
      g.offset = (g.offset + g.speed * dt) % 60;
      g.spawnIn -= dt;
      if (g.spawnIn <= 0) {
        const r = Math.random();
        g.things.push({ lane: Math.floor(Math.random() * 3), y: -30, kind: r < 0.25 ? "star" : r < 0.6 ? "cone" : "rock" });
        g.spawnIn = Math.max(0.45, 1 - g.score / 400);
      }
      for (const t of g.things) t.y += g.speed * dt;
      g.things = g.things.filter((t) => {
        if (t.y > H + 30) return false;
        if (t.lane === g.lane && Math.abs(t.y - PLAYER_Y) < 38) {
          if (t.kind === "star") {
            g.score += 10;
            audioManager.playNote(Math.min(9, Math.floor(g.score / 20)));
            return false;
          }
          if (now > g.hurtUntil) {
            g.lives -= 1;
            g.hurtUntil = now + 1200;
            audioManager.play("failure");
          }
          return false;
        }
        return true;
      });
      g.score += dt * 5;

      ctx.fillStyle = "#4b5563";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fff";
      for (let l = 1; l < 3; l++) for (let y = -60 + g.offset; y < H; y += 60) ctx.fillRect(l * LANE_W - 2, y, 4, 30);
      ctx.font = "44px serif";
      for (const t of g.things) ctx.fillText(FACE[t.kind], t.lane * LANE_W + LANE_W / 2, t.y);
      if (now > g.hurtUntil || Math.floor(now / 100) % 2 === 0) ctx.fillText("🏎️", g.lane * LANE_W + LANE_W / 2, PLAYER_Y);

      if (now - g.hudAt > 100) {
        g.hudAt = now;
        setHud({ score: Math.floor(g.score), lives: g.lives });
      }
      if (g.lives <= 0) {
        const s = Math.floor(g.score);
        setHud({ score: s, lives: 0 });
        setFinal(s);
        setPhase("over");
        void finishActivity("road-runner", { score: s });
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  return (
    <PageContainer className="items-center">
      <ActivityHeader title="Road Runner" moduleId="road-runner" />
      <p className="text-center text-sm opacity-70">Challenge game: you have 3 lives. Collect ⭐, dodge 🪨 and 🚧.</p>
      <div className="flex w-full max-w-sm justify-between text-2xl font-bold" aria-live="off">
        <span>Score {hud.score}</span>
        <span aria-label={`${hud.lives} lives`}>{"❤️".repeat(hud.lives) || "—"}</span>
      </div>
      <div className="relative w-full max-w-sm">
        <canvas
          ref={canvasRef}
          width={W * 2}
          height={H * 2}
          aria-label="Road Runner game"
          className="w-full touch-none rounded-3xl"
          onPointerDown={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            steer(e.clientX - r.left < r.width / 2 ? -1 : 1);
          }}
        />
        {phase !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl bg-black/50 text-center text-white">
            {phase === "over" && <p className="text-3xl font-extrabold">Game over · {final} points</p>}
            <Button onClick={start}>{phase === "over" ? "Try again" : "Start"}</Button>
          </div>
        )}
      </div>
      <div className="flex w-full max-w-sm gap-4">
        <Button className="flex-1" aria-label="Left" onClick={() => steer(-1)}>◀</Button>
        <Button className="flex-1" aria-label="Right" onClick={() => steer(1)}>▶</Button>
      </div>
    </PageContainer>
  );
}
