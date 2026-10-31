"use client";

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Burst } from "@/components/Burst";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { ShakeOnWrong } from "@/components/ShakeOnWrong";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import { binById, binsFor, goesIn, litterById, makeLitter, type Bin, type BinId, type Piece } from "@/lib/clean-up/recycle";

const MODULE_ID = "clean-up";
const FLOWERS = ["🌷", "🌼", "🌸", "🌻", "🌺", "🌷", "🌼", "🌸", "🌻"];

const INK = "#33303b";

/**
 * A bin with a face. It blinks while it waits, lifts its lid and looks up when the child is holding
 * something ("give it to me!"), and gulps with a squash and happy eyes when something goes in.
 */
function BinArt({ bin, open, hungry, gulp, reduced }: { bin: Bin; open: boolean; hungry: boolean; gulp: number; reduced: boolean }) {
  const lid = open ? -55 : hungry ? -14 : 0;
  return (
    <motion.svg
      key={gulp}
      viewBox="0 0 100 110"
      className="h-24 w-24 overflow-visible"
      style={{ transformOrigin: "50% 100%" }}
      animate={gulp && !reduced ? { scaleY: [1, 0.82, 1.1, 0.96, 1], scaleX: [1, 1.12, 0.94, 1.03, 1] } : { scaleY: 1, scaleX: 1 }}
      transition={{ duration: 0.55, delay: 0.25 }}
      aria-hidden
    >
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "0% 100%" }}
        animate={{ rotate: hungry && !open && !reduced ? [lid, lid - 8, lid] : lid }}
        transition={hungry && !open ? { repeat: Infinity, duration: 0.9 } : { type: "spring", stiffness: 300, damping: 14 }}
      >
        <rect x={8} y={10} width={84} height={14} rx={6} fill={bin.color} stroke="rgba(0,0,0,0.25)" strokeWidth={3} />
        <rect x={40} y={3} width={20} height={9} rx={4} fill={bin.color} stroke="rgba(0,0,0,0.25)" strokeWidth={3} />
      </motion.g>
      <path d="M14 28 L86 28 L80 106 L20 106 Z" fill={bin.color} stroke="rgba(0,0,0,0.25)" strokeWidth={3} strokeLinejoin="round" />
      {[34, 50, 66].map((x) => (
        <line key={x} x1={x} y1={40} x2={x} y2={96} stroke="rgba(255,255,255,0.35)" strokeWidth={4} strokeLinecap="round" />
      ))}
      {open
        ? [38, 62].map((x) => <path key={x} d={`M${x - 6} 41 Q${x} 32 ${x + 6} 41`} stroke={INK} strokeWidth={3.5} fill="none" strokeLinecap="round" />)
        : [38, 62].map((x, i) => (
            <motion.g
              key={x}
              style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}
              animate={reduced ? undefined : { scaleY: [1, 1, 0.1, 1] }}
              transition={{ repeat: Infinity, duration: 3.2 + bin.id.length * 0.3, times: [0, 0.92, 0.96, 1], delay: i * 0.02 }}
            >
              <circle cx={x} cy={39} r={7} fill="#fff" stroke={INK} strokeWidth={2} />
              <motion.circle cx={x} cy={39} r={3.5} fill={INK} animate={{ y: hungry ? -2.5 : 0.5 }} transition={{ type: "spring", stiffness: 300, damping: 18 }} />
            </motion.g>
          ))}
      <circle cx={50} cy={68} r={16} fill="#fff" opacity={0.9} />
      <text x={50} y={75} textAnchor="middle" fontSize={19}>
        {bin.emoji}
      </text>
    </motion.svg>
  );
}

/** Something in the park that sways on its own: trees, flowers. */
function Sway({ className, style, deg = 3, duration = 3, delay = 0, reduced, children }: { className: string; style?: React.CSSProperties; deg?: number; duration?: number; delay?: number; reduced: boolean; children: React.ReactNode }) {
  return (
    <motion.span className={className} style={{ ...style, transformOrigin: "50% 100%" }} animate={reduced ? undefined : { rotate: [-deg, deg, -deg] }} transition={{ repeat: Infinity, duration, delay, ease: "easeInOut" }} aria-hidden>
      {children}
    </motion.span>
  );
}

