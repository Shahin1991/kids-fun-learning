"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChipRow, GameSettings } from "@/components/board-games/GameSettings";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import type { Opponent, SportEngine, SportHud, SportLevel, SportOptions, SportResult, SportSetup, SportSound } from "@/lib/sports3d/types";

export interface SportsGameProps {
  title: string;
  moduleId: string;
  make: (container: HTMLElement, opts: SportOptions) => Promise<SportEngine>;
  opponents: Opponent[];
  variant: { label: string; options: { id: string; text: string }[]; initial: string };
  /** One-line "how to play" shown until the first game ends. */
  hint: string;
}

const OPPONENT_TEXT: Record<Opponent, string> = { robot: "🤖 Robo", friend: "👫 Friend", solo: "🧒 Just me" };
const LEVELS: { id: SportLevel; text: string }[] = [
  { id: "easy", text: "🐣 Easy" },
  { id: "medium", text: "🐱 Medium" },
  { id: "hard", text: "🦁 Hard" },
];

const strip = (s: string) => s.replace(/[\p{Extended_Pictographic}️]/gu, "").trim();

function playSound(e: SportSound) {
  switch (e.kind) {
    case "clack":
      return audioManager.playSfx("clack", 0.25 + e.strength * 0.75);
    case "cushion":
      return audioManager.playSfx("knock", 0.2 + e.strength * 0.6);
    case "pot":
      return audioManager.playSfx("plunk", 0.8);
    case "throw":
      return audioManager.playSfx("whoosh", 0.6);
    case "thud":
      return audioManager.playSfx("thud", e.strength);
    case "score":
      return audioManager.playNote(Math.min(9, 3 + Math.round(e.strength * 6)));
    case "foul":
      return audioManager.play("failure");
    case "cheer":
      return audioManager.play("reward");
  }
}

