"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import { clueProgress, clueText, DIRS, makeMap, step, walkable, type Cell, type Dir, type Tile, type TreasureMap as IslandMap } from "@/lib/treasure-map/map";

const MODULE_ID = "treasure-map";
const STAR_EVERY = 2;

const TILE_ART: Record<Tile, string> = { sand: "", water: "", palm: "🌴", rock: "🪨", hut: "🛖" };

function Compass({ onMove, onRestart, disabled }: { onMove: (d: Dir) => void; onRestart: () => void; disabled: boolean }) {
  const btn = (d: Dir, cls: string) => (
    <button type="button" onClick={() => onMove(d)} disabled={disabled} aria-label={DIRS[d].name} className={`absolute flex h-20 w-20 flex-col items-center justify-center rounded-3xl bg-kid-blue text-white shadow-md active:scale-90 disabled:opacity-50 ${cls}`}>
      <span className="text-3xl font-extrabold leading-none">{d}</span>
      <span className="text-xs font-bold">{DIRS[d].name}</span>
    </button>
  );
  return (
    <div className="relative h-60 w-60 shrink-0" aria-label="Compass">
      <button type="button" onClick={onRestart} disabled={disabled} aria-label="Start again" className="absolute inset-[4.5rem] flex flex-col items-center justify-center rounded-full bg-surface text-2xl font-extrabold shadow-inner active:scale-90 disabled:opacity-40">
        🧭<span className="text-xs">↺ start</span>
      </button>
      {btn("N", "left-20 top-0")}
      {btn("S", "bottom-0 left-20")}
      {btn("W", "left-0 top-20")}
      {btn("E", "right-0 top-20")}
    </div>
  );
}