export default function CleanUp() {
  const reduced = useAppReducedMotion();
  const [level, setLevel] = useState(0);
  const [pieces, setPieces] = useState<Piece[]>(() => makeLitter(0));
  const [total, setTotal] = useState(pieces.length);
  const [picked, setPicked] = useState<string | null>(null);
  const [flying, setFlying] = useState<{ key: string; bin: BinId; emoji: string } | null>(null);
  const [wobble, setWobble] = useState<Record<string, number>>({});
  const [clean, setClean] = useState(false);
  /** Gulps per bin, so each bin squashes and sparkles every time something goes in */
  const [gulps, setGulps] = useState<Record<string, number>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const bins = binsFor(level);
  const cleared = total - pieces.length;

  useEffect(() => {
    const t = setTimeout(() => audioManager.speak("Oh no, the park is messy! Tap some rubbish, then tap the right bin."), 500);
    return () => clearTimeout(t);
  }, []);

  const pick = (key: string) => {
    if (clean) return;
    const p = pieces.find((x) => x.key === key)!;
    setPicked(key);
    audioManager.playPop(1);
    audioManager.speak(`A ${litterById(p.litter).name}! Which bin?`);
  };

  const drop = (bin: Bin) => {
    if (clean) return;
    if (!picked) {
      audioManager.speak(`The ${bin.name} bin. ${bin.becomes}`);
      return;
    }
    const p = pieces.find((x) => x.key === picked)!;
    const l = litterById(p.litter);
    if (!goesIn(p.litter, bin.id)) {
      setWobble((w) => ({ ...w, [bin.id]: (w[bin.id] ?? 0) + 1 }));
      audioManager.play("failure");
      const right = binById(l.bin);
      audioManager.speak(`Hmm, a ${l.name} isn't ${bin.name}. It goes in the ${right.name} bin!`);
      return;
    }
    const left = pieces.filter((x) => x.key !== picked);
    setFlying({ key: p.key, bin: bin.id, emoji: l.emoji });
    setGulps((g) => ({ ...g, [bin.id]: (g[bin.id] ?? 0) + 1 }));
    setPieces(left);
    setPicked(null);
    audioManager.play("success");
    audioManager.speak(bin.becomes);
    timers.current.push(setTimeout(() => setFlying(null), 700));
    if (left.length) return;
    setClean(true);
    timers.current.push(
      setTimeout(() => {
        audioManager.speak("The park is all clean! The flowers are happy!");
      }, 900),
    );
    void finishActivity(MODULE_ID, { score: level + 1 });
    timers.current.push(
      setTimeout(() => {
        const n = level + 1;
        const fresh = makeLitter(n);
        setLevel(n);
        setPieces(fresh);
        setTotal(fresh.length);
        setClean(false);
        audioManager.speak("Uh oh, more rubbish! Let's clean up again.");
      }, 5200),
    );
  };

  return (
    <LayoutGroup>
      <div className="flex flex-1 flex-col items-center gap-4">
        <div className="relative h-[min(52dvh,26rem)] w-full max-w-3xl overflow-hidden rounded-3xl shadow-inner" style={{ background: "linear-gradient(#8fd3ff 0%, #d8f1ff 38%, #8bdc7a 38%, #6cc66c 100%)" }}>
          {!reduced &&
            [0, 1].map((i) => (
              <motion.span key={i} className="absolute text-5xl opacity-90" style={{ top: `${4 + i * 9}%` }} initial={{ left: i ? "55%" : "15%" }} animate={{ left: i ? ["55%", "110%", "-15%", "55%"] : ["15%", "110%", "-15%", "15%"] }} transition={{ repeat: Infinity, duration: 50 + i * 18, times: i ? [0, 0.44, 0.44, 1] : [0, 0.76, 0.76, 1], ease: "linear" }} aria-hidden>
                ☁️
              </motion.span>
            ))}
          <Sway className="absolute left-[6%] top-[14%] text-6xl" duration={3.4} reduced={reduced}>
            🌳
          </Sway>
          <Sway className="absolute right-[5%] top-[10%] text-7xl" duration={4} delay={0.8} reduced={reduced}>
            🌳
          </Sway>
          <motion.span className="absolute right-[22%] top-[4%] text-5xl" animate={reduced ? undefined : { rotate: 360 }} transition={{ repeat: Infinity, duration: 30, ease: "linear" }} aria-hidden>
            ☀️
          </motion.span>
          {/* Flowers bloom as the park gets cleaner */}
          {FLOWERS.slice(0, Math.round((cleared / Math.max(1, total)) * FLOWERS.length)).map((f, i) => (
            <motion.span key={i} className="absolute text-3xl" style={{ left: `${6 + i * 10.5}%`, bottom: `${4 + (i % 2) * 6}%`, transformOrigin: "50% 100%" }} initial={reduced ? false : { scale: 0, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 12 }} aria-hidden>
              {/* A clean park makes the flowers dance */}
              <Sway className="block" deg={clean ? 14 : 5} duration={clean ? 0.6 : 2.6} delay={i * 0.15} reduced={reduced}>
                {f}
              </Sway>
            </motion.span>
          ))}
          {clean && !reduced && (
            <>
              {["🐦", "🦋", "🐝"].map((b, i) => (
                <motion.span key={b} className="absolute text-4xl" style={{ top: `${15 + i * 12}%` }} initial={{ left: "-10%" }} animate={{ left: "110%", y: [0, -20, 0, -20, 0] }} transition={{ duration: 4, delay: i * 0.4 }} aria-hidden>
                  {b}
                </motion.span>
              ))}
            </>
          )}
          <Burst trigger={clean ? level + 1 : 0} items={["🌸", "⭐", "💚", "✨", "🌼"]} count={16} spread={220} size="text-4xl" />
          <AnimatePresence>
            {pieces.map((p, i) => {
              const l = litterById(p.litter);
              const on = picked === p.key;
              return (
                <motion.button
                  key={p.key}
                  layoutId={p.key}
                  type="button"
                  onClick={() => pick(p.key)}
                  aria-label={l.name}
                  aria-pressed={on}
                  className={`absolute flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-5xl ${on ? "bg-white/70 ring-4 ring-kid-yellow" : ""}`}
                  style={{ left: `${p.x}%`, top: `${36 + p.y * 0.6}%` }}
                  initial={reduced ? false : { scale: 0 }}
                  animate={on ? { scale: 1.2, y: -10, rotate: 0 } : { scale: 1, y: 0, rotate: p.rot }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 16 }}
                  whileTap={reduced ? undefined : { scale: 0.85 }}
                >
                  {/* Rubbish rocks gently so it looks pick-up-able; the picked one wiggles with excitement */}
                  <motion.span
                    className="block"
                    animate={reduced ? undefined : on ? { rotate: [-12, 12, -12], y: [0, -4, 0] } : { rotate: [-4, 4, -4], y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: on ? 0.45 : 2.2 + (i % 3) * 0.4, delay: on ? 0 : i * 0.2, ease: "easeInOut" }}
                  >
                    {l.emoji}
                  </motion.span>
                </motion.button>
              );
            })}
          </AnimatePresence>
          <span className="absolute left-3 top-3 rounded-full bg-white/85 px-3 py-1 text-lg font-extrabold text-ink" aria-live="polite">
            🧹 {cleared} / {total}
          </span>
        </div>

        <div className="flex flex-wrap justify-center gap-2 sm:gap-4" aria-label="Bins">
          {bins.map((b) => (
            <ShakeOnWrong key={b.id} trigger={wobble[b.id] ?? 0}>
              <motion.button
                type="button"
                onClick={() => drop(b)}
                aria-label={`${b.name} bin`}
                className="relative flex flex-col items-center rounded-3xl px-1 pb-1 active:scale-95"
                animate={picked && !reduced ? { y: [0, -6, 0] } : { y: 0 }}
                transition={{ repeat: picked ? Infinity : 0, duration: 0.9 }}
              >
                <BinArt bin={b} open={flying?.bin === b.id} hungry={!!picked} gulp={gulps[b.id] ?? 0} reduced={reduced} />
                <Burst trigger={gulps[b.id] ?? 0} items={["✨", "⭐", b.emoji]} count={7} spread={70} className="left-1/2 top-6" size="text-2xl" />
                <span className="text-lg font-extrabold capitalize">{b.name}</span>
                {flying?.bin === b.id && (
                  <motion.span layoutId={flying.key} className="absolute left-1/2 top-0 -translate-x-1/2 text-4xl" animate={{ opacity: 0, scale: 0.4, y: 30, rotate: 360 }} transition={{ opacity: { delay: 0.35 }, y: { delay: 0.3 }, rotate: { duration: 0.5 } }} aria-hidden>
                    {flying.emoji}
                  </motion.span>
                )}
              </motion.button>
            </ShakeOnWrong>
          ))}
        </div>
      </div>
    </LayoutGroup>
  );
}
