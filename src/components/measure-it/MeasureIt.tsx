"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { ShakeOnWrong } from "@/components/ShakeOnWrong";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import { blockFit, holdsMore, lengthQuestion, makeRound, RULER_CM, type Container, type Round, type Thing } from "@/lib/measure-it/measure";

const MODULE_ID = "measure-it";
const STAR_EVERY = 3;
const U = 50;
const X0 = 25;
const BLOCK_COLORS = ["#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#9b51e0", "#ff9f43"];

/** A toy drawn exactly `len` units long, starting at x. */
function ThingArt({ thing, x, len, y }: { thing: Thing; x: number; len: number; y: number }) {
  const w = len * U;
  const c = thing.color;
  switch (thing.art) {
    case "pencil":
      return (
        <g>
          <rect x={x} y={y} width={18} height={30} rx={4} fill="#ff9ab3" />
          <rect x={x + 16} y={y} width={8} height={30} fill="#c0c0c0" />
          <rect x={x + 24} y={y} width={w - 54} height={30} fill={c} stroke="#d9a400" strokeWidth={2} />
          <polygon points={`${x + w - 30},${y} ${x + w},${y + 15} ${x + w - 30},${y + 30}`} fill="#f2d2a2" />
          <polygon points={`${x + w - 10},${y + 10} ${x + w},${y + 15} ${x + w - 10},${y + 20}`} fill="#333" />
        </g>
      );
    case "crayon":
      return (
        <g>
          <rect x={x} y={y} width={w - 24} height={30} rx={6} fill={c} />
          <rect x={x + 12} y={y + 4} width={w - 50} height={22} rx={3} fill="#fff" opacity={0.35} />
          <polygon points={`${x + w - 26},${y + 2} ${x + w},${y + 15} ${x + w - 26},${y + 28}`} fill={c} />
        </g>
      );
    case "snake":
      return (
        <g>
          <rect x={x} y={y + 2} width={w} height={26} rx={13} fill={c} />
          {Array.from({ length: Math.max(1, len - 1) }, (_, i) => (
            <circle key={i} cx={x + 40 + i * ((w - 70) / Math.max(1, len - 1))} cy={y + 15} r={5} fill="#3e9a4a" />
          ))}
          <circle cx={x + w - 12} cy={y + 10} r={3} fill="#222" />
          <path d={`M${x + w - 2} ${y + 16} l10 -3 m-10 3 l10 3`} stroke="#ff4d4d" strokeWidth={2} />
        </g>
      );
    case "ribbon":
      return (
        <g>
          <path d={`M${x} ${y + 15} q ${w / 4} -20 ${w / 2} 0 t ${w / 2} 0`} stroke={c} strokeWidth={16} fill="none" strokeLinecap="round" />
        </g>
      );
    case "train":
      return (
        <g>
          <rect x={x} y={y} width={w} height={22} rx={5} fill={c} />
          <rect x={x + w - 34} y={y - 16} width={26} height={18} rx={3} fill="#ffd93d" />
          {Array.from({ length: Math.max(2, len) }, (_, i) => (
            <circle key={i} cx={x + 12 + i * ((w - 24) / Math.max(1, Math.max(2, len) - 1))} cy={y + 26} r={7} fill="#333" />
          ))}
        </g>
      );
  }
}

function Choices({ choices, onPick, wobble, right }: { choices: number[]; onPick: (n: number) => void; wobble: Record<number, number>; right: number | null }) {
  return (
    <div className="flex justify-center gap-3">
      {choices.map((c) => (
        <ShakeOnWrong key={c} trigger={wobble[c] ?? 0}>
          <button type="button" onClick={() => onPick(c)} className={`h-20 w-20 rounded-3xl text-4xl font-extrabold shadow-md active:scale-90 ${right === c ? "bg-kid-green text-white ring-4 ring-kid-yellow" : "bg-surface"}`}>
            {c}
          </button>
        </ShakeOnWrong>
      ))}
    </div>
  );
}

