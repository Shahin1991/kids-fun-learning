"use client";

import { AnimatePresence, motion, type TargetAndTransition, type Transition } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import { BODY, CARS, cleared, coveredCount, FACE, mudSplats, STEP_DONE, STEPS, WHEELS, type Car } from "@/lib/car-wash/wash";

const MODULE_ID = "car-wash";
const STAR_EVERY = 2;
const LOW_W = 80;
const LOW_H = 48;
/** How long the car takes to drive in and stop */
const DRIVE_MS = 1000;
const INK = "#33303b";

type Phase = "arrive" | "scrub" | "rinse" | "shine" | "leave";
type Mood = "muddy" | "giggle" | "happy";

/** The body: everything that bobs on the springs (the wheels and shadow stay on the ground). */
function CarBody({ car }: { car: Car }) {
  return (
    <svg viewBox="0 0 400 240" className="absolute inset-0 h-full w-full" aria-hidden>
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
    </svg>
  );
}

function Wheels({ car, spinning, fast, reduced }: { car: Car; spinning: boolean; fast: boolean; reduced: boolean }) {
  return (
    <svg viewBox="0 0 400 240" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      {WHEELS[car.kind].map(([x, y]) => (
        <motion.g
          key={x}
          style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}
          initial={{ rotate: 0 }}
          animate={spinning && !reduced ? { rotate: [0, 360] } : { rotate: 360 }}
          // Stopping rolls on to a full turn and slows down, rather than snapping back
          transition={spinning && !reduced ? { repeat: Infinity, duration: fast ? 0.3 : 0.45, ease: "linear" } : { duration: reduced ? 0 : 0.5, ease: "easeOut" }}
        >
          <circle cx={x} cy={y} r={30} fill={INK} />
          <circle cx={x} cy={y} r={14} fill="#c9ccd3" />
          <rect x={x - 3} y={y - 14} width={6} height={28} fill="#8d909a" />
          <rect x={x - 14} y={y - 3} width={28} height={6} fill="#8d909a" />
        </motion.g>
      ))}
    </svg>
  );
}

/** Eyes that blink and follow the sponge, and a mouth that goes from worried to giggly to proud. Drawn over the mud so the child always sees it. */
function CarFace({ car, mood, look, glint, reduced }: { car: Car; mood: Mood; look: { x: number; y: number } | null; glint: boolean; reduced: boolean }) {
  const { eyes, r, mouth } = FACE[car.kind];
  const [mx, my] = mouth;
  const clip = `body-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox="0 0 400 240" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <clipPath id={clip}>
          <path d={BODY[car.kind]} />
        </clipPath>
      </defs>
      {glint && !reduced && (
        <motion.g clipPath={`url(#${clip})`} initial={{ x: -120 }} animate={{ x: 520 }} transition={{ duration: 0.9, delay: 0.15, repeat: 1, repeatDelay: 0.5, ease: "easeInOut" }}>
          <polygon points="0,0 46,0 -14,240 -60,240" fill="#fff" opacity={0.65} />
          <polygon points="64,0 78,0 18,240 4,240" fill="#fff" opacity={0.5} />
        </motion.g>
      )}
      {eyes.map(([x, y], i) => {
        if (mood === "giggle") {
          return <path key={i} d={`M${x - r} ${y + 3} Q${x} ${y - r * 1.2} ${x + r} ${y + 3}`} stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />;
        }
        let px = r * 0.3;
        let py = 0;
        if (look) {
          const dx = look.x - x;
          const dy = look.y - y;
          const d = Math.hypot(dx, dy) || 1;
          const m = Math.min(1, d / 60) * r * 0.45;
          px = (dx / d) * m;
          py = (dy / d) * m;
        }
        return (
          <g key={i}>
            <motion.g
              style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}
              animate={reduced ? undefined : { scaleY: [1, 1, 0.1, 1] }}
              transition={{ duration: 3.6, times: [0, 0.92, 0.96, 1], repeat: Infinity, delay: 0.4 }}
            >
              <circle cx={x} cy={y} r={r} fill="#fff" stroke={INK} strokeWidth={2.5} />
              <motion.circle cx={x} cy={y} r={r * 0.5} fill={INK} animate={{ x: px, y: py }} transition={{ type: "spring", stiffness: 320, damping: 22 }} />
            </motion.g>
            {mood === "muddy" && (
              // Worried brows: the inner ends lift
              <line x1={i === 0 ? x - r : x - r * 0.8} y1={i === 0 ? y - r - 2 : y - r - 8} x2={i === 0 ? x + r * 0.8 : x + r} y2={i === 0 ? y - r - 8 : y - r - 2} stroke={INK} strokeWidth={3} strokeLinecap="round" />
            )}
          </g>
        );
      })}
      <motion.path
        key={mood}
        style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}
        initial={reduced ? false : { scale: 0.4 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 14 }}
        d={
          mood === "muddy"
            ? `M${mx - 9} ${my + 4} Q${mx} ${my - 5} ${mx + 9} ${my + 4}`
            : mood === "giggle"
              ? `M${mx - 11} ${my - 3} Q${mx} ${my + 16} ${mx + 11} ${my - 3} Z`
              : `M${mx - 10} ${my - 2} Q${mx} ${my + 10} ${mx + 10} ${my - 2}`
        }
        fill={mood === "giggle" ? "#7a2b3a" : "none"}
        stroke={INK}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

