"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { audioManager } from "@/lib/audio/AudioManager";
import { VIEW, pin, useLoop, type SceneProps } from "./types";

const TANK = { x: 70, w: 260, top: 130, water: 160, bottom: 270 };

interface Thing {
  id: string;
  e: string;
  name: string;
  floats: boolean;
}
const THINGS: Thing[] = [
  { id: "wood", e: "🪵", name: "wood", floats: true },
  { id: "stone", e: "🪨", name: "stone", floats: false },
  { id: "apple", e: "🍎", name: "apple", floats: true },
  { id: "coin", e: "🪙", name: "coin", floats: false },
  { id: "ball", e: "🏐", name: "ball", floats: true },
  { id: "bolt", e: "🔩", name: "bolt", floats: false },
];

/** A thing falling into the tank: floaters bob on the top, sinkers wobble down to the bottom. */
function Drop({ t, x, delay = 0, repeat = false }: { t: Thing; x: number; delay?: number; repeat?: boolean }) {
  const reduced = useAppReducedMotion();
  const rest = t.floats ? TANK.water - 6 : TANK.bottom - 18;
  const y = t.floats ? [50, TANK.water - 6, TANK.water + 6, TANK.water - 10, TANK.water - 2, TANK.water - 8, TANK.water - 6] : [50, TANK.water - 6, rest, rest];
  const times = t.floats ? [0, 0.25, 0.38, 0.52, 0.65, 0.8, 1] : [0, 0.25, 0.8, 1];
  return (
    <motion.text
      textAnchor="middle" dominantBaseline="central" fontSize="34"
      initial={{ x, y: 50 }}
      animate={{ x: t.floats ? x : [x, x + 8, x - 8, x + 4, x, x], y, opacity: repeat && !reduced ? (t.floats ? [0, 1, 1, 1, 1, 1, 0] : [0, 1, 1, 0]) : 1 }}
      transition={reduced ? { duration: 0 } : { duration: t.floats ? 3 : 2.6, times, delay, ease: "easeInOut", ...(repeat ? { repeat: Infinity, repeatDelay: 0.8 } : {}) }}
    >
      {t.e}
    </motion.text>
  );
}

export function Floating({ step }: SceneProps) {
  const loop = useLoop();
  const [drops, setDrops] = useState<Record<string, number>>({});
  const [last, setLast] = useState<Thing | null>(null);

  const tap = (t: Thing) => {
    audioManager.playPop(t.floats ? 3 : 0);
    audioManager.speak(`${t.name} ${t.floats ? "floats" : "sinks"}`);
    setDrops((d) => ({ ...d, [t.id]: (d[t.id] ?? 0) + 1 }));
    setLast(t);
  };

  const demo = step === 0 ? THINGS.filter((t) => t.floats) : step === 1 ? THINGS.filter((t) => !t.floats) : [];

  return (
    <svg viewBox={VIEW} className="h-full w-full" role="img" aria-label="A tank of water for floating and sinking">
      <rect width="400" height="300" fill="#fff5e6" />
      {/* water */}
      <rect x={TANK.x} y={TANK.water} width={TANK.w} height={TANK.bottom - TANK.water} fill="#4d96ff" fillOpacity="0.55" />
      <motion.path d={`M${TANK.x},${TANK.water} q16,-8 32,0 t32,0 t32,0 t32,0 t32,0 t32,0 t32,0 t32,0 t32,0`} stroke="#fff" strokeWidth="3" fill="none" animate={{ x: [0, -32] }} transition={loop({ duration: 2, ease: "linear" })} />
      <path d={`M${TANK.x},${TANK.top} V${TANK.bottom} H${TANK.x + TANK.w} V${TANK.top}`} fill="none" stroke="#9fb3c8" strokeWidth="6" strokeLinejoin="round" />

      {demo.map((t, i) => <Drop key={t.id} t={t} x={140 + i * 60} delay={i * 0.6} repeat />)}

      {step === 2 && (
        <>
          {THINGS.map((t, i) => {
            const x = 100 + i * 40;
            return (
              <g key={t.id}>
                <rect x={x - 20} y="28" width="40" height="44" rx="10" fill="#fff" stroke="#e5d9bd" strokeWidth="2" />
                <text x={x} y="50" textAnchor="middle" dominantBaseline="central" fontSize="28">{t.e}</text>
                <rect x={x - 22} y="24" width="44" height="52" fill="transparent" className="cursor-pointer" onClick={() => tap(t)} role="button" aria-label={`Drop the ${t.name}`} />
              </g>
            );
          })}
          {THINGS.filter((t) => drops[t.id]).map((t) => (
            <Drop key={`${t.id}-${drops[t.id]}`} t={t} x={100 + THINGS.indexOf(t) * 40} />
          ))}
          <motion.text key={last?.id ?? "hint"} x="200" y="292" textAnchor="middle" fontSize="24" fontWeight="800" fill="#3b2f4a" initial={{ scale: 0.7 }} animate={{ scale: 1 }} style={pin(200, 284)}>
            {last ? `${last.name} ${last.floats ? "floats ⬆️" : "sinks ⬇️"}` : "Tap a thing to drop it 👆"}
          </motion.text>
        </>
      )}

      {step === 3 && (
        <>
          {/* the same lump of clay, twice */}
          <motion.circle r="17" cx="0" cy="0" fill="#c68642" stroke="#8a5a26" strokeWidth="3" initial={{ x: 150, y: 50 }} animate={{ x: 150, y: [50, TANK.water, TANK.bottom - 20, TANK.bottom - 20], opacity: [0, 1, 1, 0] }} transition={loop({ duration: 3.4, times: [0, 0.25, 0.8, 1], repeatDelay: 0.8 })} />
          <motion.g initial={{ x: 250, y: 50 }} animate={{ x: 250, y: [50, TANK.water - 4, TANK.water + 4, TANK.water - 6, TANK.water - 4], opacity: [0, 1, 1, 1, 1] }} transition={loop({ duration: 3.4, times: [0, 0.25, 0.4, 0.6, 1], repeatDelay: 0.8 })}>
            <path d="M-34,0 H34 L22,16 H-22 Z" fill="#c68642" stroke="#8a5a26" strokeWidth="3" strokeLinejoin="round" />
            <text y="-14" textAnchor="middle" dominantBaseline="central" fontSize="26">🧸</text>
          </motion.g>
          <text x="150" y="292" textAnchor="middle" fontSize="20" fontWeight="800" fill="#3b2f4a">ball: sinks ⬇️</text>
          <text x="250" y="292" textAnchor="middle" fontSize="20" fontWeight="800" fill="#3b2f4a">boat: floats ⬆️</text>
        </>
      )}
    </svg>
  );
}
