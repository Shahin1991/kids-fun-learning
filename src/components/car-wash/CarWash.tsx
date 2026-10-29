"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import { BODY, CARS, cleared, coveredCount, mudSplats, STEP_DONE, STEPS, WHEELS, type Car } from "@/lib/car-wash/wash";

const MODULE_ID = "car-wash";
const STAR_EVERY = 2;
const LOW_W = 80;
const LOW_H = 48;

type Phase = "arrive" | "scrub" | "rinse" | "shine" | "leave";

function CarArt({ car, spinning, reduced }: { car: Car; spinning: boolean; reduced: boolean }) {
  return (
    <svg viewBox="0 0 400 240" className="absolute inset-0 h-full w-full" aria-hidden>
      <ellipse cx={200} cy={206} rx={185} ry={12} fill="#000" opacity={0.15} />
      <path d={BODY[car.kind]} fill={car.color} stroke={car.trim} strokeWidth={5} strokeLinejoin="round" />
      {car.kind === "hatch" && (
        <>
          <path d="M162 70 L178 62 L262 62 Q276 62 286 74 L310 102 L148 102 Z" fill="#cfefff" stroke={car.trim} strokeWidth={4} />
          <line x1={226} y1={62} x2={226} y2={102} stroke={car.trim} strokeWidth={5} />
          <line x1={226} y1={106} x2={226} y2={160} stroke={car.trim} strokeWidth={3} opacity={0.6} />
        </>
      )}
      {car.kind === "pickup" && (
        <>
          <path d="M182 60 L262 60 Q274 60 282 72 L304 102 L182 102 Z" fill="#cfefff" stroke={car.trim} strokeWidth={4} />
          <line x1={170} y1={112} x2={170} y2={160} stroke={car.trim} strokeWidth={4} />
        </>
      )}
      {car.kind === "bus" &&
        [50, 104, 158, 212, 266].map((x) => <rect key={x} x={x} y={58} width={42} height={44} rx={8} fill="#cfefff" stroke={car.trim} strokeWidth={4} />)}
      {car.kind === "bus" && <path d="M326 58 L350 58 Q366 60 368 84 L368 102 L326 102 Z" fill="#cfefff" stroke={car.trim} strokeWidth={4} />}
      <rect x={car.kind === "bus" ? 360 : 358} y={124} width={16} height={14} rx={5} fill="#fff6b0" stroke={car.trim} strokeWidth={3} />
      <rect x={22} y={156} width={358} height={14} rx={7} fill={car.trim} />
      {WHEELS[car.kind].map(([x, y]) => (
        <motion.g key={x} style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }} animate={spinning && !reduced ? { rotate: 360 } : { rotate: 0 }} transition={spinning ? { repeat: Infinity, duration: 0.5, ease: "linear" } : { duration: 0 }}>
          <circle cx={x} cy={y} r={30} fill="#33303b" />
          <circle cx={x} cy={y} r={14} fill="#c9ccd3" />
          <rect x={x - 3} y={y - 14} width={6} height={28} fill="#8d909a" />
        </motion.g>
      ))}
    </svg>
  );
}

/** A few soap bubbles around a point (in car units). */
function drawBubbles(g: CanvasRenderingContext2D, x: number, y: number) {
  g.fillStyle = "rgba(255,255,255,0.92)";
  g.strokeStyle = "rgba(160,200,255,0.9)";
  g.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() * 26;
    g.beginPath();
    g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 6 + Math.random() * 10, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
}

/** Wipes a layer along a stroke (car units). */
function wipe(g: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }, width: number) {
  g.globalCompositeOperation = "destination-out";
  g.lineWidth = width;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(from.x, from.y);
  g.lineTo(to.x + 0.01, to.y);
  g.stroke();
}

/** A water drop that falls from where the child is rinsing. */
const newDrop = (id: number, x: number, y: number): Drop => ({ id, x: x + (Math.random() - 0.5) * 40, y, emoji: "💧" });

interface Drop {
  id: number;
  x: number;
  y: number;
  emoji: string;
}

