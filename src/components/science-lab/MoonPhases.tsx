"use client";

import { motion } from "framer-motion";
import { litPath } from "@/lib/science-lab/moon";
import { SPRING, VIEW, useLoop, type SceneProps } from "./types";

/** Phase angle for each step. */
const ANGLE = [0, 50, 90, 180, 270];
const CX = 110;
const CY = 150;
const R = 76;
const BIG = { x: 296, y: 150, r: 74 };

/** The moon circles the Earth in the Sun's light; the big moon shows what we see from Earth. */
export function MoonPhases({ step }: SceneProps) {
  const loop = useLoop();
  const a = (ANGLE[step] * Math.PI) / 180;
  // new moon sits between us and the Sun (left); full moon is on the far side (right)
  const mx = CX - R * Math.cos(a);
  const my = CY - R * Math.sin(a);

  return (
    <svg viewBox={VIEW} className="h-full w-full" role="img" aria-label="The moon going around the Earth, and the shape we see">
      <rect width="400" height="300" fill="#141a4a" />
      {Array.from({ length: 22 }, (_, i) => (
        <motion.circle key={i} cx={(i * 83) % 400} cy={(i * 47) % 300} r={1 + (i % 3) * 0.6} fill="#ffffff" animate={{ opacity: [0.3, 1, 0.3] }} transition={loop({ duration: 2 + (i % 4), delay: (i % 5) * 0.4 })} />
      ))}

      {/* sunlight comes from the left */}
      <text x="8" y="40" fontSize="30">☀️</text>
      {[80, 150, 220].map((y, i) => (
        <motion.line key={y} x1="30" x2="60" y1={y} y2={y} stroke="#ffd43b" strokeWidth="4" strokeLinecap="round" strokeDasharray="8 10" animate={{ strokeDashoffset: [0, -36] }} transition={loop({ duration: 1.4, delay: i * 0.2, ease: "linear" })} />
      ))}

      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#6f7bd6" strokeWidth="2" strokeDasharray="6 8" />
      <circle cx={CX} cy={CY} r="26" fill="#4d96ff" />
      <path d="M96,142 q10,-14 22,-4 q4,10 -8,16 q-14,0 -14,-12 Z" fill="#6bcb77" />

      {/* small moon: sunny half always faces the Sun */}
      <motion.g initial={false} animate={{ x: mx, y: my }} transition={SPRING}>
        <circle r="13" fill="#4a4f7a" />
        <path d="M0,-13 A13,13 0 0 0 0,13 Z" fill="#f4f1de" />
      </motion.g>

      {/* what we see */}
      <circle cx={BIG.x} cy={BIG.y} r={BIG.r} fill="#2a2f66" stroke="#4a4f9a" strokeWidth="3" />
      <motion.path key={step} d={litPath(ANGLE[step], BIG.r)} transform={`translate(${BIG.x} ${BIG.y})`} fill="#f4f1de" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />
      <text x={BIG.x} y="262" textAnchor="middle" fontSize="18" fontWeight="800" fill="#cfd6ff">what we see</text>
    </svg>
  );
}