/** A falling water drop or a rising soap bubble, in pixels within the car box. */
interface Fx {
  id: number;
  kind: "drop" | "bubble";
  x: number;
  y: number;
  /** Sideways drift */
  dx: number;
  size: number;
}

const newFx = (id: number, kind: Fx["kind"], x: number, y: number): Fx => ({
  id,
  kind,
  x: x + (Math.random() - 0.5) * 40,
  y,
  dx: (Math.random() - 0.5) * 50,
  size: kind === "bubble" ? 10 + Math.random() * 16 : 1,
});

const BURST = Array.from({ length: 12 }, (_, i) => ({ a: (i / 12) * Math.PI * 2 + 0.2, d: 150 + (i % 3) * 40 }));

/** Background soap bubbles drifting up the wash bay. */
const BAY_BUBBLES = [
  { left: 6, size: 26, dur: 6, delay: 0 },
  { left: 22, size: 16, dur: 5, delay: 2.2 },
  { left: 48, size: 20, dur: 6.5, delay: 1 },
  { left: 71, size: 30, dur: 7, delay: 3.4 },
  { left: 90, size: 18, dur: 5.5, delay: 1.6 },
];

export default function CarWash() {
  const reduced = useAppReducedMotion();
  const [count, setCount] = useState(0);
  const car = CARS[count % CARS.length];
  const [phase, setPhase] = useState<Phase>("arrive");
  const [driving, setDriving] = useState(true);
  const [held, setHeld] = useState(false);
  /** How clean the current step is (0..1), for the ring on its badge */
  const [clean, setClean] = useState(0);
  const [pointer, setPointer] = useState<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const [fx, setFx] = useState<Fx[]>([]);
  const [burst, setBurst] = useState<{ id: number; emoji: string } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const mud = useRef<HTMLCanvasElement>(null);
  const foam = useRef<HTMLCanvasElement>(null);
  const low = useRef<HTMLCanvasElement | null>(null);
  const start = useRef({ mud: 0, foam: 0 });
  const rubbing = useRef(false);
  const moves = useRef(0);
  /** The last rub point (car units), so a fast swipe wipes the whole way and not just dots */
  const lastPt = useRef<{ x: number; y: number } | null>(null);
  const fxId = useRef(0);
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

  const celebrate = (emoji: string) => {
    if (reduced) return;
    const id = ++fxId.current;
    setBurst({ id, emoji });
    later(() => setBurst((b) => (b?.id === id ? null : b)), 1400);
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
    setDriving(true);
    setClean(0);
    later(() => setDriving(false), reduced ? 0 : DRIVE_MS);
    later(
      () => {
        setPhase("scrub");
        audioManager.speak(`Oh no, a muddy ${car.name}! ${STEPS[0].say}`);
      },
      reduced ? 300 : 1600,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one setup per car
  }, [count]);

  const local = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, cx: ((e.clientX - r.left) / r.width) * 400, cy: ((e.clientY - r.top) / r.width) * 400 };
  };

  const spawn = (kind: Fx["kind"], x: number, y: number) => {
    if (reduced) return;
    const id = ++fxId.current;
    setFx((all) => [...all.slice(-24), newFx(id, kind, x, y)]);
  };

  const rub = (e: React.PointerEvent) => {
    const p = local(e);
    setPointer(p);
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
      if (moves.current % 5 === 0) spawn("bubble", p.x, p.y - 20);
      if (moves.current % 9 === 0) audioManager.playPop(moves.current);
    } else {
      const g = foam.current!.getContext("2d")!;
      g.save();
      g.scale(k, k);
      wipe(g, lastPt.current ?? { x: p.cx, y: p.cy }, { x: p.cx, y: p.cy }, 72);
      g.restore();
      if (moves.current % 2 === 0) spawn("drop", p.x - 10, p.y + 18);
      if (moves.current % 14 === 0) audioManager.playSfx("whoosh", 0.35);
    }
    lastPt.current = { x: p.cx, y: p.cy };
    if (moves.current % 8 === 0) progress();
  };

  const progress = () => {
    const ph = phaseRef.current;
    if (ph === "scrub") {
      const f = cleared(start.current.mud, measure(mud.current!));
      setClean(f / STEP_DONE);
      audioManager.playNote(Math.min(9, Math.floor(f * 10)));
      if (f < STEP_DONE) return;
      mud.current!.getContext("2d")!.clearRect(0, 0, mud.current!.width, mud.current!.height);
      start.current.foam = coveredCount(measure(foam.current!));
      phaseRef.current = "rinse";
      setPhase("rinse");
      setClean(0);
      celebrate("🫧");
      audioManager.play("success");
      audioManager.speak(STEPS[1].say);
    } else if (ph === "rinse") {
      const f = cleared(start.current.foam, measure(foam.current!));
      setClean(f / STEP_DONE);
      audioManager.playNote(Math.min(9, Math.floor(f * 10)));
      if (f < STEP_DONE) return;
      foam.current!.getContext("2d")!.clearRect(0, 0, foam.current!.width, foam.current!.height);
      phaseRef.current = "shine";
      setPhase("shine");
      setHeld(false);
      rubbing.current = false;
      celebrate("⭐");
      const n = count + 1;
      // A star round plays the jingle with its celebration
      if (n % STAR_EVERY !== 0) audioManager.play("reward");
      audioManager.speak(`Sparkly clean! Beep beep! Thank you!`);
      if (n % STAR_EVERY === 0) void finishActivity(MODULE_ID, { score: n });
      later(() => {
        setPhase("leave");
        setDriving(true);
        audioManager.playSfx("whoosh", 0.6);
      }, 2500);
      later(() => setCount(n), reduced ? 2800 : 3900);
    }
  };

  const tool = phase === "rinse" ? STEPS[1].tool : STEPS[0].tool;
  const working = phase === "scrub" || phase === "rinse";
  const mood: Mood = working && held ? "giggle" : phase === "arrive" || phase === "scrub" ? "muddy" : "happy";

  // The whole car: drive in, hop for joy, then wind up and zoom off
  let carMove: TargetAndTransition = { x: "0%" };
  let carTween: Transition = { duration: 1, ease: [0.22, 1, 0.36, 1] };
  if (reduced) carTween = { duration: 0 };
  else if (phase === "shine") {
    carMove = { x: "0%", y: [0, 0, -26, 0, 0], scaleY: [1, 0.86, 1.1, 0.94, 1], scaleX: [1, 1.08, 0.94, 1.05, 1] };
    carTween = { duration: 0.7, times: [0, 0.2, 0.5, 0.8, 1], repeat: 2, repeatDelay: 0.15, ease: "easeOut" };
  } else if (phase === "leave") {
    carMove = { x: ["0%", "-6%", "130%"], scaleX: [1, 0.92, 1.12] };
    carTween = { duration: 1.3, times: [0, 0.3, 1], ease: ["easeOut", "easeIn"] };
  }

  // The body on its springs: bounce while driving, nod on the brakes, giggle while being scrubbed, breathe while waiting
  let bodyMove: TargetAndTransition = { y: 0, rotate: 0, scaleY: 1 };
  let bodyTween: Transition = { duration: 0.3 };
  if (!reduced) {
    if (driving) {
      bodyMove = { y: [0, -4, 0], rotate: 0, scaleY: 1 };
      bodyTween = { y: { repeat: Infinity, duration: 0.26, ease: "easeInOut" } };
    } else if (phase === "arrive") {
      bodyMove = { y: 0, rotate: [0, 3, -1.2, 0], scaleY: 1 };
      bodyTween = { rotate: { duration: 0.6, ease: "easeOut" } };
    } else if (working && held) {
      bodyMove = { y: 0, rotate: [-0.7, 0.7, -0.7], scaleY: 1 };
      bodyTween = { rotate: { repeat: Infinity, duration: 0.24 } };
    } else if (working) {
      bodyMove = { y: 0, rotate: 0, scaleY: [1, 1.015, 1] };
      bodyTween = { scaleY: { repeat: Infinity, duration: 2.4, ease: "easeInOut" } };
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-4">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-gradient-to-b from-sky-200 to-sky-100 px-3 pt-10 pb-6 shadow-inner dark:from-sky-900 dark:to-slate-800">
        {/* wash bay: a sign, swaying curtain strips, drifting bubbles and the floor */}
        <div className="absolute inset-x-0 top-0 z-10 flex h-8 items-center justify-center bg-kid-blue text-lg font-extrabold tracking-widest text-white" aria-hidden>
          🫧 WASH 🫧
        </div>
        <div className="absolute inset-x-6 top-8 flex justify-between" aria-hidden>
          {Array.from({ length: 9 }, (_, i) => (
            <motion.div
              key={i}
              className={`h-6 w-[7%] rounded-b-lg ${i % 2 ? "bg-sky-400/70" : "bg-kid-blue/60"}`}
              style={{ transformOrigin: "50% 0%" }}
              animate={reduced ? undefined : { rotate: working && held ? [-12, 12, -12] : [-5, 5, -5] }}
              transition={{ repeat: Infinity, duration: working && held ? 0.6 : 2.6, delay: i * 0.18, ease: "easeInOut" }}
            />
          ))}
        </div>
        {!reduced &&
          BAY_BUBBLES.map((b, i) => (
            <motion.div
              key={i}
              className="pointer-events-none absolute bottom-10 rounded-full border-2 border-white/80 bg-white/25"
              style={{ left: `${b.left}%`, width: b.size, height: b.size }}
              animate={{ y: [0, -260], x: [0, 14, -10, 6], opacity: [0, 0.9, 0.9, 0] }}
              transition={{ repeat: Infinity, duration: b.dur, delay: b.delay, ease: "easeOut" }}
              aria-hidden
            />
          ))}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-slate-300 dark:bg-slate-600" aria-hidden />
        <motion.div
          key={count}
          ref={box}
          className="relative mx-auto aspect-[400/240] w-full max-w-2xl touch-none select-none"
          style={{ transformOrigin: "50% 85%" }}
          initial={reduced ? false : { x: "-120%" }}
          animate={carMove}
          transition={carTween}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            rubbing.current = true;
            lastPt.current = null;
            if (working) setHeld(true);
            rub(e);
          }}
          onPointerMove={rub}
          onPointerUp={() => {
            rubbing.current = false;
            setHeld(false);
            if (working) progress();
          }}
          onPointerCancel={() => {
            rubbing.current = false;
            setHeld(false);
          }}
          onPointerLeave={() => setPointer(null)}
          role="img"
          aria-label={`A ${car.name} to wash. Rub it clean.`}
        >
          <svg viewBox="0 0 400 240" className="absolute inset-0 h-full w-full" aria-hidden>
            <ellipse cx={200} cy={206} rx={185} ry={12} fill="#000" opacity={0.15} />
          </svg>
          <motion.div className="absolute inset-0" style={{ transformOrigin: "60% 75%" }} animate={bodyMove} transition={bodyTween}>
            <CarBody car={car} />
            <canvas ref={mud} className="pointer-events-none absolute inset-0 h-full w-full" />
            <canvas ref={foam} className="pointer-events-none absolute inset-0 h-full w-full" />
            <CarFace car={car} mood={mood} look={pointer && { x: pointer.cx, y: pointer.cy }} glint={phase === "shine"} reduced={reduced} />
          </motion.div>
          <Wheels car={car} spinning={driving} fast={phase === "leave"} reduced={reduced} />
          {driving &&
            !reduced &&
            [0, 1, 2].map((i) => (
              // Exhaust puffs from the back of the car
              <motion.span
                key={i}
                className="pointer-events-none absolute left-0 top-[58%] text-3xl"
                initial={{ x: 0, scale: 0.4, opacity: 0 }}
                animate={{ x: -60, y: -14, scale: 1.4, opacity: [0, 0.9, 0] }}
                transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.23, ease: "easeOut" }}
                aria-hidden
              >
                💨
              </motion.span>
            ))}
          {phase === "shine" &&
            !reduced &&
            Array.from({ length: 10 }, (_, i) => (
              <motion.span key={i} className="pointer-events-none absolute text-3xl" style={{ left: `${8 + ((i * 37) % 84)}%`, top: `${10 + ((i * 53) % 60)}%` }} initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.4, 0], opacity: [0, 1, 0], rotate: 90 }} transition={{ duration: 1, delay: i * 0.12, repeat: 1 }} aria-hidden>
                ✨
              </motion.span>
            ))}
          <AnimatePresence>
            {fx.map((d) =>
              d.kind === "drop" ? (
                <motion.span
                  key={d.id}
                  className="pointer-events-none absolute -translate-x-1/2 text-2xl"
                  style={{ left: d.x, top: d.y }}
                  initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                  animate={{ x: d.dx * 0.5, y: 120, scale: 0.7, opacity: 0 }}
                  // Ease-in reads as gravity
                  transition={{ duration: 0.75, ease: [0.55, 0, 1, 0.45] }}
                  onAnimationComplete={() => setFx((all) => all.filter((x) => x.id !== d.id))}
                  aria-hidden
                >
                  💧
                </motion.span>
              ) : (
                <motion.span
                  key={d.id}
                  className="pointer-events-none absolute rounded-full border-2 border-sky-300/90 bg-white/60"
                  style={{ left: d.x, top: d.y, width: d.size, height: d.size }}
                  initial={{ x: 0, y: 0, scale: 0.3, opacity: 0 }}
                  animate={{ x: [0, d.dx, -d.dx / 2], y: -80, scale: [0.3, 1, 1.15], opacity: [0, 1, 0] }}
                  transition={{ duration: 1.1, ease: "easeOut" }}
                  onAnimationComplete={() => setFx((all) => all.filter((x) => x.id !== d.id))}
                  aria-hidden
                />
              ),
            )}
          </AnimatePresence>
          {working && pointer && (
            <span className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" style={{ left: pointer.x, top: pointer.y }} aria-hidden>
              <motion.span
                className="block text-6xl drop-shadow"
                animate={reduced ? undefined : held ? { rotate: [-14, 14, -14], scale: 0.9 } : { rotate: 0, scale: 1 }}
                transition={held ? { rotate: { repeat: Infinity, duration: 0.22 }, scale: { type: "spring", stiffness: 500, damping: 15 } } : { type: "spring", stiffness: 400, damping: 12 }}
              >
                {tool}
              </motion.span>
            </span>
          )}
          {working && !pointer && (
            <motion.span
              className="pointer-events-none absolute left-1/2 top-1/2 text-6xl drop-shadow"
              animate={reduced ? undefined : { x: [-40, 40, -40], y: [-10, 10, -10], rotate: [-10, 10, -10] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
              aria-hidden
            >
              {tool}
            </motion.span>
          )}
        </motion.div>
        {burst &&
          BURST.map(({ a, d }, i) => (
            <motion.span
              key={`${burst.id}-${i}`}
              className="pointer-events-none absolute left-1/2 top-1/2 text-3xl"
              initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
              animate={{ x: [0, Math.cos(a) * d], y: [0, Math.sin(a) * d * 0.55 - 20, Math.sin(a) * d * 0.55 + 50], scale: [0, 1.3, 0.8], opacity: [1, 1, 0], rotate: i % 2 ? 120 : -120 }}
              transition={{ duration: 1.2, times: [0, 0.45, 1], ease: "easeOut" }}
              aria-hidden
            >
              {burst.emoji}
            </motion.span>
          ))}
      </div>
      <div className="flex items-center gap-3" aria-live="polite">
        {STEPS.map((s, i) => {
          const done = (phase === "rinse" && i === 0) || phase === "shine" || phase === "leave";
          const now = (phase === "scrub" && i === 0) || (phase === "rinse" && i === 1);
          return (
            <StepBadge key={s.id} label={`${s.id}${done ? " done" : ""}`} state={now ? "now" : done ? "done" : "todo"} fill={now ? clean : 0} reduced={reduced}>
              {done ? "✓" : s.tool}
            </StepBadge>
          );
        })}
        <StepBadge label="shine" state={phase === "shine" ? "now" : phase === "leave" ? "done" : "todo"} fill={phase === "shine" ? 1 : 0} reduced={reduced}>
          ✨
        </StepBadge>
      </div>
    </div>
  );
}

