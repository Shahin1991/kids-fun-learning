"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import { canLay, isComplete, makeLevel, nextCells, pickUpTo, same, type Cell, type Scenery, type TrackLevel } from "@/lib/train-track/track";

const MODULE_ID = "train-track";
const U = 100;
const STEP_S = 0.45;

const SCENERY_ART: Record<Scenery, { emoji: string; name: string }> = {
  tree: { emoji: "🌳", name: "A tree" },
  rock: { emoji: "🪨", name: "A big rock" },
  pond: { emoji: "🦆", name: "The duck pond" },
  house: { emoji: "🏡", name: "A house" },
};

const centre = (c: Cell) => ({ x: c.x * U + U / 2, y: c.y * U + U / 2 });

function intro(lv: TrackLevel) {
  return `Build a track from the station to ${lv.place.name}!${lv.stop ? ` Pick up ${lv.stop.name} on the way.` : ""} Tap the squares next to the track.`;
}

export default function TrainTrack() {
  const reduced = useAppReducedMotion();
  const [round, setRound] = useState(0);
  const [lv, setLv] = useState<TrackLevel>(() => makeLevel(0));
  const [path, setPath] = useState<Cell[]>([lv.from]);
  const [running, setRunning] = useState(false);
  const [boarded, setBoarded] = useState(false);
  const [bump, setBump] = useState<{ cell: Cell; n: number } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    const t = setTimeout(() => audioManager.speak(intro(lv)), 500);
    return () => clearTimeout(t);
    // Only the first map; later maps are read as they appear.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hints = running ? [] : nextCells(lv, path);
  const pts = path.map(centre);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");

  const run = (full: Cell[]) => {
    setRunning(true);
    const pieces = full.length - 2;
    const stopAt = lv.stop ? full.findIndex((c) => same(c, lv.stop!)) : -1;
    if (stopAt > 0) timers.current.push(setTimeout(() => setBoarded(true), stopAt * STEP_S * 1000));
    full.forEach((_, i) => i && timers.current.push(setTimeout(() => audioManager.playNote(i % 8), i * STEP_S * 1000)));
    const ride = (full.length - 1) * STEP_S * 1000;
    timers.current.push(
      setTimeout(() => {
        audioManager.speak(`Choo choo! The train got to ${lv.place.name}! Your track has ${pieces} pieces.`);
        void finishActivity(MODULE_ID, { score: round + 1 });
      }, ride),
    );
    timers.current.push(
      setTimeout(() => {
        const n = round + 1;
        const next = makeLevel(n);
        setRound(n);
        setLv(next);
        setPath([next.from]);
        setRunning(false);
        setBoarded(false);
        audioManager.speak(intro(next));
      }, ride + 4200),
    );
  };

  const tap = (cell: Cell) => {
    if (running) return;
    if (path.some((c) => same(c, cell))) {
      if (same(cell, lv.from) && path.length === 1) return void audioManager.speak("This is the station. Tap a square next to it.");
      setPath(pickUpTo(path, cell));
      audioManager.playPop(0);
      return void audioManager.speak("Track picked up.");
    }
    const res = canLay(lv, path, cell);
    if (res === "ok") {
      const next = [...path, cell];
      setPath(next);
      audioManager.playPop(1);
      if (lv.stop && same(cell, lv.stop)) audioManager.speak(`${lv.stop.name} is waiting here. Keep going to ${lv.place.name}!`);
      if (isComplete(lv, next)) run(next);
      return;
    }
    setBump({ cell, n: (bump?.n ?? 0) + 1 });
    audioManager.play("failure");
    if (res === "blocked") {
      const b = lv.blocked.find((x) => same(x, cell))!;
      audioManager.speak(`${SCENERY_ART[b.kind].name} is in the way. Go around it!`);
    } else if (res === "needStop") audioManager.speak(`Don't forget ${lv.stop!.name}! Pick ${lv.stop!.name} up first.`);
    else if (res === "notNext") audioManager.speak("Lay the track next to the end of the line. Look for the glowing squares.");
  };

  // The train rides from the first station along the finished track
  const train = running ? pts : [centre(lv.from)];
  const flips = train.map((p, i) => {
    const prev = train[Math.max(0, i - 1)];
    const nxt = train[Math.min(train.length - 1, i + 1)];
    return (i ? p.x - prev.x : nxt.x - p.x) < 0 ? 1 : -1;
  });

  return (
    <div className="flex flex-1 flex-col items-center gap-3 pb-4">
      <button type="button" onClick={() => audioManager.speak(intro(lv))} className="flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-lg font-extrabold shadow active:scale-95">
        🔊 To {lv.place.name} {lv.place.emoji}
        {lv.stop && <span className={boarded ? "opacity-40" : ""}>· pick up {lv.stop.emoji}</span>}
      </button>

      <div className="w-full max-w-3xl" style={{ maxWidth: `min(48rem, calc((100dvh - 17rem) * ${lv.cols / lv.rows}))` }}>
        <svg viewBox={`0 0 ${lv.cols * U} ${lv.rows * U}`} className="h-auto w-full touch-manipulation select-none rounded-3xl shadow-inner" role="grid" aria-label="Track map">
          <defs>
            <mask id="rails" maskUnits="userSpaceOnUse">
              <path d={d} fill="none" stroke="#fff" strokeWidth={40} strokeLinejoin="round" strokeLinecap="round" />
              <path d={d} fill="none" stroke="#000" strokeWidth={28} strokeLinejoin="round" strokeLinecap="round" />
            </mask>
          </defs>
          {Array.from({ length: lv.rows }, (_, y) => Array.from({ length: lv.cols }, (_, x) => <rect key={`${x}-${y}`} x={x * U} y={y * U} width={U} height={U} fill={(x + y) % 2 ? "#9be07f" : "#8bd673"} />))}

          {/* Track: sleepers, then two rails cut out of one wide line */}
          {path.length > 1 && (
            <>
              <path d={d} fill="none" stroke="#8a5a32" strokeWidth={58} strokeDasharray="10 15" strokeLinejoin="round" />
              <rect x={0} y={0} width={lv.cols * U} height={lv.rows * U} fill="#9aa3ad" mask="url(#rails)" />
            </>
          )}

          {hints.map((c) => (
            <motion.circle
              key={`h${c.x}-${c.y}`}
              cx={centre(c).x}
              cy={centre(c).y}
              r={30}
              fill="rgba(255,255,255,0.35)"
              stroke="#fff"
              strokeWidth={4}
              strokeDasharray="8 8"
              animate={reduced ? undefined : { opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
              pointerEvents="none"
            />
          ))}

          {lv.blocked.map((b) => {
            const hit = bump && same(bump.cell, b) ? bump.n : 0;
            return (
              <motion.g key={`b${b.x}-${b.y}-${hit}`} animate={hit && !reduced ? { x: [0, -8, 8, -4, 0] } : undefined} transition={{ duration: 0.4 }} pointerEvents="none">
                {b.kind === "pond" && <ellipse cx={centre(b).x} cy={centre(b).y} rx={42} ry={30} fill="#4d96ff" stroke="#3a7bd5" strokeWidth={4} />}
                <text x={centre(b).x} y={centre(b).y + (b.kind === "pond" ? 12 : 22)} textAnchor="middle" fontSize={b.kind === "pond" ? 36 : 62}>
                  {SCENERY_ART[b.kind].emoji}
                </text>
              </motion.g>
            );
          })}

          {/* Stations */}
          <rect x={lv.from.x * U + 8} y={lv.from.y * U + 62} width={U - 16} height={22} rx={6} fill="#d9c7a3" stroke="#8a5a32" strokeWidth={3} pointerEvents="none" />
          <text x={centre(lv.to).x} y={centre(lv.to).y + 24} textAnchor="middle" fontSize={64} pointerEvents="none">
            {lv.place.emoji}
          </text>
          {lv.stop && !boarded && (
            <motion.text x={centre(lv.stop).x + 26} y={centre(lv.stop).y - 14} textAnchor="middle" fontSize={40} animate={reduced ? undefined : { y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 1 }} pointerEvents="none">
              {lv.stop.emoji}
            </motion.text>
          )}

          {/* Tap targets */}
          {Array.from({ length: lv.rows }, (_, y) => Array.from({ length: lv.cols }, (_, x) => <rect key={`t${x}-${y}`} x={x * U} y={y * U} width={U} height={U} fill="transparent" role="gridcell" aria-label={`Square ${x + 1}, ${y + 1}`} onClick={() => tap({ x, y })} className="cursor-pointer" />))}

          <motion.g initial={false} animate={{ x: train.map((p) => p.x), y: train.map((p) => p.y), scaleX: flips }} transition={running && !reduced ? { duration: (train.length - 1) * STEP_S, ease: "linear" } : { duration: 0 }} pointerEvents="none">
            <text y={20} textAnchor="middle" fontSize={58}>
              🚂
            </text>
            {boarded && lv.stop && (
              <text x={18} y={-12} textAnchor="middle" fontSize={30}>
                {lv.stop.emoji}
              </text>
            )}
          </motion.g>
        </svg>
      </div>
      <p className="text-center text-lg font-bold text-muted">Tap a glowing square to lay track. Tap a piece to pick it back up.</p>
    </div>
  );
}
