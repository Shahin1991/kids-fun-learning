"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import { hideAnimals, pickTarget, SPOTS, type Hiding, type SpotId } from "@/lib/peekaboo-farm/farm";

const MODULE_ID = "peekaboo-farm";
/** How long an animal stays out before it hides again. */
const SHOW_MS = 3200;
const SPARKS = ["⭐", "💛", "✨", "🌟", "💖", "✨"];

type Layout = { w: number; h: number; horizon: number; spots: Record<SpotId, [x: number, y: number, scale: number]> };

// Back row first, so front spots draw over the ones behind them.
const WIDE: Layout = {
  w: 1000,
  h: 620,
  horizon: 300,
  spots: { barn: [190, 390, 1], haystack: [510, 380, 0.9], flowers: [820, 385, 0.9], bush: [170, 600, 0.95], pond: [500, 600, 0.95], crate: [830, 600, 0.95] },
};
const TALL: Layout = {
  w: 600,
  h: 1000,
  horizon: 250,
  spots: { barn: [160, 420, 0.9], haystack: [445, 420, 0.85], flowers: [160, 700, 0.85], pond: [445, 700, 0.85], bush: [160, 975, 0.85], crate: [445, 975, 0.85] },
};

const SPRING = { type: "spring", stiffness: 420, damping: 13 } as const;

/** A cover that sits in front of the animal; reacts with a little squash when opened. */
function Cover({ open, reduced, children }: { open: boolean; reduced: boolean; children: ReactNode }) {
  return (
    <motion.g style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }} animate={open && !reduced ? { scaleY: [1, 0.9, 1], scaleX: [1, 1.06, 1] } : { scaleY: 1, scaleX: 1 }} transition={{ duration: 0.35 }}>
      {children}
    </motion.g>
  );
}

function Barn({ open, reduced, animal }: { open: boolean; reduced: boolean; animal: ReactNode }) {
  const door = (side: -1 | 1) => (
    <motion.g style={{ transformBox: "fill-box", transformOrigin: side < 0 ? "0% 50%" : "100% 50%" }} animate={{ scaleX: open ? 0.12 : 1 }} transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 200, damping: 14 }}>
      <rect x={side < 0 ? -56 : 0} y={-124} width={56} height={124} fill="#b5302f" stroke="#fff" strokeWidth={5} />
      <path d={side < 0 ? "M-56 -124 L0 0 M0 -124 L-56 0" : "M0 -124 L56 0 M56 -124 L0 0"} stroke="#fff" strokeWidth={5} />
    </motion.g>
  );
  return (
    <>
      <path d="M-125 -180 L0 -265 L125 -180 Z" fill="#8e2423" />
      <rect x={-112} y={-185} width={224} height={185} fill="#d8433f" />
      <path d="M-125 -180 L0 -265 L125 -180" fill="none" stroke="#fff" strokeWidth={8} strokeLinejoin="round" />
      <circle cx={0} cy={-205} r={18} fill="#fff6d6" stroke="#fff" strokeWidth={5} />
      <rect x={-58} y={-126} width={116} height={126} fill="#3d2420" />
      {animal}
      {door(-1)}
      {door(1)}
    </>
  );
}

const hay = (
  <>
    <path d="M-115 0 C-115 -150 115 -150 115 0 Z" fill="#f2c94c" />
    <path d="M-115 0 C-115 -150 115 -150 115 0" fill="none" stroke="#d9a62e" strokeWidth={5} />
    {[-70, -30, 10, 50, 85].map((x, i) => (
      <path key={x} d={`M${x} ${-20 - (i % 2) * 18} l14 -26`} stroke="#c58f1c" strokeWidth={5} strokeLinecap="round" />
    ))}
  </>
);

function Bush({ open, reduced }: { open: boolean; reduced: boolean }) {
  const half = (side: -1 | 1) => (
    <motion.g animate={{ x: open ? side * 55 : 0, rotate: open ? side * 8 : 0 }} transition={reduced ? { duration: 0 } : SPRING} style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
      <circle cx={side * 55} cy={-55} r={58} fill="#3fa34d" />
      <circle cx={side * 20} cy={-95} r={50} fill="#4cba5a" />
      <circle cx={side * 70} cy={-75} r={10} fill="#ff6fa5" />
      <circle cx={side * 25} cy={-40} r={9} fill="#ffd93d" />
    </motion.g>
  );
  return (
    <>
      {half(-1)}
      {half(1)}
    </>
  );
}