/** A step bubble: breathes while it's the current step, fills a ring as the car gets clean, and pops when done. */
function StepBadge({ state, fill, label, reduced, children }: { state: "todo" | "now" | "done"; fill: number; label: string; reduced: boolean; children: React.ReactNode }) {
  return (
    <motion.span
      className={`relative flex h-20 w-20 items-center justify-center rounded-full text-4xl shadow ${state === "now" ? "bg-kid-yellow" : state === "done" ? "bg-kid-green" : "bg-surface opacity-60"}`}
      animate={reduced ? undefined : state === "now" ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={state === "now" ? { repeat: Infinity, duration: 1.4, ease: "easeInOut" } : { duration: 0.2 }}
      aria-label={label}
    >
      {state === "now" && (
        <svg viewBox="0 0 100 100" className="pointer-events-none absolute -left-1.5 -top-1.5 h-[92px] w-[92px] -rotate-90" aria-hidden>
          <circle cx={50} cy={50} r={46} fill="none" strokeWidth={7} className="stroke-kid-orange/40" />
          <motion.circle cx={50} cy={50} r={46} fill="none" strokeWidth={7} strokeLinecap="round" className="stroke-kid-orange" initial={{ pathLength: 0 }} animate={{ pathLength: Math.min(1, fill) }} transition={{ type: "spring", stiffness: 120, damping: 18 }} />
        </svg>
      )}
      <motion.span key={state} initial={reduced || state !== "done" ? false : { scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 500, damping: 12 }}>
        {children}
      </motion.span>
    </motion.span>
  );
}
