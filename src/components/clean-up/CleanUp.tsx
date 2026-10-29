"use client";

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { ShakeOnWrong } from "@/components/ShakeOnWrong";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import { binById, binsFor, goesIn, litterById, makeLitter, type Bin, type BinId, type Piece } from "@/lib/clean-up/recycle";

const MODULE_ID = "clean-up";
const FLOWERS = ["🌷", "🌼", "🌸", "🌻", "🌺", "🌷", "🌼", "🌸", "🌻"];

function BinArt({ bin, open }: { bin: Bin; open: boolean }) {
  return (
    <svg viewBox="0 0 100 110" className="h-24 w-24" aria-hidden>
      <motion.g style={{ transformBox: "fill-box", transformOrigin: "0% 100%" }} animate={{ rotate: open ? -55 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 14 }}>
        <rect x={8} y={10} width={84} height={14} rx={6} fill={bin.color} stroke="rgba(0,0,0,0.25)" strokeWidth={3} />
        <rect x={40} y={3} width={20} height={9} rx={4} fill={bin.color} stroke="rgba(0,0,0,0.25)" strokeWidth={3} />
      </motion.g>
      <path d="M14 28 L86 28 L80 106 L20 106 Z" fill={bin.color} stroke="rgba(0,0,0,0.25)" strokeWidth={3} strokeLinejoin="round" />
      {[34, 50, 66].map((x) => (
        <line key={x} x1={x} y1={40} x2={x} y2={96} stroke="rgba(255,255,255,0.35)" strokeWidth={4} strokeLinecap="round" />
      ))}
      <circle cx={50} cy={64} r={18} fill="#fff" opacity={0.9} />
      <text x={50} y={72} textAnchor="middle" fontSize={22}>
        {bin.emoji}
      </text>
    </svg>
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
    setPieces(left);
    setPicked(null);
    audioManager.play("success");
    audioManager.speak(bin.becomes);
    timers.current.push(setTimeout(() => setFlying(null), 700));
    if (left.length) return;
    setClean(true);
    timers.current.push(
      setTimeout(() => {
        audioManager.play("reward");
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
          <span className="absolute left-[6%] top-[14%] text-6xl" aria-hidden>
            🌳
          </span>
          <span className="absolute right-[5%] top-[10%] text-7xl" aria-hidden>
            🌳
          </span>
          <motion.span className="absolute right-[22%] top-[4%] text-5xl" animate={reduced ? undefined : { rotate: 360 }} transition={{ repeat: Infinity, duration: 30, ease: "linear" }} aria-hidden>
            ☀️
          </motion.span>
          {/* Flowers bloom as the park gets cleaner */}
          {FLOWERS.slice(0, Math.round((cleared / Math.max(1, total)) * FLOWERS.length)).map((f, i) => (
            <motion.span key={i} className="absolute text-3xl" style={{ left: `${6 + i * 10.5}%`, bottom: `${4 + (i % 2) * 6}%` }} initial={reduced ? false : { scale: 0, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 12 }} aria-hidden>
              {f}
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
          <AnimatePresence>
            {pieces.map((p) => {
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
                >
                  {l.emoji}
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
                <BinArt bin={b} open={flying?.bin === b.id} />
                <span className="text-lg font-extrabold capitalize">{b.name}</span>
                {flying?.bin === b.id && (
                  <motion.span layoutId={flying.key} className="absolute left-1/2 top-0 -translate-x-1/2 text-4xl" animate={{ opacity: 0, scale: 0.4, y: 30 }} transition={{ opacity: { delay: 0.35 }, y: { delay: 0.3 } }} aria-hidden>
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