function LengthRound({ round, onDone }: { round: Extract<Round, { kind: "blocks" | "ruler" }>; onDone: () => void }) {
  const reduced = useAppReducedMotion();
  const [q] = useState(() => lengthQuestion(round));
  const [blocks, setBlocks] = useState(0);
  const [wobble, setWobble] = useState<Record<number, number>>({});
  const [right, setRight] = useState<number | null>(null);
  const [hops, setHops] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const isRuler = round.kind === "ruler";
  const start = isRuler ? round.start : 0;
  const unit = isRuler ? "centimetres" : "blocks";
  const fit = blockFit(blocks, round.length);
  const asking = isRuler || fit === "exact";
  const width = (isRuler ? RULER_CM : 10) * U + X0 * 2;

  useEffect(() => {
    const t = setTimeout(() => audioManager.speak(isRuler ? `How long is the ${round.thing.name}? Read the ruler.${start ? " Careful, it doesn't start at zero!" : ""}` : `How long is the ${round.thing.name}? Line up blocks under it, from one end to the other.`), 400);
    return () => clearTimeout(t);
  }, [isRuler, round, start]);

  const addBlock = () => {
    if (right !== null || fit === "over") return;
    const n = blocks + 1;
    setBlocks(n);
    audioManager.playNote(Math.min(9, n));
    const f = blockFit(n, round.length);
    if (f === "exact") audioManager.speak(`${n}. The blocks reach the end! How many blocks long is the ${round.thing.name}?`);
    else if (f === "over") {
      audioManager.play("failure");
      audioManager.speak("Oops, that block sticks out past the end. Tap it to take it off.");
    } else audioManager.speak(String(n));
  };

  const removeBlock = () => {
    if (right !== null || !blocks) return;
    setBlocks(blocks - 1);
    audioManager.playPop(0);
  };

  const pick = (n: number) => {
    if (right !== null) return;
    if (n !== q.answer) {
      setWobble((w) => ({ ...w, [n]: (w[n] ?? 0) + 1 }));
      audioManager.play("failure");
      setHops(true);
      if (isRuler && start > 0 && n === start + round.length) audioManager.speak(`It ends at ${n}, but it starts at ${start}, not zero. Count the jumps from ${start}.`);
      else audioManager.speak(isRuler ? `Count the jumps along the ruler, from one end of the ${round.thing.name} to the other.` : "Count the blocks under it, one by one.");
      return;
    }
    setRight(n);
    audioManager.play("success");
    audioManager.speak(`Yes! The ${round.thing.name} is ${n} ${unit} long.`);
    timers.current.push(setTimeout(onDone, 2800));
  };

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <svg viewBox={`0 0 ${width} 190`} className="h-auto w-full max-w-3xl select-none rounded-3xl bg-[#fff8e7] shadow-inner" aria-label={`A ${round.thing.name}`}>
        <ThingArt thing={round.thing} x={X0 + start * U} len={round.length} y={40} />
        <line x1={X0 + start * U} y1={20} x2={X0 + start * U} y2={160} stroke="#4d96ff" strokeWidth={2} strokeDasharray="5 5" />
        <line x1={X0 + (start + round.length) * U} y1={20} x2={X0 + (start + round.length) * U} y2={160} stroke="#4d96ff" strokeWidth={2} strokeDasharray="5 5" />

        {isRuler ? (
          <g>
            <rect x={X0 - 12} y={100} width={RULER_CM * U + 24} height={56} rx={6} fill="#ffe08a" stroke="#d9a400" strokeWidth={2} />
            {Array.from({ length: RULER_CM * 2 + 1 }, (_, i) => (
              <line key={i} x1={X0 + (i * U) / 2} y1={100} x2={X0 + (i * U) / 2} y2={i % 2 ? 112 : 122} stroke="#5a4500" strokeWidth={i % 2 ? 1.5 : 2.5} />
            ))}
            {Array.from({ length: RULER_CM + 1 }, (_, i) => (
              <text key={i} x={X0 + i * U} y={144} textAnchor="middle" fontSize={18} fontWeight={800} fill={i === start || i === start + round.length ? "#d93838" : "#5a4500"}>
                {i}
              </text>
            ))}
            <text x={X0 + RULER_CM * U - 4} y={128} textAnchor="end" fontSize={11} fill="#5a4500">
              cm
            </text>
          </g>
        ) : (
          <g>
            <AnimatePresence>
              {Array.from({ length: blocks }, (_, i) => {
                const last = i === blocks - 1;
                const sticking = fit === "over" && last;
                return (
                  <motion.g key={i} initial={reduced ? false : { y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0, y: 30 }} transition={{ type: "spring", stiffness: 400, damping: 18 }} onClick={last ? removeBlock : undefined} className={last ? "cursor-pointer" : ""}>
                    <rect x={X0 + i * U + 2} y={100} width={U - 4} height={U - 4} rx={7} fill={sticking ? "#ff6b6b" : BLOCK_COLORS[i % BLOCK_COLORS.length]} stroke={fit === "exact" ? "#3ddc6a" : "rgba(0,0,0,0.25)"} strokeWidth={fit === "exact" ? 5 : 3} />
                    <text x={X0 + i * U + U / 2} y={131} textAnchor="middle" fontSize={20} fontWeight={800} fill="#fff">
                      {i + 1}
                    </text>
                  </motion.g>
                );
              })}
            </AnimatePresence>
          </g>
        )}

        {/* Counting jumps, shown after a wrong answer */}
        {hops &&
          Array.from({ length: round.length }, (_, i) => {
            const x = X0 + (start + i) * U;
            return <motion.path key={i} d={`M${x} 96 q ${U / 2} -26 ${U} 0`} fill="none" stroke="#9b51e0" strokeWidth={3} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: reduced ? 0 : i * 0.35, duration: 0.3 }} />;
          })}
      </svg>

      {!isRuler && right === null && (
        <div className="flex gap-3">
          <button type="button" onClick={addBlock} disabled={fit !== "short"} className="rounded-3xl bg-kid-blue px-6 py-4 text-2xl font-extrabold text-white shadow-md active:scale-95 disabled:opacity-40">
            🧱 Add a block
          </button>
          <button type="button" onClick={removeBlock} disabled={!blocks} className="rounded-3xl bg-surface px-5 py-4 text-2xl font-extrabold shadow-md active:scale-95 disabled:opacity-40" aria-label="Take a block off">
            ↩️
          </button>
        </div>
      )}
      {asking && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-center text-2xl font-extrabold">
            How many {unit} long is the {round.thing.name}?
          </p>
          <Choices choices={q.choices} onPick={pick} wobble={wobble} right={right} />
        </div>
      )}
    </div>
  );
}