/** Full-screen shell for the 3D sports games: canvas, scoreboard, status line, settings and the end panel. */
export default function SportsGame({ title, moduleId, make, opponents, variant, hint }: SportsGameProps) {
  const router = useRouter();
  const reduced = useAppReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SportEngine | null>(null);
  const storeKey = `sports3d-${moduleId}`;
  const [setup, setSetup] = useState<SportSetup>({ opponent: opponents[0], level: "easy", variant: variant.initial });
  const setupRef = useRef(setup);
  const [hud, setHud] = useState<SportHud | null>(null);
  const [result, setResult] = useState<SportResult | null>(null);
  const [failed, setFailed] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const lastSaid = useRef("");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let saved = setupRef.current;
    try {
      const raw = JSON.parse(localStorage.getItem(storeKey) ?? "null") as Partial<SportSetup> | null;
      if (raw) {
        saved = {
          opponent: raw.opponent && opponents.includes(raw.opponent) ? raw.opponent : saved.opponent,
          level: raw.level === "easy" || raw.level === "medium" || raw.level === "hard" ? raw.level : saved.level,
          variant: variant.options.some((o) => o.id === raw.variant) ? raw.variant! : saved.variant,
        };
      }
    } catch {
      // storage can be blocked; defaults are fine
    }
    setupRef.current = saved;
    const t = setTimeout(() => setSetup(saved), 0);
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    make(el, {
      ...saved,
      reducedMotion: reduced,
      onHud: (h) => {
        setHud(h);
        if (h.say && h.say !== lastSaid.current) {
          lastSaid.current = h.say;
          audioManager.speak(strip(h.say));
        }
      },
      onSound: playSound,
      onGameOver: (r) => {
        setResult(r);
        setShowHint(false);
        // Finishing a game earns a star whoever wins; the score saved is the child's.
        void finishActivity(moduleId, { score: r.scores[0] });
      },
    })
      .then((engine) => {
        if (cancelled) return engine.destroy();
        engineRef.current = engine;
        ro = new ResizeObserver(() => engine.resize());
        ro.observe(el);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      clearTimeout(t);
      ro?.disconnect();
      engineRef.current?.destroy();
      engineRef.current = null;
    };
    // Created once; later setting changes go through newGame().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restart = (next: SportSetup = setupRef.current) => {
    setupRef.current = next;
    setSetup(next);
    setResult(null);
    lastSaid.current = "";
    try {
      localStorage.setItem(storeKey, JSON.stringify(next));
    } catch {
      // ignore
    }
    engineRef.current?.newGame(next);
  };

  const players = hud?.players ?? [];

  return (
    <div ref={containerRef} className="relative h-dvh w-full touch-none select-none overflow-hidden" style={{ touchAction: "none" }}>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center gap-2 p-3">
        <div className="flex w-full items-start justify-between gap-2">
          <button type="button" aria-label="Exit" onClick={() => router.push("/")} className="pointer-events-auto flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface text-3xl text-foreground shadow-md active:scale-90">
            ✕
          </button>
          <div className="flex min-w-0 flex-wrap justify-center gap-2" aria-label="Scores">
            {players.map((p, i) => (
              <div key={i} className={`flex items-center gap-1 rounded-2xl px-3 py-1 text-lg font-extrabold shadow-md transition ${hud?.turn === i && players.length > 1 ? "bg-kid-yellow text-ink ring-4 ring-white/70" : "bg-surface/90 text-foreground"}`}>
                <span aria-hidden>{p.icon}</span>
                <span className="max-w-[6rem] truncate">{p.name}</span>
                <span className="tabular-nums">{p.score}</span>
              </div>
            ))}
          </div>
          <div className="pointer-events-auto shrink-0">
            <GameSettings title={`${title} settings`}>
              {(close) => (
                <>
                  {opponents.length > 1 && <ChipRow label="Play with" value={setup.opponent} options={opponents.map((o) => ({ id: o, text: OPPONENT_TEXT[o] }))} onPick={(o) => restart({ ...setup, opponent: o })} />}
                  <ChipRow label={setup.opponent === "robot" ? "Robo's skill & wobble" : "Wobble"} value={setup.level} options={LEVELS} onPick={(l) => restart({ ...setup, level: l })} />
                  <ChipRow label={variant.label} value={setup.variant} options={variant.options} onPick={(v) => restart({ ...setup, variant: v })} />
                  <button
                    type="button"
                    onClick={() => {
                      restart();
                      close();
                    }}
                    className="min-h-14 rounded-2xl bg-kid-green text-xl font-extrabold text-white shadow-md active:scale-95"
                  >
                    🔄 New game
                  </button>
                </>
              )}
            </GameSettings>
          </div>
        </div>
        <div role="status" aria-live="polite" className="max-w-[92vw] rounded-2xl bg-surface/90 px-4 py-2 text-center text-foreground shadow-md">
          <p className="text-lg font-extrabold leading-tight sm:text-xl">{failed ? "3D is not available on this device" : (hud?.message ?? "Loading…")}</p>
          {hud?.detail && <p className="text-base font-bold opacity-80">{hud.detail}</p>}
        </div>
      </div>

      {showHint && !failed && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
          <p className="rounded-2xl bg-black/55 px-4 py-2 text-center text-lg font-bold text-white">{hint}</p>
        </div>
      )}

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 p-4" role="dialog" aria-label="Game over">
            <motion.div initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }} className="flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl bg-surface p-6 text-center text-foreground shadow-2xl">
              <p className="text-3xl font-extrabold">{result.text}</p>
              <div className="flex gap-3 text-xl font-bold">
                {players.map((p, i) => (
                  <span key={i}>
                    {p.icon} {result.scores[i]}
                  </span>
                ))}
              </div>
              <div className="flex w-full gap-3">
                <button type="button" onClick={() => restart()} className="min-h-16 flex-1 rounded-2xl bg-kid-green text-2xl font-extrabold text-white shadow-md active:scale-95">
                  🔄 Again
                </button>
                <button type="button" onClick={() => router.push("/")} className="min-h-16 flex-1 rounded-2xl bg-kid-blue text-2xl font-extrabold text-white shadow-md active:scale-95">
                  🏠 Home
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
