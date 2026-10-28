"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { ShakeOnWrong } from "@/components/ShakeOnWrong";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import { beadAt, beadById, makeRound, STRING_LENGTH, type BeadKind, type Round } from "@/lib/bead-builder/beads";

const MODULE_ID = "bead-builder";
const STAR_EVERY = 2;
const NUMBER_WORDS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

/** Slot positions along a gently sagging string in a 1000 x 240 box. */
const slot = (i: number) => {
  const t = (i + 0.5) / STRING_LENGTH;
  return { x: 60 + t * 880, y: 105 + Math.sin(t * Math.PI) * 40 };
};
/** Positions once the string closes into a necklace. */
const ring = (i: number) => {
  const a = (i / STRING_LENGTH) * Math.PI * 2 - Math.PI / 2;
  return { x: 500 + Math.cos(a) * 95, y: 125 + Math.sin(a) * 95 };
};

export function BeadShape({ kind, r = 34 }: { kind: BeadKind; r?: number }) {
  const s = r / 34;
  const stroke = { stroke: "rgba(0,0,0,0.25)", strokeWidth: 3 * s };
  let body;
  switch (kind.shape) {
    case "square":
      body = <rect x={-30 * s} y={-30 * s} width={60 * s} height={60 * s} rx={14 * s} fill={kind.color} {...stroke} />;
      break;
    case "diamond":
      body = <path d={`M0 ${-36 * s} L${34 * s} 0 L0 ${36 * s} L${-34 * s} 0 Z`} fill={kind.color} strokeLinejoin="round" {...stroke} />;
      break;
    case "flower":
      body = (
        <g fill={kind.color} {...stroke}>
          {Array.from({ length: 5 }, (_, i) => {
            const a = (i / 5) * Math.PI * 2;
            return <circle key={i} cx={Math.cos(a) * 18 * s} cy={Math.sin(a) * 18 * s} r={15 * s} />;
          })}
          <circle r={16 * s} />
        </g>
      );
      break;
    case "heart":
      body = <path d={`M0 ${28 * s} C${-44 * s} ${0} ${-30 * s} ${-36 * s} 0 ${-16 * s} C${30 * s} ${-36 * s} ${44 * s} 0 0 ${28 * s} Z`} fill={kind.color} {...stroke} />;
      break;
    default:
      body = <circle r={32 * s} fill={kind.color} {...stroke} />;
  }
  return (
    <g>
      {body}
      <circle cx={-10 * s} cy={-12 * s} r={7 * s} fill="#fff" opacity={0.55} />
      <circle r={5 * s} fill="rgba(0,0,0,0.35)" />
    </g>
  );
}

function MiniNecklace({ unit }: { unit: string[] }) {
  return (
    <svg viewBox="-60 -60 120 120" className="h-16 w-16" aria-hidden>
      <circle r={42} fill="none" stroke="#c9b48a" strokeWidth={3} />
      {Array.from({ length: STRING_LENGTH }, (_, i) => {
        const a = (i / STRING_LENGTH) * Math.PI * 2 - Math.PI / 2;
        return (
          <g key={i} transform={`translate(${Math.cos(a) * 42} ${Math.sin(a) * 42})`}>
            <BeadShape kind={beadById(beadAt(unit, i))} r={11} />
          </g>
        );
      })}
    </svg>
  );
}