function Jar({ c, poured, onPour, glow }: { c: Container; poured: number; onPour: () => void; glow: boolean }) {
  const reduced = useAppReducedMotion();
  const H = 170;
  const top = H - c.h;
  const level = (poured / c.cups) * (c.h - 8);
  const full = poured >= c.cups;
  return (
    <button type="button" onClick={onPour} aria-label={`${c.name}, ${poured} cups`} className={`flex flex-col items-center rounded-3xl bg-surface p-3 shadow-md active:scale-95 ${glow ? "ring-4 ring-kid-yellow" : ""}`}>
      <svg viewBox={`0 0 ${Math.max(140, c.w + 20)} ${H + 10}`} className="h-48 w-auto" aria-hidden>
        <defs>
          <clipPath id={`jar-${c.id}`}>
            <rect x={10} y={top} width={c.w} height={c.h} rx={c.id === "bowl" ? 40 : 12} />
          </clipPath>
        </defs>
        <g transform={`translate(${(Math.max(140, c.w + 20) - c.w - 20) / 2} 0)`}>
          <g clipPath={`url(#jar-${c.id})`}>
            <motion.rect x={10} width={c.w} fill="#7cc4ff" initial={false} animate={{ attrY: top + c.h - level, height: level }} transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 16 }} />
          </g>
          <rect x={10} y={top} width={c.w} height={c.h} rx={c.id === "bowl" ? 40 : 12} fill="rgba(255,255,255,0.15)" stroke="#5b6b7a" strokeWidth={4} />
          {Array.from({ length: c.cups - 1 }, (_, i) => (
            <line key={i} x1={10 + c.w - 12} x2={10 + c.w - 2} y1={top + c.h - ((i + 1) / c.cups) * (c.h - 8)} y2={top + c.h - ((i + 1) / c.cups) * (c.h - 8)} stroke="#5b6b7a" strokeWidth={2} opacity={0.6} />
          ))}
        </g>
      </svg>
      <span className="text-xl font-extrabold capitalize">{c.name}</span>
      <span className="min-h-8 text-xl" aria-hidden>
        {full ? `${c.cups} cups` : poured ? "🥛".repeat(poured) : "Tap to pour"}
      </span>
    </button>
  );
}

