"use client";

import { motion } from "framer-motion";
import { SPRING, VIEW, pin, useLoop, type SceneProps } from "./types";

const GROUND = 226;
const STEM_H = [0, 0, 34, 84, 128, 128];
const FULL = 128;

/** A cross-section of garden soil: seed, roots, stem, flower and fruit grow in turn. */
export function PlantGrowth({ step }: SceneProps) {
  const loop = useLoop();
  const h = STEM_H[step];
  const leaf = step < 2 ? 0 : step === 2 ? 0.55 : 1;
  const rainy = step === 1 || step === 3;

  return (
    <svg viewBox={VIEW} className="h-full w-full" role="img" aria-label="A plant growing from a seed">
      <defs>
        <linearGradient id="pg-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fd3ff" />
          <stop offset="1" stopColor="#e6f7ff" />
        </linearGradient>
      </defs>
      <rect width="400" height={GROUND} fill="url(#pg-sky)" />
      <rect y={GROUND} width="400" height={300 - GROUND} fill="#8b5a3c" />
      <rect y={GROUND} width="400" height="8" fill="#6bcb77" />
      <path d={`M0,${GROUND + 30} Q80,${GROUND + 22} 160,${GROUND + 34} T400,${GROUND + 30}`} stroke="#7a4b30" strokeWidth="3" fill="none" />

      {/* sun */}
      <motion.g animate={{ rotate: 360 }} transition={loop({ duration: 30, ease: "linear" })} style={pin(56, 52)}>
        {Array.from({ length: 10 }, (_, i) => (
          <line key={i} x1="56" y1="14" x2="56" y2="24" stroke="#ffd43b" strokeWidth="5" strokeLinecap="round" transform={`rotate(${i * 36} 56 52)`} />
        ))}
      </motion.g>
      <motion.circle cx="56" cy="52" r="26" fill="#ffd43b" animate={{ scale: step === 1 || step === 4 ? 1.12 : 1 }} transition={SPRING} style={pin(56, 52)} />

      {/* rain */}
      {rainy && Array.from({ length: 10 }, (_, i) => (
        <motion.ellipse key={i} cx={120 + i * 18} rx="3" ry="6" fill="#4d96ff" initial={{ y: -10, opacity: 0 }} animate={{ y: GROUND - 20, opacity: [0, 1, 1, 0] }} transition={loop({ duration: 1.1, delay: (i % 5) * 0.2, ease: "linear" })} />
      ))}
      {rainy && (
        <g fill="#b9c6d6">
          <ellipse cx="190" cy="14" rx="46" ry="16" />
          <ellipse cx="226" cy="22" rx="40" ry="14" />
          <ellipse cx="160" cy="24" rx="34" ry="12" />
        </g>
      )}

      {/* roots */}
      <g stroke="#e8d3b0" strokeWidth="4" strokeLinecap="round" fill="none">
        {["M200,246 Q196,262 178,276", "M200,246 Q204,266 214,284", "M200,246 L200,290", "M190,262 Q174,264 164,262"].map((d, i) => (
          <motion.path key={d} d={d} initial={false} animate={{ pathLength: step >= 2 ? 1 : 0, opacity: step >= 2 ? 1 : 0 }} transition={{ duration: 0.9, delay: i * 0.12 }} />
        ))}
      </g>

      {/* seed */}
      <motion.g initial={false} animate={{ scale: step < 2 ? 1 : 0.5, opacity: step < 2 ? 1 : 0, rotate: step === 1 ? [-6, 6, -6] : 0 }} transition={step === 1 ? loop({ duration: 0.6 }) : { duration: 0.6 }} style={pin(200, 246)}>
        <ellipse cx="200" cy="246" rx="11" ry="15" fill="#8d5524" stroke="#5c3512" strokeWidth="2" />
        <path d="M196,238 Q200,246 196,254" stroke="#c98f65" strokeWidth="2" fill="none" />
      </motion.g>

      {/* stem, anchored at the ground */}
      <motion.rect x="196" y={GROUND - FULL} width="8" height={FULL + 4} rx="4" fill="#4caf50" initial={false} animate={{ scaleY: h / FULL }} transition={SPRING} style={{ originY: 1, originX: 0.5 }} />

      {/* everything on top of the stem rides up with it */}
      <motion.g initial={false} animate={{ y: -h }} transition={SPRING}>
        <motion.g initial={false} animate={{ scale: leaf }} transition={SPRING} style={pin(200, GROUND + 30)}>
          <ellipse cx="170" cy={GROUND + 32} rx="26" ry="11" fill="#6bcb77" stroke="#3f9c4a" strokeWidth="2" transform={`rotate(-28 170 ${GROUND + 32})`} />
          <ellipse cx="230" cy={GROUND + 32} rx="26" ry="11" fill="#6bcb77" stroke="#3f9c4a" strokeWidth="2" transform={`rotate(28 230 ${GROUND + 32})`} />
        </motion.g>

        {/* flower */}
        <motion.g initial={false} animate={{ scale: step === 4 ? 1 : 0, rotate: step === 4 ? 0 : -90 }} transition={SPRING} style={pin(200, GROUND + 30)}>
          <motion.g animate={{ rotate: [-4, 4, -4] }} transition={loop({ duration: 3 })} style={pin(200, GROUND + 30)}>
            {Array.from({ length: 8 }, (_, i) => (
              <ellipse key={i} cx="200" cy={GROUND + 8} rx="9" ry="17" fill="#ff8fb1" transform={`rotate(${i * 45} 200 ${GROUND + 30})`} />
            ))}
            <circle cx="200" cy={GROUND + 30} r="12" fill="#ffd43b" />
          </motion.g>
        </motion.g>

        {/* fruit */}
        {[
          [-28, 36, "#ff6b6b"],
          [28, 46, "#ff6b6b"],
          [0, 12, "#ff8787"],
        ].map(([dx, dy, c], i) => (
          <motion.g key={i} initial={false} animate={{ scale: step === 5 ? 1 : 0 }} transition={{ ...SPRING, delay: i * 0.15 }} style={pin(200 + (dx as number), GROUND + (dy as number) - 12)}>
            <line x1="200" y1={GROUND + 30} x2={200 + (dx as number)} y2={GROUND + (dy as number) - 14} stroke="#4caf50" strokeWidth="4" />
            <circle cx={200 + (dx as number)} cy={GROUND + (dy as number)} r="14" fill={c as string} stroke="#d6264a" strokeWidth="2" />
            <path d={`M${194 + (dx as number)},${GROUND + (dy as number) - 12} l6,-5 l6,5 z`} fill="#3f9c4a" />
          </motion.g>
        ))}
      </motion.g>

      {/* bee visits the flower */}
      {step === 4 && (
        <motion.text fontSize="26" textAnchor="middle" initial={{ x: 240, y: 70 }} animate={{ x: [240, 160, 200, 250, 240], y: [70, 60, 80, 94, 70] }} transition={loop({ duration: 4 })}>🐝</motion.text>
      )}

      {/* new seeds fall: the cycle begins again */}
      {step === 5 && [0, 1, 2].map((i) => (
        <motion.ellipse key={i} rx="4" ry="6" fill="#8d5524" initial={{ x: 190 + i * 12, y: GROUND - 70, opacity: 0 }} animate={{ y: GROUND + 14, opacity: [0, 1, 1, 0] }} transition={loop({ duration: 2.2, delay: i * 0.7, ease: "easeIn" })} />
      ))}
    </svg>
  );
}