export default function BeadBuilder() {
  const reduced = useAppReducedMotion();
  const [done, setDone] = useState(0);
  const [round, setRound] = useState<Round>(() => makeRound(0));
  const [placed, setPlaced] = useState(round.given);
  const [closed, setClosed] = useState(false);
  const [wobble, setWobble] = useState<Record<string, number>>({});
  const [misses, setMisses] = useState(0);
  const [gallery, setGallery] = useState<string[][]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const intro = (r: Round) =>
    audioManager.speak(r.mode === "copy" ? `Copy the pattern! ${r.unit.map((id) => beadById(id).name).join(", ")}, and again.` : "What comes next? Finish the pattern!");

  useEffect(() => {
    const t = setTimeout(() => intro(round), 500);
    return () => clearTimeout(t);
    // Only the first round; later rounds are introduced as they start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const want = placed < STRING_LENGTH ? beadAt(round.unit, placed) : null;

  const tap = (id: string) => {
    if (closed || !want) return;
    const kind = beadById(id);
    if (id !== want) {
      setWobble((w) => ({ ...w, [id]: (w[id] ?? 0) + 1 }));
      setMisses((m) => m + 1);
      audioManager.play("failure");
      const recent = Array.from({ length: Math.min(placed, round.unit.length) }, (_, k) => beadById(beadAt(round.unit, placed - Math.min(placed, round.unit.length) + k)).name);
      audioManager.speak(misses >= 1 ? `The next one is ${beadById(want).name}.` : `That's ${kind.name}. Look at the pattern${recent.length ? `: ${recent.join(", ")}` : ""}. What comes next?`);
      return;
    }
    const n = placed + 1;
    setPlaced(n);
    setMisses(0);
    audioManager.playNote(n - 1);
    if (n < STRING_LENGTH) {
      audioManager.speak(NUMBER_WORDS[n - 1]);
      return;
    }
    // The string is full: tie it into a necklace
    audioManager.speak("ten!");
    timers.current.push(
      setTimeout(() => {
        setClosed(true);
        audioManager.play("reward");
        audioManager.speak(`You made a necklace! ${[...round.unit, ...round.unit].map((b) => beadById(b).name).join(", ")}!`);
      }, 500),
    );
    const d = done + 1;
    setDone(d);
    if (d % STAR_EVERY === 0) void finishActivity(MODULE_ID, { score: d });
    timers.current.push(
      setTimeout(() => {
        setGallery((g) => [round.unit, ...g].slice(0, 6));
        const r = makeRound(d);
        setRound(r);
        setPlaced(r.given);
        setClosed(false);
        intro(r);
      }, 4600),
    );
  };

  return (
    <div className="flex flex-1 flex-col items-center gap-4">
      <button type="button" onClick={() => intro(round)} aria-label="Hear the pattern again" className="flex items-center gap-3 rounded-3xl bg-surface px-4 py-2 shadow-md active:scale-95">
        <span className="text-lg font-extrabold">🔊 {round.mode === "copy" ? "Copy it!" : "What comes next?"}</span>
        {round.mode === "copy" && (
          <svg viewBox={`0 0 ${STRING_LENGTH * 40} 44`} className="h-9 w-56 sm:w-72" aria-hidden>
            {Array.from({ length: STRING_LENGTH }, (_, i) => (
              <g key={i} transform={`translate(${20 + i * 40} 22)`}>
                <BeadShape kind={beadById(beadAt(round.unit, i))} r={16} />
              </g>
            ))}
          </svg>
        )}
      </button>

      <div className="w-full max-w-4xl rounded-3xl bg-amber-50 shadow-inner dark:bg-slate-800">
        <svg viewBox="0 0 1000 240" className="w-full" role="img" aria-label={`${placed} of ${STRING_LENGTH} beads on the string`}>
          <motion.path
            d={`M30 ${slot(0).y - 30} Q500 ${slot(4).y + 70} 970 ${slot(9).y - 30}`}
            fill="none"
            stroke="#c9b48a"
            strokeWidth={6}
            strokeLinecap="round"
            animate={{ opacity: closed ? 0 : 1 }}
          />
          <motion.circle cx={500} cy={125} r={95} fill="none" stroke="#c9b48a" strokeWidth={6} initial={false} animate={{ opacity: closed ? 1 : 0 }} />
          {!closed && <circle cx={970} cy={slot(9).y - 30} r={10} fill="#c9b48a" />}
          {want && !closed && (
            <motion.circle
              cx={slot(placed).x}
              cy={slot(placed).y}
              r={40}
              fill="none"
              stroke="#ff9f43"
              strokeWidth={5}
              strokeDasharray="10 8"
              animate={reduced ? undefined : { rotate: 360, scale: [1, 1.1, 1] }}
              transition={{ rotate: { repeat: Infinity, duration: 6, ease: "linear" }, scale: { repeat: Infinity, duration: 1.2 } }}
              style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}
            />
          )}
          {Array.from({ length: placed }, (_, i) => {
            const p = closed ? ring(i) : slot(i);
            return (
              <motion.g
                key={`${done}-${i}`}
                initial={reduced || i < round.given ? { x: slot(i).x, y: slot(i).y } : { x: slot(i).x, y: -60 }}
                animate={{ x: p.x, y: p.y, rotate: closed ? 360 : 0 }}
                transition={closed ? { duration: 0.9, delay: i * 0.04, ease: "backOut" } : { type: "spring", stiffness: 380, damping: 15 }}
              >
                <motion.g animate={reduced ? undefined : { scaleY: [1.25, 0.8, 1], scaleX: [0.8, 1.2, 1] }} transition={{ duration: 0.45, delay: 0.15 }}>
                  <BeadShape kind={beadById(beadAt(round.unit, i))} />
                </motion.g>
              </motion.g>
            );
          })}
          {closed &&
            !reduced &&
            Array.from({ length: 8 }, (_, i) => {
              const a = (i / 8) * Math.PI * 2;
              return (
                <motion.text key={i} x={500} y={130} fontSize={36} textAnchor="middle" initial={{ x: 0, y: 0, opacity: 1 }} animate={{ x: Math.cos(a) * 220, y: Math.sin(a) * 110, opacity: 0 }} transition={{ duration: 1.2, delay: 0.6 }}>
                  ✨
                </motion.text>
              );
            })}
        </svg>
      </div>

      <p className="text-3xl font-extrabold" role="status">
        {placed} / {STRING_LENGTH}
      </p>

      <div className="flex flex-wrap justify-center gap-3" aria-label="Beads">
        {round.tray.map((id) => {
          const kind = beadById(id);
          const glow = misses >= 2 && id === want;
          return (
            <ShakeOnWrong key={`${done}-${id}`} trigger={wobble[id] ?? 0}>
              <button type="button" onClick={() => tap(id)} aria-label={`${kind.name} bead`} className={`flex min-h-touch min-w-touch items-center justify-center rounded-3xl bg-surface shadow-md active:scale-90 ${glow ? "ring-8 ring-kid-yellow" : ""}`}>
                <svg viewBox="-40 -40 80 80" className="h-16 w-16" aria-hidden>
                  <BeadShape kind={kind} />
                </svg>
              </button>
            </ShakeOnWrong>
          );
        })}
      </div>

      {gallery.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2" aria-label={`${gallery.length} necklaces made`}>
          {gallery.map((u, i) => (
            <MiniNecklace key={i} unit={u} />
          ))}
        </div>
      )}
    </div>
  );
}
