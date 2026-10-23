"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { SPRING, VIEW, pin, useLoop, type SceneProps } from "./types";

const CX = 200;
const CY = 150;

interface Planet {
  name: string;
  r: number;
  size: number;
  color: string;
  /** Seconds for one trip round the Sun (kept friendly, not to scale). */
  secs: number;
  start: number;
  rings?: boolean;
  /** Which steps light this planet up. */
  lit: number[];
}

const PLANETS: Planet[] = [
  { name: "Mercury", r: 30, size: 3.5, color: "#b5a99a", secs: 6, start: 20, lit: [1, 4] },
  { name: "Venus", r: 42, size: 5, color: "#f0c987", secs: 9, start: 150, lit: [1, 4] },
  { name: "Earth", r: 55, size: 5.5, color: "#4d96ff", secs: 13, start: 260, lit: [1, 3, 4] },
  { name: "Mars", r: 68, size: 4.5, color: "#e8683c", secs: 18, start: 80, lit: [1, 4] },
  { name: "Jupiter", r: 88, size: 11, color: "#d9a066", secs: 30, start: 200, lit: [2, 4] },
  { name: "Saturn", r: 108, size: 9, color: "#e6cf8a", secs: 42, start: 310, rings: true, lit: [2, 4] },
  { name: "Uranus", r: 124, size: 7, color: "#8fe3e8", secs: 54, start: 120, lit: [2, 4] },
  { name: "Neptune", r: 140, size: 7, color: "#4a6cf0", secs: 66, start: 40, lit: [2, 4] },
];

function PlanetDot({ p, step, onTap }: { p: Planet; step: number; onTap: (p: Planet) => void }) {
  const loop = useLoop();
  const moving = step !== 4;
  const lit = step === 0 ? 0.35 : p.lit.includes(step) ? 1 : 0.22;
  const orbit = moving ? { rotate: [p.start, p.start + 360] } : { rotate: p.start };
  const counter = moving ? { rotate: [-p.start, -p.start - 360] } : { rotate: -p.start };
  const t = moving ? loop({ duration: p.secs, ease: "linear" }) : SPRING;
  return (
    <motion.g animate={orbit} transition={t} style={pin(CX, CY)}>
      <motion.g animate={counter} transition={t} style={pin(CX - p.r, CY)}>
        <motion.g animate={{ opacity: lit, scale: step === 3 && p.name === "Earth" ? 1.8 : 1 }} transition={SPRING} style={pin(CX - p.r, CY)}>
          {p.rings && <ellipse cx={CX - p.r} cy={CY} rx={p.size * 1.9} ry={p.size * 0.6} fill="none" stroke="#cdb77a" strokeWidth="2" transform={`rotate(-20 ${CX - p.r} ${CY})`} />}
          <circle cx={CX - p.r} cy={CY} r={p.size} fill={p.color} />
          {/* big invisible target so little fingers can hit it */}
          <circle cx={CX - p.r} cy={CY} r={Math.max(14, p.size + 6)} fill="transparent" className="cursor-pointer" onClick={() => onTap(p)} role="button" aria-label={p.name} />
        </motion.g>
      </motion.g>
      {step === 3 && p.name === "Earth" && (
        <motion.g animate={{ rotate: 360 }} transition={loop({ duration: 3, ease: "linear" })} style={pin(CX - p.r, CY)}>
          <circle cx={CX - p.r + 18} cy={CY} r="2.5" fill="#f4f1de" />
        </motion.g>
      )}
    </motion.g>
  );
}

export function SolarSystem({ step }: SceneProps) {
  const loop = useLoop();
  const [picked, setPicked] = useState<string | null>(null);
  const tap = (p: Planet) => {
    audioManager.speak(p.name);
    setPicked(p.name);
  };
  return (
    <svg viewBox={VIEW} className="h-full w-full" role="img" aria-label="The Sun and the eight planets going around it">
      <rect width="400" height="300" fill="#0d0b2e" />
      {Array.from({ length: 30 }, (_, i) => (
        <motion.circle key={i} cx={(i * 131) % 400} cy={(i * 67) % 300} r={0.8 + (i % 3) * 0.5} fill="#fff" animate={{ opacity: [0.3, 1, 0.3] }} transition={loop({ duration: 2 + (i % 4), delay: (i % 6) * 0.3 })} />
      ))}
      {PLANETS.map((p) => (
        <circle key={p.name} cx={CX} cy={CY} r={p.r} fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1" />
      ))}
      <motion.circle cx={CX} cy={CY} r="26" fill="#ffd43b" opacity="0.25" animate={{ scale: step === 0 ? [1, 1.5, 1] : [1, 1.15, 1] }} transition={loop({ duration: 2.4 })} style={pin(CX, CY)} />
      <motion.circle cx={CX} cy={CY} r="16" fill="#ffb703" animate={{ scale: step === 0 ? 1.4 : 1 }} transition={SPRING} style={pin(CX, CY)} />
      {PLANETS.map((p) => (
        <PlanetDot key={p.name} p={p} step={step} onTap={tap} />
      ))}
      {step === 4 && (
        <motion.text key={picked ?? "none"} x="200" y="286" textAnchor="middle" fontSize="22" fontWeight="800" fill="#ffffff" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {picked ?? "Tap a planet 👆"}
        </motion.text>
      )}
    </svg>
  );
}
