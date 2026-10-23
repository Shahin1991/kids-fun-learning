"use client";

import { motion } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { audioManager } from "@/lib/audio/AudioManager";
import { MAX_DROPS, POTS, emptyCounts, explain, mixColour, nameOf, total, type Counts, type Pot } from "@/lib/colour-mixing/mix";

const GLASS_TOP = 60;
const GLASS_BOTTOM = 290;
const GLASS = "M110,60 V250 Q110,290 150,290 H250 Q290,290 290,250 V60";
const potColor = (id: Pot) => POTS.find((p) => p.id === id)!.color;

export interface Mixer {
  counts: Counts;
  drops: { id: number; pot: Pot }[];
  swirl: number;
  /** Add a drop; returns the new counts, or null when the glass is already full. */
  pour: (pot: Pot) => Counts | null;
  clear: () => void;
  stir: () => void;
  landed: (id: number) => void;
}

/** The glass of paint: which drops are in it, the falling drops and the stir animation. */
export function useMixer(): Mixer {
  const [counts, setCounts] = useState<Counts>(emptyCounts);
  const [drops, setDrops] = useState<Mixer["drops"]>([]);
  const [swirl, setSwirl] = useState(0);
  const nextId = useRef(0);

  const pour = useCallback(
    (pot: Pot) => {
      if (total(counts) >= MAX_DROPS) {
        audioManager.speak("The glass is full. Pour it out to mix again!");
        return null;
      }
      const next = { ...counts, [pot]: counts[pot] + 1 };
      setCounts(next);
      setDrops((d) => [...d, { id: ++nextId.current, pot }]);
      audioManager.playNote(Math.min(9, total(next)));
      setTimeout(() => setSwirl((s) => s + 1), 650);
      return next;
    },
    [counts],
  );
  const clear = useCallback(() => {
    setCounts(emptyCounts());
    setDrops([]);
  }, []);
  const stir = useCallback(() => {
    audioManager.playPop(2);
    setSwirl((s) => s + 1);
  }, []);
  const landed = useCallback((id: number) => setDrops((d) => d.filter((x) => x.id !== id)), []);
  return { counts, drops, swirl, pour, clear, stir, landed };
}