function Pond({ open, reduced }: { open: boolean; reduced: boolean }) {
  return (
    <>
      <ellipse cx={0} cy={-22} rx={128} ry={32} fill="#4d96ff" />
      <ellipse cx={-30} cy={-28} rx={40} ry={8} fill="#a8d4ff" opacity={0.7} />
      {open && !reduced && <motion.ellipse cx={0} cy={-24} rx={60} ry={14} fill="none" stroke="#fff" strokeWidth={4} initial={{ scale: 0.3, opacity: 1 }} animate={{ scale: 2, opacity: 0 }} transition={{ duration: 0.8 }} style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }} />}
      {[-95, -75, 75, 98].map((x, i) => (
        <motion.g key={x} animate={open && !reduced ? { rotate: [0, x < 0 ? -10 : 10, 0] } : { rotate: 0 }} transition={{ duration: 0.6 }} style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
          <path d={`M${x} -10 Q${x + (i % 2 ? 6 : -6)} -80 ${x} -${120 - i * 8}`} stroke="#2f8f3f" strokeWidth={8} fill="none" strokeLinecap="round" />
          <ellipse cx={x} cy={-(112 - i * 8)} rx={7} ry={18} fill="#8b5a2b" />
        </motion.g>
      ))}
    </>
  );
}

function Crate({ open, reduced }: { open: boolean; reduced: boolean }) {
  return (
    <>
      <rect x={-95} y={-110} width={190} height={110} rx={6} fill="#c98a4b" stroke="#8a5a2b" strokeWidth={6} />
      {[-75, -38, 0, 38].map((y) => (
        <line key={y} x1={-95} x2={95} y1={-110 + 30 + (y + 75) * 0.75} y2={-110 + 30 + (y + 75) * 0.75} stroke="#8a5a2b" strokeWidth={4} opacity={0.6} />
      ))}
      <motion.g style={{ transformBox: "fill-box", transformOrigin: "0% 100%" }} animate={{ rotate: open ? -75 : 0 }} transition={reduced ? { duration: 0 } : SPRING}>
        <rect x={-102} y={-128} width={204} height={22} rx={6} fill="#dca064" stroke="#8a5a2b" strokeWidth={6} />
      </motion.g>
    </>
  );
}

function Flowers({ open, reduced }: { open: boolean; reduced: boolean }) {
  return (
    <>
      {[-80, -40, 0, 40, 80].map((x, i) => (
        <motion.g key={x} animate={{ rotate: open ? (x < 0 ? -18 : x > 0 ? 18 : 0) : 0, x: open && x === 0 ? 60 : 0 }} transition={reduced ? { duration: 0 } : SPRING} style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
          <path d={`M${x} 0 L${x} ${-110 - (i % 2) * 25}`} stroke="#3f9d47" strokeWidth={9} />
          <ellipse cx={x - 14} cy={-60} rx={16} ry={8} fill="#4cba5a" />
          {Array.from({ length: 8 }, (_, k) => (
            <ellipse key={k} cx={x} cy={-110 - (i % 2) * 25 - 22} rx={9} ry={22} fill="#ffd93d" transform={`rotate(${k * 45} ${x} ${-110 - (i % 2) * 25})`} />
          ))}
          <circle cx={x} cy={-110 - (i % 2) * 25} r={15} fill="#8b5a2b" />
        </motion.g>
      ))}
    </>
  );
}

function Sparks({ burst }: { burst: number }) {
  return (
    <AnimatePresence>
      {burst > 0 &&
        SPARKS.map((s, i) => {
          const a = (i / SPARKS.length) * Math.PI * 2 - Math.PI / 2;
          return (
            <motion.text key={`${burst}-${i}`} x={0} y={-150} fontSize={34} textAnchor="middle" initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }} animate={{ x: Math.cos(a) * 120, y: Math.sin(a) * 90, opacity: 0, scale: 1.2 }} transition={{ duration: 0.9, ease: "easeOut" }} aria-hidden>
              {s}
            </motion.text>
          );
        })}
    </AnimatePresence>
  );
}

