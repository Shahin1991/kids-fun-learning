"use client";

import { motion } from "framer-motion";
import { SPRING, VIEW, pin, useLoop, type SceneProps } from "./types";

const FLOW = "M122,140 L226,226";
const HOUSES = [316, 346, 376];

/** A lake behind a dam, a pipe down to a turbine and generator, and wires to a little town. */
export function Hydel({ step }: SceneProps) {
  const loop = useLoop();
  const lit = (n: number) => (step === n ? 1 : 0.5);
  const flowing = step >= 1;
  const spinning = step >= 2;
  const powered = step >= 3;

  return (
    <svg viewBox={VIEW} className="h-full w-full" role="img" aria-label="How a dam makes electricity">
      <rect width="400" height="300" fill="#bfe6ff" />
      {/* mountain, ground, river */}
      <path d="M0,300 L0,64 Q60,34 112,70 L150,262 L150,300 Z" fill="#8fa39a" />
      <rect y="262" width="400" height="38" fill="#6bcb77" />
      <rect x="150" y="278" width="250" height="22" fill="#4d96ff" />
      <motion.path d="M150,284 q12,-7 24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0" stroke="#fff" strokeWidth="3" fill="none" animate={{ x: flowing ? [0, -24] : 0 }} transition={flowing ? loop({ duration: 1.2, ease: "linear" }) : { duration: 0.2 }} />

      {/* rain and lake */}
      <motion.g animate={{ opacity: lit(0) + 0.2 }}>
        <g fill="#b9c6d6">
          <ellipse cx="50" cy="24" rx="40" ry="14" />
          <ellipse cx="82" cy="30" rx="30" ry="12" />
        </g>
        {step === 0 &&
          Array.from({ length: 6 }, (_, i) => (
            <motion.ellipse key={i} cx={24 + i * 16} rx="2.5" ry="6" fill="#4d96ff" initial={{ y: 40, opacity: 0 }} animate={{ y: 76, opacity: [0, 1, 0] }} transition={loop({ duration: 0.9, delay: (i % 3) * 0.25, ease: "linear" })} />
          ))}
      </motion.g>
      <motion.rect x="0" y="70" width="108" height="70" fill="#4d96ff" initial={false} animate={{ scaleY: step === 0 ? [0.55, 1] : step === 1 ? 0.95 : 0.9 }} transition={step === 0 ? loop({ duration: 4, repeatType: "reverse" }) : SPRING} style={pin(0, 140)} />
      <path d="M0,76 q9,-6 18,0 t18,0 t18,0 t18,0 t18,0 t18,0" stroke="#fff" strokeWidth="2.5" fill="none" opacity="0.8" />

      {/* dam wall and gate */}
      <rect x="106" y="66" width="18" height="98" rx="3" fill="#9aa5b5" stroke="#6d7888" strokeWidth="2" />
      <motion.rect x="108" y="128" width="14" height="26" rx="2" fill="#ff9f43" initial={false} animate={{ y: step >= 1 ? -28 : 0 }} transition={SPRING} />

      {/* pipe */}
      <motion.g animate={{ opacity: lit(1) }}>
        <path d={FLOW} stroke="#6d7888" strokeWidth="16" strokeLinecap="round" />
        <path d={FLOW} stroke="#a9b5c6" strokeWidth="11" strokeLinecap="round" />
        {flowing && <motion.path d={FLOW} stroke="#4d96ff" strokeWidth="7" strokeLinecap="round" strokeDasharray="10 12" animate={{ strokeDashoffset: [0, -44] }} transition={loop({ duration: 0.7, ease: "linear" })} />}
      </motion.g>

      {/* power house */}
      <rect x="188" y="226" width="110" height="46" fill="#e8edf5" stroke="#6d7888" strokeWidth="3" />
      <path d="M180,226 L243,196 L306,226 Z" fill="#ff6b6b" stroke="#d6264a" strokeWidth="3" />
      {/* turbine */}
      <motion.g animate={{ opacity: lit(2) }}>
        <circle cx="222" cy="250" r="22" fill="#fff" stroke="#6d7888" strokeWidth="3" />
        <motion.g animate={{ rotate: spinning ? 360 : 0 }} transition={spinning ? loop({ duration: 0.8, ease: "linear" }) : SPRING} style={pin(222, 250)}>
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <path key={a} d="M222,250 L216,232 L228,232 Z" fill="#4d96ff" stroke="#2f6fd0" strokeWidth="1.5" transform={`rotate(${a} 222 250)`} />
          ))}
          <circle cx="222" cy="250" r="4" fill="#3b2f4a" />
        </motion.g>
      </motion.g>
      {/* shaft and generator */}
      <line x1="244" y1="250" x2="262" y2="250" stroke="#6d7888" strokeWidth="5" />
      <motion.g animate={{ opacity: lit(3) }}>
        <rect x="262" y="234" width="30" height="32" rx="5" fill="#ffd43b" stroke="#c99a00" strokeWidth="3" />
        <motion.text x="277" y="257" textAnchor="middle" fontSize="20" animate={{ scale: powered ? [1, 1.4, 1] : 1 }} transition={powered ? loop({ duration: 0.8 }) : { duration: 0.2 }} style={pin(277, 250)}>⚡</motion.text>
      </motion.g>

      {/* wires and town */}
      <motion.g animate={{ opacity: lit(4) }}>
        <path d="M292,238 Q310,214 338,224 M292,238 Q312,226 376,226" stroke="#3b2f4a" strokeWidth="2.5" fill="none" />
        {powered && [0, 1, 2].map((i) => (
          <motion.circle key={i} r="3.5" fill="#ffd43b" initial={{ x: 292, y: 238, opacity: 0 }} animate={{ x: [292, 322, 346], y: [238, 218, 224], opacity: [0, 1, 0] }} transition={loop({ duration: 1.6, delay: i * 0.5, ease: "linear" })} />
        ))}
        {HOUSES.map((x, i) => (
          <g key={x}>
            <rect x={x - 11} y="238" width="22" height="24" fill="#fff" stroke="#6d7888" strokeWidth="2" />
            <path d={`M${x - 14},238 L${x},224 L${x + 14},238 Z`} fill="#ff9f43" />
            <motion.rect x={x - 5} y="244" width="10" height="10" initial={false} animate={{ fill: step >= 4 ? "#ffe14d" : "#4a5468" }} transition={{ delay: step >= 4 ? i * 0.3 : 0, duration: 0.3 }} />
          </g>
        ))}
      </motion.g>
    </svg>
  );
}