/** Four paint pots over a glass. Tap a pot to drop paint in; tap the glass to stir. `hint` makes those pots pulse. */
export function MixerStage({ mixer, onPour, hint = [], disabled = false }: { mixer: Mixer; onPour: (pot: Pot) => void; hint?: Pot[]; disabled?: boolean }) {
  const reduced = useAppReducedMotion();
  const n = total(mixer.counts);
  const colour = mixColour(mixer.counts) ?? "#ffffff";
  const level = n === 0 ? 0 : Math.max(0.1, n / MAX_DROPS);
  const surface = GLASS_BOTTOM - level * (GLASS_BOTTOM - GLASS_TOP);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-1">
      <div className="grid w-full grid-cols-4 gap-2">
        {POTS.map((p) => {
          const pulse = hint.includes(p.id) && !reduced;
          return (
            <motion.button
              key={p.id}
              type="button"
              disabled={disabled}
              onClick={() => onPour(p.id)}
              whileTap={{ rotate: -14, scale: 0.94 }}
              aria-label={`${p.label} paint, ${mixer.counts[p.id]} drops in the glass`}
              className={`relative flex min-h-24 flex-col items-center justify-center rounded-3xl border-4 border-white/70 text-xl font-extrabold shadow-md ${p.id === "yellow" || p.id === "white" ? "text-ink" : "text-white"} ${pulse ? "animate-pulse ring-8 ring-kid-yellow" : ""}`}
              style={{ background: p.color }}
            >
              <span className="text-3xl" aria-hidden>🎨</span>
              {p.label}
              {mixer.counts[p.id] > 0 && (
                <span className="absolute -right-1 -top-2 flex size-8 items-center justify-center rounded-full bg-ink text-base text-white">{mixer.counts[p.id]}</span>
              )}
            </motion.button>
          );
        })}
      </div>

      <svg viewBox="0 0 400 320" className="h-auto w-full" role="img" aria-label={`A glass with ${n} drops of paint`}>
        <defs>
          <clipPath id="cm-glass">
            <path d={`${GLASS} Z`} />
          </clipPath>
        </defs>
        <g clipPath="url(#cm-glass)">
          <motion.rect x="100" y={GLASS_TOP} width="200" height={GLASS_BOTTOM - GLASS_TOP} initial={false} animate={{ scaleY: level, fill: colour }} transition={{ type: "spring", stiffness: 120, damping: 16 }} style={{ transformBox: "view-box", originX: "0px", originY: `${GLASS_BOTTOM}px` }} />
          {mixer.swirl > 0 && !reduced && n > 0 && (
            <motion.g key={mixer.swirl} initial={{ rotate: 0, opacity: 0.8 }} animate={{ rotate: 360, opacity: 0 }} transition={{ duration: 1.3, ease: "easeOut" }} style={{ transformBox: "view-box", originX: "200px", originY: `${(surface + GLASS_BOTTOM) / 2}px` }}>
              <path d={`M140,${(surface + GLASS_BOTTOM) / 2} Q200,${surface + 6} 260,${(surface + GLASS_BOTTOM) / 2}`} stroke="#fff" strokeWidth="7" strokeLinecap="round" fill="none" />
              <path d={`M260,${(surface + GLASS_BOTTOM) / 2 + 12} Q200,${GLASS_BOTTOM - 8} 140,${(surface + GLASS_BOTTOM) / 2 + 12}`} stroke="#fff" strokeWidth="7" strokeLinecap="round" fill="none" />
            </motion.g>
          )}
        </g>
        {Array.from({ length: MAX_DROPS }, (_, k) => {
          const y = GLASS_BOTTOM - ((k + 1) / MAX_DROPS) * (GLASS_BOTTOM - GLASS_TOP);
          return <line key={k} x1="268" x2="290" y1={y} y2={y} stroke="#6f819a" strokeWidth={k === MAX_DROPS - 1 ? 4 : 2.5} strokeLinecap="round" opacity="0.7" />;
        })}
        <path d={`${GLASS} Z`} fill="#ffffff" fillOpacity="0.14" />
        <path d={GLASS} fill="none" stroke="#9fb3c8" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M126,80 V232" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity="0.55" />

        {mixer.drops.map((d) => {
          const px = (POTS.findIndex((p) => p.id === d.pot) + 0.5) * 100;
          return (
            <motion.circle key={d.id} r="11" fill={potColor(d.pot)} stroke="#3b2f4a" strokeOpacity={d.pot === "white" ? 0.4 : 0.15} strokeWidth="2" initial={{ x: px, y: 0 }} animate={{ x: [px, 200, 200], y: [0, 30, surface] }} transition={{ duration: reduced ? 0.01 : 0.6, times: [0, 0.35, 1], ease: "easeIn" }} onAnimationComplete={() => mixer.landed(d.id)} />
          );
        })}
        <rect x="100" y="40" width="200" height="260" fill="transparent" className="cursor-pointer" onClick={mixer.stir} role="button" aria-label="Stir the paint" />
      </svg>
    </div>
  );
}

/** Colour swatch and name of what is in the glass; tap to hear it again. */
export function NameChip({ counts }: { counts: Counts }) {
  const name = nameOf(counts);
  const hex = mixColour(counts);
  if (!name || !hex) return <p className="min-h-16 text-center text-xl font-bold">Tap the paint pots to pour! 👆</p>;
  return (
    <button type="button" onClick={() => audioManager.speak(explain(counts))} aria-label={`${name.name}. Tap to hear.`} className="flex min-h-16 items-center gap-3 rounded-3xl bg-surface px-4 py-2 text-left shadow-md active:scale-95">
      <span className="size-12 shrink-0 rounded-full border-4 border-white shadow" style={{ background: hex }} aria-hidden />
      <span className="flex flex-col">
        <span className="text-2xl font-extrabold">{name.name}</span>
        <span className="text-base opacity-80">{explain(counts)}</span>
      </span>
      <span className="text-2xl" aria-hidden>🔊</span>
    </button>
  );
}