export default function PeekabooFarm() {
  const reduced = useAppReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const [tall, setTall] = useState(false);
  const [hiding, setHiding] = useState<Hiding>(() => hideAnimals());
  const [open, setOpen] = useState<Partial<Record<SpotId, number>>>({});
  const [found, setFound] = useState<Set<SpotId>>(new Set());
  const [round, setRound] = useState(0);
  const [target, setTarget] = useState<SpotId | null>(null);
  const [wiggle, setWiggle] = useState<SpotId | null>(null);
  const [allOut, setAllOut] = useState(false);
  const timers = useRef<Partial<Record<SpotId | "round", ReturnType<typeof setTimeout>>>>({});

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setTall(el.clientHeight > el.clientWidth * 1.1));
    ro.observe(el);
    const t = timers.current;
    return () => {
      ro.disconnect();
      Object.values(t).forEach((x) => x && clearTimeout(x));
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => audioManager.speak("Who is hiding on the farm? Tap to find them!"), 600);
    return () => clearTimeout(t);
  }, []);

  // Now and then a hidden spot wiggles: "someone's in there!"
  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      const closed = SPOTS.filter((s) => !open[s]);
      const pool = target && closed.includes(target) && Math.random() < 0.5 ? [target] : closed;
      setWiggle(pool.length ? pool[Math.floor(Math.random() * pool.length)] : null);
    }, 2600);
    return () => clearInterval(id);
  }, [open, target, reduced]);

  const ask = (h: Hiding, spot: SpotId) => {
    const a = h[spot];
    audioManager.speak(`Where is the ${a.label.toLowerCase()}? ${a.phrase}`);
  };

  /** Everyone pops out together, then they all hide in new places and the "find" game begins. */
  const finishRound = () => {
    setAllOut(true);
    setTarget(null);
    audioManager.play("reward");
    audioManager.speak("You found everyone! Hooray!");
    void finishActivity(MODULE_ID, { score: round + 1 });
    timers.current.round = setTimeout(() => {
      setAllOut(false);
      setOpen({});
      setFound(new Set());
      const next = hideAnimals();
      // Keep the old animals while the doors close, then swap them
      timers.current.round = setTimeout(() => {
        setHiding(next);
        setRound((n) => n + 1);
        const t = pickTarget(new Set());
        setTarget(t);
        if (t) ask(next, t);
      }, 600);
    }, 3800);
  };

  const tap = (spot: SpotId) => {
    if (allOut) return;
    const a = hiding[spot];
    audioManager.playPop(SPOTS.indexOf(spot));
    setOpen((o) => ({ ...o, [spot]: (o[spot] ?? 0) + 1 }));
    if (timers.current[spot]) clearTimeout(timers.current[spot]);
    timers.current[spot] = setTimeout(() => setOpen((o) => ({ ...o, [spot]: 0 })), SHOW_MS);

    const nowFound = new Set(found).add(spot);
    setFound(nowFound);
    const name = a.label.toLowerCase();
    if (nowFound.size === SPOTS.length && found.size < SPOTS.length) {
      audioManager.speak(`Peekaboo! The ${name}! ${a.phrase}`);
      timers.current.round = setTimeout(finishRound, 1600);
      return;
    }
    if (target === spot) {
      audioManager.play("success");
      const next = pickTarget(nowFound, Math.random, spot);
      setTarget(next);
      audioManager.speak(`Yay! You found the ${name}! ${a.phrase}${next ? ` Now where is the ${hiding[next].label.toLowerCase()}?` : ""}`);
    } else if (target) {
      audioManager.speak(`Peekaboo! It's the ${name}! ${a.phrase} Where is the ${hiding[target].label.toLowerCase()}?`);
    } else {
      audioManager.playNote(SPOTS.indexOf(spot) + 2);
      audioManager.speak(`Peekaboo! The ${name}! ${a.phrase}`);
    }
  };

  const L = tall ? TALL : WIDE;

  const spotArt = (spot: SpotId, isOpen: boolean) => {
    const a = hiding[spot];
    const sz = spot === "barn" ? 112 : 150;
    // The barn animal stands in the doorway; everyone else pops up from behind their cover
    const shownY = spot === "barn" ? 0 : spot === "pond" ? -45 : spot === "crate" ? -60 : spot === "flowers" ? -125 : -85;
    // Hidden animals sit fully under the ground line (clipped), since flowers and reeds are see-through
    const hiddenY = spot === "barn" ? 0 : sz + 10;
    const animal = (
      <g clipPath={`url(#clip-${spot})`}>
        <motion.g
          style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
          initial={false}
          animate={isOpen ? { y: shownY, scaleY: reduced ? 1 : [0.7, 1.15, 1], scaleX: reduced ? 1 : [1.2, 0.9, 1] } : { y: hiddenY, scaleY: 1, scaleX: 1 }}
          transition={reduced ? { duration: 0 } : { y: SPRING, scaleY: { duration: 0.45 }, scaleX: { duration: 0.45 } }}
        >
          <motion.g animate={isOpen && !reduced ? { rotate: [0, -4, 4, 0] } : { rotate: 0 }} transition={{ repeat: isOpen ? Infinity : 0, duration: 1.6 }} style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
            <image href={a.art} x={-sz / 2} y={spot === "barn" ? -sz - 4 : -sz} width={sz} height={sz} />
          </motion.g>
        </motion.g>
      </g>
    );
    const props = { open: isOpen, reduced };
    if (spot === "barn") return <Barn {...props} animal={animal} />;
    return (
      <>
        {spot !== "pond" && animal}
        {spot === "pond" && (
          <>
            <ellipse cx={0} cy={-22} rx={128} ry={32} fill="#4d96ff" />
            {animal}
          </>
        )}
        <Cover {...props}>
          {spot === "haystack" && hay}
          {spot === "bush" && <Bush {...props} />}
          {spot === "pond" && <Pond {...props} />}
          {spot === "crate" && <Crate {...props} />}
          {spot === "flowers" && <Flowers {...props} />}
        </Cover>
      </>
    );
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {target && !allOut && (
        <button type="button" onClick={() => ask(hiding, target)} aria-label={`Where is the ${hiding[target].label}? Hear it again`} className="absolute left-1/2 top-2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-surface/95 px-5 py-2 text-2xl font-extrabold shadow-lg active:scale-95">
          <span aria-hidden>🔍</span>
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny local SVG, works offline */}
          <img src={hiding[target].art} alt="" width={56} height={56} />
          <span aria-hidden>?</span>
        </button>
      )}
      <div ref={box} className="relative min-h-[60dvh] flex-1 overflow-hidden rounded-3xl shadow-inner">
        <svg viewBox={`0 0 ${L.w} ${L.h}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full touch-manipulation select-none" role="img" aria-label="A farm with animals hiding">
          <defs>
            <linearGradient id="farm-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7cc8ff" />
              <stop offset="100%" stopColor="#d6f0ff" />
            </linearGradient>
            {SPOTS.map((s) => (
              <clipPath key={s} id={`clip-${s}`}>
                <rect x={-200} y={-420} width={400} height={s === "pond" ? 398 : 420} />
              </clipPath>
            ))}
          </defs>
          <rect width={L.w} height={L.h} fill="url(#farm-sky)" />
          <motion.g animate={reduced ? undefined : { rotate: 360 }} transition={{ repeat: Infinity, duration: 40, ease: "linear" }} style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}>
            {Array.from({ length: 10 }, (_, i) => (
              <rect key={i} x={L.w - 110 - 4} y={30} width={8} height={130} rx={4} fill="#ffe066" opacity={0.6} transform={`rotate(${i * 36} ${L.w - 110} 95)`} />
            ))}
          </motion.g>
          <circle cx={L.w - 110} cy={95} r={48} fill="#ffd93d" />
          {[0, 1].map((i) => (
            <motion.g key={i} initial={{ x: i ? L.w * 0.5 : 0 }} animate={reduced ? undefined : { x: [i ? L.w * 0.5 : 0, L.w * 0.7, -L.w * 0.3, i ? L.w * 0.5 : 0] }} transition={{ repeat: Infinity, duration: 70 + i * 25, ease: "linear" }}>
              <g fill="#fff" opacity={0.9}>
                <ellipse cx={120} cy={80 + i * 60} rx={60} ry={26} />
                <ellipse cx={160} cy={66 + i * 60} rx={40} ry={30} />
                <ellipse cx={90} cy={70 + i * 60} rx={30} ry={22} />
              </g>
            </motion.g>
          ))}
          <ellipse cx={L.w * 0.2} cy={L.horizon + 30} rx={L.w * 0.45} ry={120} fill="#7fd27f" />
          <ellipse cx={L.w * 0.85} cy={L.horizon + 40} rx={L.w * 0.5} ry={110} fill="#6cc66c" />
          <rect y={L.horizon + 40} width={L.w} height={L.h - L.horizon} fill="#8bdc7a" />
          {Array.from({ length: Math.ceil(L.w / 60) + 1 }, (_, i) => (
            <rect key={i} x={i * 60} y={L.horizon + 10} width={12} height={50} rx={3} fill="#f5e6c8" />
          ))}
          <rect y={L.horizon + 22} width={L.w} height={9} fill="#f5e6c8" />
          <rect y={L.horizon + 42} width={L.w} height={9} fill="#f5e6c8" />

          {SPOTS.map((spot) => {
            const [x, y, s] = L.spots[spot];
            const isOpen = allOut || (open[spot] ?? 0) > 0;
            return (
              <g key={spot} transform={`translate(${x} ${y}) scale(${s})`}>
                <motion.g
                  role="button"
                  aria-label={isOpen ? hiding[spot].label : `Look in the ${spot}`}
                  tabIndex={0}
                  className="cursor-pointer outline-none"
                  onClick={() => tap(spot)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && tap(spot)}
                  animate={wiggle === spot && !isOpen ? { rotate: [0, -3, 3, -2, 0] } : { rotate: 0 }}
                  transition={{ duration: 0.6 }}
                  style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
                >
                  <ellipse cx={0} cy={2} rx={130} ry={16} fill="#000" opacity={0.08} />
                  <rect x={-135} y={-250} width={270} height={262} fill="transparent" />
                  {spotArt(spot, isOpen)}
                  <Sparks burst={allOut ? round + 100 : (open[spot] ?? 0)} />
                </motion.g>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