function JugRound({ round, onDone }: { round: Extract<Round, { kind: "jugs" }>; onDone: () => void }) {
  const [poured, setPoured] = useState({ a: 0, b: 0 });
  const [wobble, setWobble] = useState({ a: 0, b: 0 });
  const [right, setRight] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const bothFull = poured.a >= round.a.cups && poured.b >= round.b.cups;

  useEffect(() => {
    const t = setTimeout(() => audioManager.speak(`Which holds more water, the ${round.a.name} or the ${round.b.name}? Tap each one to fill it with cups of water.`), 400);
    return () => clearTimeout(t);
  }, [round]);

  const tap = (side: "a" | "b") => {
    if (right) return;
    const c = round[side];
    if (!bothFull) {
      if (poured[side] >= c.cups) return void audioManager.speak(`The ${c.name} is full. It holds ${c.cups} cups.`);
      const n = poured[side] + 1;
      const next = { ...poured, [side]: n };
      setPoured(next);
      audioManager.playSfx("plunk");
      if (n === c.cups) {
        const other = round[side === "a" ? "b" : "a"];
        const done = next.a >= round.a.cups && next.b >= round.b.cups;
        audioManager.speak(`Full! The ${c.name} holds ${n} cups.${done ? ` Which holds more, the ${round.a.name} or the ${round.b.name}?` : ` Now fill the ${other.name}.`}`);
      } else audioManager.speak(`${n} ${n === 1 ? "cup" : "cups"}`);
      return;
    }
    const more = holdsMore(round);
    if (c !== more) {
      setWobble((w) => ({ ...w, [side]: w[side] + 1 }));
      audioManager.play("failure");
      const taller = round.a.h > round.b.h ? round.a : round.b;
      audioManager.speak(c === taller ? `The ${c.name} is taller, but it only holds ${c.cups} cups. The ${more.name} holds ${more.cups}!` : `The ${c.name} holds ${c.cups} cups. Count the ${more.name}'s cups!`);
      return;
    }
    setRight(true);
    audioManager.play("success");
    audioManager.speak(`Yes! The ${more.name} holds more: ${more.cups} cups.`);
    timers.current.push(setTimeout(onDone, 3000));
  };

  return (
    <div className="flex w-full flex-col items-center gap-4">
      {bothFull && <p className="text-center text-2xl font-extrabold">Which holds more?</p>}
      <div className="flex flex-wrap items-end justify-center gap-4">
        {(["a", "b"] as const).map((s) => (
          <ShakeOnWrong key={s} trigger={wobble[s]}>
            <Jar c={round[s]} poured={poured[s]} onPour={() => tap(s)} glow={right && holdsMore(round) === round[s]} />
          </ShakeOnWrong>
        ))}
      </div>
    </div>
  );
}

export default function MeasureIt() {
  const [n, setN] = useState(0);
  const [round, setRound] = useState<Round>(() => makeRound(0));
  const next = () => {
    const k = n + 1;
    if (k % STAR_EVERY === 0) void finishActivity(MODULE_ID, { score: k });
    setN(k);
    setRound(makeRound(k));
  };
  const label = round.kind === "blocks" ? "🧱 Measure with blocks" : round.kind === "ruler" ? "📏 Measure with a ruler" : "🫗 Fill with cups";
  return (
    <div className="flex flex-1 flex-col items-center gap-3 pb-4">
      <span className="rounded-full bg-surface px-4 py-1 text-lg font-extrabold shadow">{label}</span>
      {round.kind === "jugs" ? <JugRound key={n} round={round} onDone={next} /> : <LengthRound key={n} round={round} onDone={next} />}
    </div>
  );
}