export default function TreasureMap() {
  const reduced = useAppReducedMotion();
  const [found, setFound] = useState(0);
  const [map, setMap] = useState<IslandMap>(() => makeMap(0));
  const [pos, setPos] = useState<Cell>(map.start);
  const [taken, setTaken] = useState<Dir[]>([]);
  const [bump, setBump] = useState(0);
  const [dug, setDug] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const showX = found === 0;
  const progress = clueProgress(map.clues, taken);
  const onTrack = taken.length === map.clues.slice(0, progress.clue).reduce((n, c) => n + c.steps, 0) + progress.stepInClue;

  const readClues = (m: IslandMap) => audioManager.speak(`Ahoy! ${m.clues.map(clueText).join(". Then ")}. North is up!`);

  useEffect(() => {
    const t = setTimeout(() => readClues(map), 500);
    return () => clearTimeout(t);
    // Only the first map; later maps are read as they appear.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restart = () => {
    setPos(map.start);
    setTaken([]);
    audioManager.playNote(0);
    audioManager.speak(`Back to the start. ${clueText(map.clues[0])}.`);
  };

  const move = (d: Dir) => {
    if (dug) return;
    const next = step(pos, d);
    if (!walkable(map, next)) {
      setBump((b) => b + 1);
      audioManager.play("failure");
      const offMap = next.x < 0 || next.y < 0 || next.x >= map.size || next.y >= map.size;
      audioManager.speak(offMap ? "That's the edge of the map!" : "Splash! That's water. We can't walk there.");
      return;
    }
    const nextTaken = [...taken, d];
    setPos(next);
    setTaken(nextTaken);
    audioManager.playNote(Math.min(9, nextTaken.length));
    if (next.x === map.treasure.x && next.y === map.treasure.y) {
      setDug(true);
      const n = found + 1;
      // A star round plays the jingle with its celebration
      const star = n % STAR_EVERY === 0;
      timers.current.push(
        setTimeout(() => {
          if (!star) audioManager.play("reward");
          audioManager.speak("X marks the spot! You found the treasure!");
        }, 400),
      );
      if (star) void finishActivity(MODULE_ID, { score: n });
      timers.current.push(
        setTimeout(() => {
          const m = makeMap(n);
          setFound(n);
          setMap(m);
          setPos(m.start);
          setTaken([]);
          setDug(false);
          readClues(m);
        }, 4500),
      );
      return;
    }
    const p = clueProgress(map.clues, nextTaken);
    const stillOnTrack = nextTaken.length === map.clues.slice(0, p.clue).reduce((s, c) => s + c.steps, 0) + p.stepInClue;
    if (!stillOnTrack) {
      const want = map.clues[p.clue];
      audioManager.speak(want ? `That was ${DIRS[d].name}. The clue says ${clueText(want)}. Tap start again to try once more.` : `That was ${DIRS[d].name}.`);
    } else if (p.stepInClue === 0 && p.clue < map.clues.length) {
      audioManager.speak(`${p.clue === 0 ? "" : "Good! Now "}${clueText(map.clues[p.clue])}.`);
    } else {
      audioManager.speak(String(p.stepInClue));
    }
  };

  const cellPct = 100 / map.size;

  return (
    <div className="flex flex-1 flex-col items-center gap-4 pb-4 lg:flex-row lg:items-start lg:justify-center">
      <div className="flex w-full max-w-md flex-col gap-3">
        {/* The clue scroll */}
        <button type="button" onClick={() => readClues(map)} aria-label="Hear the clues again" className="rounded-3xl border-4 border-[#c9a46a] bg-[#fbecc8] px-4 py-3 text-left text-ink shadow-md active:scale-[0.98]">
          <span className="flex items-center gap-2 text-lg font-extrabold">
            <span className="text-3xl" aria-hidden>
              🦜
            </span>
            🔊 The parrot&apos;s clues
          </span>
          <ol className="mt-1 flex flex-col gap-1">
            {map.clues.map((c, i) => {
              const done = progress.clue > i && onTrack;
              const now = progress.clue === i && onTrack;
              return (
                <li key={i} className={`flex items-center gap-2 rounded-xl px-2 text-xl font-bold ${now ? "bg-kid-yellow" : ""} ${done ? "opacity-50 line-through" : ""}`}>
                  <span aria-hidden>{done ? "✅" : now ? "👉" : "▫️"}</span>
                  {clueText(c)}
                  {now && (
                    <span className="ml-auto flex gap-1" aria-label={`${progress.stepInClue} of ${c.steps} steps`}>
                      {Array.from({ length: c.steps }, (_, k) => (
                        <span key={k} className={`h-3 w-3 rounded-full ${k < progress.stepInClue ? "bg-kid-green" : "bg-ink/20"}`} />
                      ))}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </button>

        {/* The island */}
        <motion.div style={{ width: "min(100%, max(15rem, 100dvh - 27rem))" }} className="relative mx-auto aspect-square overflow-hidden rounded-3xl bg-[#4d96ff] shadow-inner" animate={bump && !reduced ? { x: [0, -8, 8, -4, 0] } : {}} key={bump} transition={{ duration: 0.4 }}>
          <span className="absolute left-1/2 top-1 z-10 -translate-x-1/2 rounded-full bg-white/85 px-2 text-sm font-extrabold text-ink" aria-hidden>
            ▲ N
          </span>
          <div className="grid h-full w-full" style={{ gridTemplateColumns: `repeat(${map.size}, 1fr)`, gridTemplateRows: `repeat(${map.size}, 1fr)` }} role="grid" aria-label="Island map">
            {map.tiles.flatMap((row, y) =>
              row.map((t, x) => (
                <div
                  key={`${x}-${y}`}
                  role="gridcell"
                  className={`relative flex items-center justify-center text-3xl ${t === "water" ? "bg-[#4d96ff]" : (x + y) % 2 ? "bg-[#f4dca4]" : "bg-[#efd296]"} ${t === "water" ? "" : "border border-[#e2c27f]/50"}`}
                  aria-label={t}
                >
                  {t === "water" ? <span className="text-xl text-white/70">〰️</span> : TILE_ART[t]}
                </div>
              )),
            )}
          </div>
          {(showX || dug) && (
            <span className="pointer-events-none absolute flex items-center justify-center text-4xl font-black text-kid-red" style={{ left: `${map.treasure.x * cellPct}%`, top: `${map.treasure.y * cellPct}%`, width: `${cellPct}%`, height: `${cellPct}%` }} aria-hidden>
              {dug ? "" : "✖"}
            </span>
          )}
          {dug && (
            <motion.span
              className="pointer-events-none absolute flex items-center justify-center text-5xl"
              style={{ left: `${map.treasure.x * cellPct}%`, top: `${map.treasure.y * cellPct}%`, width: `${cellPct}%`, height: `${cellPct}%` }}
              initial={{ scale: 0, y: 20 }}
              animate={{ scale: [0, 1.5, 1.2], y: -10 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              aria-hidden
            >
              💰
            </motion.span>
          )}
          {dug &&
            !reduced &&
            ["🪙", "💎", "🪙", "✨", "🪙", "💎"].map((s, i) => {
              const a = (i / 6) * Math.PI * 2;
              return (
                <motion.span
                  key={i}
                  className="pointer-events-none absolute text-3xl"
                  style={{ left: `${(map.treasure.x + 0.3) * cellPct}%`, top: `${(map.treasure.y + 0.2) * cellPct}%` }}
                  initial={{ x: 0, y: 0, opacity: 1 }}
                  animate={{ x: Math.cos(a) * 110, y: Math.sin(a) * 110, opacity: 0 }}
                  transition={{ duration: 1.2, delay: 0.6 }}
                  aria-hidden
                >
                  {s}
                </motion.span>
              );
            })}
          <motion.span
            className="pointer-events-none absolute flex items-center justify-center text-4xl"
            style={{ width: `${cellPct}%`, height: `${cellPct}%` }}
            initial={false}
            animate={{ left: `${pos.x * cellPct}%`, top: `${pos.y * cellPct}%` }}
            transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 22 }}
            aria-label="Explorer"
          >
            🧒
          </motion.span>
        </motion.div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <Compass onMove={move} onRestart={restart} disabled={dug} />
      </div>
    </div>
  );
}
