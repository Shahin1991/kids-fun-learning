"use client";

import { motion } from "framer-motion";
import { SPRING, VIEW, pin, useLoop, type SceneProps } from "./types";

const LABELS = ["Plants make food", "Sunlight ☀️", "Water 💧", "Carbon dioxide from the air", "Sugar for the plant, oxygen for us"];

/** A plant with four things moving through it; each step lights up one of them. */
export function Photosynthesis({ step }: SceneProps) {
  const loop = useLoop();
  const lit = (n: number) => (step === 0 || step === n ? 1 : 0.15);
  return (
    <svg viewBox={VIEW} className="h-full w-full" role="img" aria-label="How a plant makes food from sunlight, water and air">
      <rect width="400" height="300" fill="#d8f3ff" />
      <rect y="236" width="400" height="64" fill="#8b5a3c" />
      <rect y="232" width="400" height="8" fill="#6bcb77" />

      {/* sun */}
      <motion.g animate={{ rotate: 360 }} transition={loop({ duration: 30, ease: "linear" })} style={pin(52, 62)}>
        {Array.from({ length: 10 }, (_, i) => (
          <line key={i} x1="52" y1="24" x2="52" y2="34" stroke="#ffd43b" strokeWidth="5" strokeLinecap="round" transform={`rotate(${i * 36} 52 62)`} />
        ))}
      </motion.g>
      <circle cx="52" cy="62" r="26" fill="#ffd43b" />

      {/* roots, stem and leaves */}
      <g stroke="#e8d3b0" strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M200,240 Q190,262 168,278 M200,240 Q212,262 232,282 M200,240 V290" />
      </g>
      <rect x="196" y="130" width="8" height="112" rx="4" fill="#4caf50" />
      <motion.g animate={{ scale: step === 1 || step === 4 ? [1, 1.04, 1] : 1 }} transition={loop({ duration: 1.6 })} style={pin(200, 128)}>
        <ellipse cx="148" cy="128" rx="62" ry="24" fill="#5cc468" stroke="#3f9c4a" strokeWidth="3" transform="rotate(-18 148 128)" />
        <ellipse cx="252" cy="128" rx="62" ry="24" fill="#5cc468" stroke="#3f9c4a" strokeWidth="3" transform="rotate(18 252 128)" />
        <path d="M100,142 L196,128 M300,142 L204,128" stroke="#3f9c4a" strokeWidth="2" />
      </motion.g>

      {/* sunlight into the leaf */}
      <g opacity={lit(1)}>
        {[0, 1, 2].map((i) => (
          <motion.line key={i} x1={86 + i * 6} y1={74 + i * 14} x2={116 + i * 6} y2={106 + i * 14} stroke="#ffb703" strokeWidth="6" strokeLinecap="round" strokeDasharray="10 12" animate={{ strokeDashoffset: [0, -44] }} transition={loop({ duration: 1.1, ease: "linear" })} />
        ))}
      </g>

      {/* water up the stem */}
      <g opacity={lit(2)}>
        {[0, 1, 2, 3].map((i) => (
          <motion.circle key={i} cx={200} r="5" fill="#4d96ff" initial={{ y: 280 }} animate={{ y: [280, 140], opacity: [0, 1, 1, 0] }} transition={loop({ duration: 2.4, delay: i * 0.6, ease: "linear" })} />
        ))}
      </g>

      {/* carbon dioxide drifting in, oxygen drifting out */}
      <g opacity={lit(3)}>
        {[0, 1].map((i) => (
          <motion.g key={i} initial={{ x: 0, y: 0, opacity: 0 }} animate={{ x: [0, -70], y: [0, 36], opacity: [0, 1, 1, 0] }} transition={loop({ duration: 2.8, delay: i * 1.4, ease: "linear" })}>
            <circle cx="340" cy={80 + i * 18} r="14" fill="#8a94a6" />
            <text x="340" y={84 + i * 18} textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff">CO₂</text>
          </motion.g>
        ))}
      </g>
      <g opacity={lit(4)}>
        {[0, 1].map((i) => (
          <motion.g key={i} initial={{ x: 0, y: 0, opacity: 0 }} animate={{ x: [0, 70], y: [0, 40], opacity: [0, 1, 1, 0] }} transition={loop({ duration: 2.8, delay: i * 1.4, ease: "linear" })}>
            <circle cx="276" cy={104 + i * 14} r="14" fill="#7cc6ff" />
            <text x="276" y={108 + i * 14} textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff">O₂</text>
          </motion.g>
        ))}
        {[0, 1, 2].map((i) => (
          <motion.text key={i} x="200" textAnchor="middle" fontSize="16" initial={{ y: 150 }} animate={{ y: [150, 226], opacity: [0, 1, 0] }} transition={loop({ duration: 2.4, delay: i * 0.8, ease: "linear" })}>🍬</motion.text>
        ))}
      </g>
      <motion.text x="346" y="224" textAnchor="middle" fontSize="60" animate={{ scale: step === 4 ? [1, 1.12, 1] : 1 }} transition={loop({ duration: 1.4 })} style={pin(346, 200)}>{step === 4 ? "😄" : "🙂"}</motion.text>

      <motion.text key={step} x="200" y="24" textAnchor="middle" fontSize="19" fontWeight="800" fill="#3b2f4a" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 24 }} transition={SPRING}>{LABELS[step]}</motion.text>
    </svg>
  );
}
