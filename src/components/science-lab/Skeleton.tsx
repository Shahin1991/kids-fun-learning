"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { SPRING, VIEW, pin, useLoop, type SceneProps } from "./types";

const BONE = "#f6f0e1";
const EDGE = "#b9ad8f";

/** A long bone: a darker line under a lighter one gives it an outline. */
function Bone({ x1, y1, x2, y2, w = 9 }: { x1: number; y1: number; x2: number; y2: number; w?: number }) {
  return (
    <g strokeLinecap="round">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={EDGE} strokeWidth={w + 3} />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={BONE} strokeWidth={w} />
    </g>
  );
}

const Knob = ({ x, y, r = 6 }: { x: number; y: number; r?: number }) => <circle cx={x} cy={y} r={r} fill={BONE} stroke={EDGE} strokeWidth="2" />;

const SPINE = Array.from({ length: 9 }, (_, i) => 70 + i * 9);
const RIBS = [88, 98, 108, 118, 128];

export function Skeleton({ step, go }: SceneProps) {
  const loop = useLoop();
  const lit = (n: number) => (step === 0 || step === 4 || step === n ? 1 : 0.25);
  const hit = (n: number, el: ReactNode) => (
    <g className="cursor-pointer" onClick={() => { audioManager.playPop(n); go(n); }}>{el}</g>
  );
  // arms and legs swing at the joints during the joints step, and just sway a little otherwise
  const swing = (deg: number) => (step === 4 ? [0, deg, 0] : step === 0 ? [0, deg / 6, 0] : 0);
  const t = loop({ duration: step === 4 ? 1.6 : 3 });

  return (
    <svg viewBox={VIEW} className="h-full w-full" role="img" aria-label="A skeleton">
      <rect width="400" height="300" fill="#2b2550" />

      {/* arms (upper bone fixed, forearm swings at the elbow) */}
      {[-1, 1].map((d) => {
        const sx = 200 + d * 36;
        const ex = 200 + d * 54;
        return (
          <motion.g key={d} animate={{ opacity: lit(4) }}>
            <Bone x1={sx} y1={84} x2={ex} y2={134} />
            <motion.g animate={{ rotate: swing(d * -40) }} transition={t} style={pin(ex, 134)}>
              <Bone x1={ex} y1={134} x2={ex + d * 8} y2={186} w={7} />
              <Knob x={ex + d * 9} y={190} r={7} />
            </motion.g>
            <Knob x={ex} y={134} r={7} />
            <Knob x={sx} y={84} r={7} />
          </motion.g>
        );
      })}

      {/* legs */}
      {[-1, 1].map((d) => {
        const hx = 200 + d * 14;
        const kx = 200 + d * 20;
        return (
          <motion.g key={d} animate={{ opacity: lit(4) }}>
            <Bone x1={hx} y1={168} x2={kx} y2={226} w={11} />
            <motion.g animate={{ rotate: swing(-26) }} transition={{ ...t, delay: d > 0 && step === 4 ? 0.8 : 0 }} style={pin(kx, 226)}>
              <Bone x1={kx} y1={226} x2={kx + d * 2} y2={284} w={9} />
              <ellipse cx={kx + d * 8} cy="288" rx="12" ry="5" fill={BONE} stroke={EDGE} strokeWidth="2" />
            </motion.g>
            <Knob x={kx} y={226} r={8} />
          </motion.g>
        );
      })}
      {hit(4, <><circle cx="254" cy="134" r="22" fill="transparent" /><circle cx="180" cy="226" r="22" fill="transparent" /></>)}

      {/* pelvis */}
      <motion.path d="M172,158 Q200,148 228,158 Q232,176 214,180 Q200,170 186,180 Q168,176 172,158 Z" fill={BONE} stroke={EDGE} strokeWidth="3" animate={{ opacity: lit(4) }} />

      {/* spine: each bone slides a little more than the one above, so the stack bends */}
      <motion.g animate={{ opacity: lit(3) }}>
        {SPINE.map((y, i) => (
          <motion.rect key={y} x="192" y={y} width="16" height="7" rx="3" fill={BONE} stroke={EDGE} strokeWidth="1.5" animate={{ x: step === 3 ? [0, (i + 1) * 1.6, 0, -(i + 1) * 1.6, 0] : 0 }} transition={step === 3 ? loop({ duration: 3 }) : SPRING} />
        ))}
      </motion.g>
      {hit(3, <rect x="186" y="132" width="28" height="34" fill="transparent" />)}

      {/* ribs breathe */}
      <motion.g animate={{ opacity: lit(2), scaleX: step === 2 ? [1, 1.07, 1] : 1 }} transition={step === 2 ? loop({ duration: 3.2 }) : SPRING} style={pin(200, 108)}>
        {RIBS.map((y, i) => (
          <g key={y} fill="none" stroke={EDGE} strokeWidth="6" strokeLinecap="round">
            <path d={`M192,${y} Q${160 - i * 3},${y - 4} ${158 - i * 3},${y + 20}`} />
            <path d={`M208,${y} Q${240 + i * 3},${y - 4} ${242 + i * 3},${y + 20}`} />
            <path d={`M192,${y} Q${160 - i * 3},${y - 4} ${158 - i * 3},${y + 20}`} stroke={BONE} strokeWidth="3.5" />
            <path d={`M208,${y} Q${240 + i * 3},${y - 4} ${242 + i * 3},${y + 20}`} stroke={BONE} strokeWidth="3.5" />
          </g>
        ))}
        <rect x="197" y="86" width="6" height="40" rx="3" fill={BONE} stroke={EDGE} strokeWidth="1.5" />
      </motion.g>
      {step === 2 && (
        <motion.text x="200" y="118" textAnchor="middle" fontSize="18" animate={{ scale: [1, 1.35, 1, 1.25, 1] }} transition={loop({ duration: 1.1, times: [0, 0.12, 0.24, 0.36, 1] })} style={pin(200, 112)}>❤️</motion.text>
      )}
      {hit(2, <rect x="150" y="84" width="100" height="56" fill="transparent" />)}

      {/* skull */}
      <motion.g animate={{ opacity: lit(1), y: step === 1 ? [0, -3, 0] : 0 }} transition={step === 1 ? loop({ duration: 1.6 }) : SPRING}>
        <rect x="190" y="62" width="20" height="12" rx="4" fill={BONE} stroke={EDGE} strokeWidth="2" />
        <path d="M200,16 C228,16 232,40 224,52 C220,58 218,62 216,66 L184,66 C182,62 180,58 176,52 C168,40 172,16 200,16 Z" fill={BONE} stroke={EDGE} strokeWidth="3" />
        <ellipse cx="188" cy="40" rx="7" ry="8" fill="#2b2550" />
        <ellipse cx="212" cy="40" rx="7" ry="8" fill="#2b2550" />
        <path d="M200,48 l-4,9 h8 z" fill="#2b2550" />
        <path d="M190,64 v-5 M196,64 v-5 M204,64 v-5 M210,64 v-5" stroke={EDGE} strokeWidth="2" />
      </motion.g>
      {step === 1 && (
        <motion.text x="254" y="30" textAnchor="middle" fontSize="34" animate={{ scale: [1, 1.15, 1] }} transition={loop({ duration: 1.4 })} style={pin(254, 20)}>🧠</motion.text>
      )}
      {hit(1, <circle cx="200" cy="40" r="32" fill="transparent" />)}
    </svg>
  );
}
