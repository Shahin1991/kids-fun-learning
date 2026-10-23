"use client";

import { motion } from "framer-motion";
import { SPRING, VIEW, pin, useLoop, type SceneProps } from "./types";

const ROTATION = [0, 0, -90, 90];

/** The Sun on the left lights half of the Earth; a little house rides round with the spin. */
export function DayNight({ step }: SceneProps) {
  const loop = useLoop();
  const spin = step === 1;
  const night = step === 3;
  const day = step === 2;
  return (
    <svg viewBox={VIEW} className="h-full w-full" role="img" aria-label="The Earth spinning in front of the Sun">
      <motion.rect width="400" height="300" initial={false} animate={{ fill: "#1f1b4d" }} />
      {Array.from({ length: 26 }, (_, i) => (
        <motion.circle key={i} cx={(i * 97) % 400} cy={(i * 53) % 300} r={1 + (i % 3) * 0.7} fill="#ffffff" animate={{ opacity: [0.3, 1, 0.3] }} transition={loop({ duration: 2 + (i % 4), delay: (i % 5) * 0.3 })} />
      ))}

      {/* sun and its light */}
      <motion.g animate={{ rotate: 360 }} transition={loop({ duration: 40, ease: "linear" })} style={pin(24, 150)}>
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1="24" y1="82" x2="24" y2="96" stroke="#ffd43b" strokeWidth="6" strokeLinecap="round" transform={`rotate(${i * 30} 24 150)`} />
        ))}
      </motion.g>
      <circle cx="24" cy="150" r="56" fill="#ffd43b" />
      {[110, 150, 190].map((y, i) => (
        <motion.line key={y} x1="90" x2="130" y1={y} y2={y} stroke="#ffd43b" strokeWidth="4" strokeLinecap="round" strokeDasharray="10 12" animate={{ strokeDashoffset: [0, -44] }} transition={loop({ duration: 1.6, delay: i * 0.2, ease: "linear" })} />
      ))}

      {/* earth */}
      <defs>
        <clipPath id="dn-earth"><circle cx="260" cy="150" r="94" /></clipPath>
      </defs>
      <circle cx="260" cy="150" r="94" fill="#4d96ff" />
      <motion.g clipPath="url(#dn-earth)" initial={false} animate={spin ? { rotate: [0, -360] } : { rotate: ROTATION[step] }} transition={spin ? loop({ duration: 9, ease: "linear" }) : SPRING} style={pin(260, 150)}>
        <path d="M200,110 q20,-30 50,-14 q14,16 -4,34 q-30,10 -46,-20 Z M262,170 q30,-16 50,6 q8,30 -22,40 q-30,-6 -28,-46 Z M286,92 q24,-8 36,10 q-14,20 -36,-10 Z" fill="#6bcb77" />
        <text x="260" y="76" textAnchor="middle" fontSize="38">🏠</text>
      </motion.g>
      {/* night side */}
      <path d="M260,56 A94,94 0 0 1 260,244 Z" fill="#0b0a2e" opacity="0.62" />
      <circle cx="260" cy="150" r="94" fill="none" stroke="#9fd0ff" strokeWidth="3" opacity="0.7" />

      <text x="168" y="278" fontSize="22" fontWeight="800" fill="#ffd43b" opacity={day || step === 0 ? 1 : 0.3}>☀️ day</text>
      <text x="270" y="278" fontSize="22" fontWeight="800" fill="#cbb8ff" opacity={night || step === 0 ? 1 : 0.3}>🌙 night</text>
      {(day || night) && (
        <motion.text key={step} x="260" y="40" textAnchor="middle" fontSize="40" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING} style={pin(260, 30)}>{day ? "😄" : "😴"}</motion.text>
      )}
    </svg>
  );
}