export default function CarWash() {
  const reduced = useAppReducedMotion();
  const [count, setCount] = useState(0);
  const car = CARS[count % CARS.length];
  const [phase, setPhase] = useState<Phase>("arrive");
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [drops, setDrops] = useState<Drop[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const mud = useRef<HTMLCanvasElement>(null);
  const foam = useRef<HTMLCanvasElement>(null);
  const low = useRef<HTMLCanvasElement | null>(null);
  const start = useRef({ mud: 0, foam: 0 });
  const rubbing = useRef(false);
  const moves = useRef(0);
  /** The last rub point (car units), so a fast swipe wipes the whole way and not just dots */
  const lastPt = useRef<{ x: number; y: number } | null>(null);
  const dropId = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const scale = () => (mud.current ? mud.current.width / 400 : 1);

  const measure = (c: HTMLCanvasElement) => {
    low.current ??= Object.assign(document.createElement("canvas"), { width: LOW_W, height: LOW_H });
    const g = low.current.getContext("2d", { willReadFrequently: true })!;
    g.clearRect(0, 0, LOW_W, LOW_H);
    g.drawImage(c, 0, 0, LOW_W, LOW_H);
    const rgba = g.getImageData(0, 0, LOW_W, LOW_H).data;
    const alpha = new Uint8Array(LOW_W * LOW_H);
    for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3];
    return alpha;
  };

  // A new, muddy car drives in
  useEffect(() => {
    const el = box.current;
    const m = mud.current;
    const f = foam.current;
    if (!el || !m || !f) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(el.clientWidth * dpr);
    const h = Math.round((w * 240) / 400);
    for (const c of [m, f]) {
      c.width = w;
      c.height = h;
      c.getContext("2d")!.clearRect(0, 0, w, h);
    }
    const k = w / 400;
    const g = m.getContext("2d")!;
    g.save();
    g.scale(k, k);
    g.clip(new Path2D(BODY[car.kind]));
    for (const s of mudSplats(car.kind)) {
      g.fillStyle = "#7a5230";
      g.beginPath();
      g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#9a6c40";
      g.beginPath();
      g.arc(s.x - s.r * 0.3, s.y - s.r * 0.3, s.r * 0.35, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
    start.current.mud = coveredCount(measure(m));
    setPhase("arrive");
    later(
      () => {
        setPhase("scrub");
        audioManager.speak(`Oh no, a muddy ${car.name}! ${STEPS[0].say}`);
      },
      reduced ? 300 : 1500,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one setup per car
  }, [count]);

  const local = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, cx: ((e.clientX - r.left) / r.width) * 400, cy: ((e.clientY - r.top) / r.width) * 400 };
  };

  const rub = (e: React.PointerEvent) => {
    const p = local(e);
    setPointer({ x: p.x, y: p.y });
    const ph = phaseRef.current;
    if (!rubbing.current || (ph !== "scrub" && ph !== "rinse")) return;
    const k = scale();
    const body = new Path2D(BODY[car.kind]);
    moves.current++;
    if (ph === "scrub") {
      const g = mud.current!.getContext("2d")!;
      g.save();
      g.scale(k, k);
      wipe(g, lastPt.current ?? { x: p.cx, y: p.cy }, { x: p.cx, y: p.cy }, 60);
      g.restore();
      const fg = foam.current!.getContext("2d")!;
      fg.save();
      fg.scale(k, k);
      fg.clip(body);
      const from = lastPt.current ?? { x: p.cx, y: p.cy };
      const steps = Math.max(1, Math.round(Math.hypot(p.cx - from.x, p.cy - from.y) / 22));
      for (let i = 1; i <= steps; i++) drawBubbles(fg, from.x + ((p.cx - from.x) * i) / steps, from.y + ((p.cy - from.y) * i) / steps);
      fg.restore();
      if (moves.current % 9 === 0) audioManager.playPop(moves.current);
    } else {
      const g = foam.current!.getContext("2d")!;
      g.save();
      g.scale(k, k);
      wipe(g, lastPt.current ?? { x: p.cx, y: p.cy }, { x: p.cx, y: p.cy }, 72);
      g.restore();
      if (moves.current % 4 === 0 && !reduced) {
        const id = ++dropId.current;
        setDrops((d) => [...d.slice(-14), newDrop(id, p.x, p.y)]);
      }
      if (moves.current % 14 === 0) audioManager.playSfx("whoosh", 0.35);
    }
    lastPt.current = { x: p.cx, y: p.cy };
    if (moves.current % 8 === 0) progress();
  };

  const progress = () => {
    const ph = phaseRef.current;
    if (ph === "scrub") {
      const f = cleared(start.current.mud, measure(mud.current!));
      audioManager.playNote(Math.min(9, Math.floor(f * 10)));
      if (f < STEP_DONE) return;
      mud.current!.getContext("2d")!.clearRect(0, 0, mud.current!.width, mud.current!.height);
      start.current.foam = coveredCount(measure(foam.current!));
      phaseRef.current = "rinse";
      setPhase("rinse");
      audioManager.play("success");
      audioManager.speak(STEPS[1].say);
    } else if (ph === "rinse") {
      const f = cleared(start.current.foam, measure(foam.current!));
      audioManager.playNote(Math.min(9, Math.floor(f * 10)));
      if (f < STEP_DONE) return;
      foam.current!.getContext("2d")!.clearRect(0, 0, foam.current!.width, foam.current!.height);
      phaseRef.current = "shine";
      setPhase("shine");
      rubbing.current = false;
      const n = count + 1;
      // A star round plays the jingle with its celebration
      if (n % STAR_EVERY !== 0) audioManager.play("reward");
      audioManager.speak(`Sparkly clean! Beep beep! Thank you!`);
      if (n % STAR_EVERY === 0) void finishActivity(MODULE_ID, { score: n });
      later(() => setPhase("leave"), 2400);
      later(() => setCount(n), reduced ? 2700 : 3600);
    }
  };

  const tool = phase === "rinse" ? STEPS[1].tool : STEPS[0].tool;
  const working = phase === "scrub" || phase === "rinse";

  return (
    <div className="flex flex-1 flex-col items-center gap-4">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-gradient-to-b from-sky-200 to-sky-100 px-3 pt-10 pb-6 shadow-inner dark:from-sky-900 dark:to-slate-800">
        {/* wash bay: tiles, a sign and hanging brushes */}
        <div className="absolute inset-x-0 top-0 flex h-8 items-center justify-center bg-kid-blue text-lg font-extrabold tracking-widest text-white" aria-hidden>
          🫧 WASH 🫧
        </div>
        <div className="absolute inset-x-0 bottom-0 h-10 bg-slate-300 dark:bg-slate-600" aria-hidden />
        <motion.div
          key={count}
          ref={box}
          className="relative mx-auto aspect-[400/240] w-full max-w-2xl touch-none select-none"
          initial={reduced ? false : { x: "-120%" }}
          animate={phase === "leave" && !reduced ? { x: "130%" } : phase === "shine" && !reduced ? { x: 0, y: [0, -12, 0], scaleY: [1, 0.94, 1] } : { x: 0 }}
          transition={phase === "leave" ? { duration: 1.1, ease: "easeIn" } : phase === "shine" ? { duration: 0.5, repeat: 2 } : { type: "spring", stiffness: 130, damping: 17 }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            rubbing.current = true;
            lastPt.current = null;
            rub(e);
          }}
          onPointerMove={rub}
          onPointerUp={() => {
            rubbing.current = false;
            if (working) progress();
          }}
          onPointerLeave={() => setPointer(null)}
          role="img"
          aria-label={`A ${car.name} to wash. Rub it clean.`}
        >
          <CarArt car={car} spinning={phase === "arrive" || phase === "leave"} reduced={reduced} />
          <canvas ref={mud} className="pointer-events-none absolute inset-0 h-full w-full" />
          <canvas ref={foam} className="pointer-events-none absolute inset-0 h-full w-full" />
          {phase === "shine" &&
            !reduced &&
            Array.from({ length: 10 }, (_, i) => (
              <motion.span key={i} className="pointer-events-none absolute text-3xl" style={{ left: `${8 + ((i * 37) % 84)}%`, top: `${10 + ((i * 53) % 60)}%` }} initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.4, 0], opacity: [0, 1, 0], rotate: 90 }} transition={{ duration: 1, delay: i * 0.12, repeat: 1 }} aria-hidden>
                ✨
              </motion.span>
            ))}
          <AnimatePresence>
            {drops.map((d) => (
              <motion.span key={d.id} className="pointer-events-none absolute text-2xl" style={{ left: d.x, top: d.y }} initial={{ y: 0, opacity: 1 }} animate={{ y: 70, opacity: 0 }} transition={{ duration: 0.7 }} onAnimationComplete={() => setDrops((all) => all.filter((x) => x.id !== d.id))} aria-hidden>
                {d.emoji}
              </motion.span>
            ))}
          </AnimatePresence>
          {working && pointer && (
            <span className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-6xl drop-shadow" style={{ left: pointer.x, top: pointer.y }} aria-hidden>
              {tool}
            </span>
          )}
          {working && !pointer && (
            <motion.span className="pointer-events-none absolute left-1/2 top-1/2 text-6xl drop-shadow" animate={reduced ? undefined : { x: [-40, 40, -40], y: [-10, 10, -10] }} transition={{ repeat: Infinity, duration: 1.6 }} aria-hidden>
              {tool}
            </motion.span>
          )}
        </motion.div>
      </div>
      <div className="flex items-center gap-3" aria-live="polite">
        {STEPS.map((s, i) => {
          const done = (phase === "rinse" && i === 0) || phase === "shine" || phase === "leave";
          const now = (phase === "scrub" && i === 0) || (phase === "rinse" && i === 1);
          return (
            <span key={s.id} className={`flex h-20 w-20 items-center justify-center rounded-full text-4xl shadow ${now ? "bg-kid-yellow ring-4 ring-kid-orange" : done ? "bg-kid-green" : "bg-surface opacity-60"}`} aria-label={`${s.id}${done ? " done" : ""}`}>
              {done ? "✓" : s.tool}
            </span>
          );
        })}
        <span className={`flex h-20 w-20 items-center justify-center rounded-full text-4xl shadow ${phase === "shine" ? "bg-kid-yellow ring-4 ring-kid-orange" : "bg-surface opacity-60"}`} aria-label="shine">
          ✨
        </span>
      </div>
    </div>
  );
}
