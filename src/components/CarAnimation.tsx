"use client";

import { motion, type TargetAndTransition } from "framer-motion";
import { useAppReducedMotion } from "./ReducedMotionProvider";

export type CarState = "idle" | "drive-left" | "drive-right" | "boost" | "celebrate";

const STATES: Record<CarState, TargetAndTransition> = {
  idle: { x: 0, y: [0, -2, 0], rotate: 0, transition: { duration: 1.2, repeat: Infinity } },
  "drive-left": { x: [0, -14, 0], rotate: [0, -3, 0], transition: { duration: 0.6 } },
  "drive-right": { x: [0, 14, 0], rotate: [0, 3, 0], transition: { duration: 0.6 } },
  boost: { x: [0, 22, 0], y: 0, rotate: [0, -4, 0], transition: { duration: 0.7 } },
  celebrate: { y: [0, -24, 0, -16, 0], rotate: [0, -8, 8, -4, 0], transition: { duration: 1.1 } },
};

function Wheel({ cx, spin }: { cx: number; spin: boolean }) {
  return (
    <motion.g style={{ originX: `${cx}px`, originY: "58px" }} animate={spin ? { rotate: 360 } : { rotate: 0 }} transition={spin ? { duration: 0.5, repeat: Infinity, ease: "linear" } : undefined}>
      <circle cx={cx} cy={58} r={11} fill="#2d2d3a" />
      <circle cx={cx} cy={58} r={5} fill="#cfd8dc" />
      <rect x={cx - 1} y={48} width={2} height={20} fill="#90a4ae" />
    </motion.g>
  );
}

export function CarAnimation({ state, color = "#ff6b6b" }: { state: CarState; color?: string }) {
  const reduced = useAppReducedMotion();
  const moving = state !== "idle" && !reduced;
  return (
    <motion.svg viewBox="0 0 160 80" className="h-28 w-52" role="img" aria-label="Race car" animate={reduced ? undefined : STATES[state]} key={state}>
      {state === "boost" && !reduced && <motion.path d="M10 44 L-14 38 L-14 52 Z" fill="#ffb74d" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.2, repeat: Infinity }} />}
      <path d="M12 52 L16 38 Q20 32 40 30 L58 16 Q62 12 70 12 L102 12 Q110 12 114 16 L128 30 Q148 32 150 44 L150 54 L12 54 Z" fill={color} />
      <path d="M62 18 L70 18 L70 30 L48 30 Z" fill="#b3e5fc" />
      <path d="M76 18 L104 18 L118 30 L76 30 Z" fill="#b3e5fc" />
      <rect x={144} y={38} width={8} height={6} rx={2} fill="#fff59d" />
      <rect x={10} y={40} width={6} height={6} rx={2} fill="#ef5350" />
      <Wheel cx={42} spin={moving} />
      <Wheel cx={120} spin={moving} />
      {state === "celebrate" && <text x={70} y={8} fontSize={14}>🎉</text>}
    </motion.svg>
  );
}
