"use client";

import { motion } from "framer-motion";
import { SPRING, VIEW, pin, useLoop, type SceneProps } from "./types";

const SKY = ["#8fd3ff", "#b7d7f2", "#9aa8b8", "#5a6678", "#dbe9f5"];
const GROUND = ["#6bcb77", "#6bcb77", "#5aa866", "#4a8a55", "#f4f8ff"];

function Cloud({ x, y, s = 1, fill = "#ffffff" }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill}>
      <ellipse cx="0" cy="0" rx="46" ry="20" />
      <ellipse cx="22" cy="-14" rx="30" ry="22" />
      <ellipse cx="-24" cy="-8" rx="26" ry="18" />
    </g>
  );
}

/** One sky and one tree; the weather changes with the step. */
export function Weather({ step }: SceneProps) {
  const loop = useLoop();
  const dark = step === 2 || step === 3;
  const sway = step === 1 ? 8 : step === 3 ? 5 : 1.5;

  return (
    <svg viewBox={VIEW} className="h-full w-full" role="img" aria-label="Weather scene">
      <motion.rect width="400" height="300" initial={false} animate={{ fill: SKY[step] }} transition={{ duration: 0.8 }} />

      {/* sun */}
      <motion.g initial={false} animate={{ opacity: step === 0 ? 1 : step === 1 ? 0.7 : 0, scale: step <= 1 ? 1 : 0.6 }} transition={SPRING} style={pin(320, 56)}>
        <motion.g animate={{ rotate: 360 }} transition={loop({ duration: 24, ease: "linear" })} style={pin(320, 56)}>
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} x1="320" y1="12" x2="320" y2="24" stroke="#ffd43b" strokeWidth="6" strokeLinecap="round" transform={`rotate(${i * 30} 320 56)`} />
          ))}
        </motion.g>
        <circle cx="320" cy="56" r="30" fill="#ffd43b" />
        {step === 0 && <><circle cx="310" cy="52" r="3" fill="#3b2f4a" /><circle cx="330" cy="52" r="3" fill="#3b2f4a" /><path d="M308,64 Q320,74 332,64" stroke="#3b2f4a" strokeWidth="3" fill="none" strokeLinecap="round" /></>}
      </motion.g>

      {/* clouds drift; faster in wind, grey in rain */}
      <motion.g animate={{ x: step === 1 ? [-140, 460] : [0, 24, 0] }} transition={loop({ duration: step === 1 ? 6 : 10, ease: step === 1 ? "linear" : "easeInOut" })}>
        <Cloud x={90} y={step === 0 ? 70 : 52} s={step === 0 ? 0.8 : 1.2} fill={step === 2 ? "#c3ccd8" : step === 3 ? "#6c7689" : step === 4 ? "#eef3f9" : "#ffffff"} />
      </motion.g>
      {dark && (
        <motion.g animate={{ x: [0, -20, 0] }} transition={loop({ duration: 8 })}>
          <Cloud x={250} y={50} s={1.4} fill={step === 3 ? "#4a5468" : "#b3bdca"} />
        </motion.g>
      )}
      {step === 4 && <Cloud x={260} y={50} s={1.3} fill="#eef3f9" />}

      {/* ground */}
      <motion.path d="M0,300 L0,236 Q120,214 240,232 T400,226 L400,300 Z" initial={false} animate={{ fill: GROUND[step] }} transition={{ duration: 0.8 }} />

      {/* tree */}
      <motion.g animate={{ rotate: [-sway, sway, -sway] }} transition={loop({ duration: step === 1 ? 0.9 : 3 })} style={pin(90, 240)}>
        <rect x="82" y="170" width="16" height="72" rx="6" fill="#8b5a3c" />
        <circle cx="90" cy="150" r="40" fill={step === 4 ? "#dfeee6" : "#4caf50"} />
        <circle cx="64" cy="170" r="26" fill={step === 4 ? "#eef6f0" : "#5cc468"} />
        <circle cx="116" cy="168" r="28" fill={step === 4 ? "#eef6f0" : "#5cc468"} />
      </motion.g>

      {/* windmill */}
      <g>
        <path d="M300,250 L306,160 L314,160 L320,250 Z" fill="#d9c7a3" />
        <motion.g animate={{ rotate: 360 }} transition={step === 1 ? loop({ duration: 0.9, ease: "linear" }) : loop({ duration: 9, ease: "linear" })} style={pin(310, 158)}>
          {[0, 90, 180, 270].map((a) => (
            <path key={a} d="M310,158 L304,114 L318,114 Z" fill="#ff6b6b" transform={`rotate(${a} 310 158)`} />
          ))}
        </motion.g>
        <circle cx="310" cy="158" r="6" fill="#3b2f4a" />
      </g>

      {/* wind streaks */}
      {step === 1 && [90, 130, 190].map((y, i) => (
        <motion.path key={y} d={`M0,${y} q20,-12 40,0 t40,0`} stroke="#ffffff" strokeWidth="4" strokeLinecap="round" fill="none" initial={{ x: -90, opacity: 0 }} animate={{ x: 460, opacity: [0, 1, 1, 0] }} transition={loop({ duration: 2.2, delay: i * 0.5, ease: "linear" })} />
      ))}

      {/* rain, heavier in the storm */}
      {dark && Array.from({ length: step === 3 ? 22 : 14 }, (_, i) => (
        <motion.line key={i} x1={20 + i * (step === 3 ? 17 : 27)} x2={14 + i * (step === 3 ? 17 : 27)} y1="0" y2="14" stroke="#4d96ff" strokeWidth="3" strokeLinecap="round" initial={{ y: 70, opacity: 0 }} animate={{ y: 236, opacity: [0, 1, 1, 0] }} transition={loop({ duration: step === 3 ? 0.6 : 0.9, delay: (i % 6) * 0.12, ease: "linear" })} />
      ))}
      {step === 2 && [150, 210, 260].map((x, i) => (
        <motion.ellipse key={x} cx={x} cy={262 + (i % 2) * 14} rx="3" ry="1.5" fill="none" stroke="#ffffff" strokeWidth="2" animate={{ rx: [3, 22], ry: [1.5, 6], opacity: [1, 0] }} transition={loop({ duration: 1.3, delay: i * 0.4, ease: "easeOut" })} />
      ))}

      {/* lightning and flash */}
      {step === 3 && (
        <>
          <motion.path d="M236,80 L212,138 L232,138 L206,206 L262,122 L240,122 L258,80 Z" fill="#ffe14d" stroke="#f2b705" strokeWidth="3" initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 1, 0, 1, 0, 0] }} transition={loop({ duration: 3.4, ease: "linear" })} />
          <motion.rect width="400" height="300" fill="#ffffff" initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 0.55, 0, 0.35, 0, 0] }} transition={loop({ duration: 3.4, ease: "linear" })} />
        </>
      )}

      {/* snow and snowman */}
      {step === 4 && (
        <>
          {Array.from({ length: 24 }, (_, i) => (
            <motion.circle key={i} cx={10 + i * 16.5} r={2.5 + (i % 3)} fill="#ffffff" initial={{ y: -10, opacity: 0 }} animate={{ y: 290, x: [0, 14, -10, 8], opacity: [0, 1, 1, 0] }} transition={loop({ duration: 4 + (i % 5) * 0.5, delay: (i % 8) * 0.5, ease: "linear" })} />
          ))}
          <g>
            <circle cx="300" cy="256" r="26" fill="#ffffff" stroke="#c9d6e6" strokeWidth="2" />
            <circle cx="300" cy="222" r="19" fill="#ffffff" stroke="#c9d6e6" strokeWidth="2" />
            <circle cx="300" cy="196" r="13" fill="#ffffff" stroke="#c9d6e6" strokeWidth="2" />
            <circle cx="296" cy="193" r="1.8" fill="#3b2f4a" />
            <circle cx="305" cy="193" r="1.8" fill="#3b2f4a" />
            <path d="M300,198 l9,3 l-9,2 z" fill="#ff9f43" />
          </g>
        </>
      )}
    </svg>
  );
}
