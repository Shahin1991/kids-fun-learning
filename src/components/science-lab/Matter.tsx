"use client";

import { motion } from "framer-motion";
import { SPRING, VIEW, pin, useLoop, type SceneProps } from "./types";

const N = 20;
const BOX = { x: 40, y: 40, w: 200, h: 200 };
/** Step -> state: 0 solid, 1 liquid, 2 gas, 3 back to solid. */
const STATE = ["solid", "liquid", "gas", "solid"] as const;

/** Deterministic pseudo-random in [0,1) so the animation is the same on every render. */
const rnd = (i: number, k: number) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function home(i: number, state: (typeof STATE)[number]) {
  const col = i % 5;
  const row = Math.floor(i / 5);
  if (state === "solid") return { x: BOX.x + 40 + col * 30, y: BOX.y + 80 + row * 30, amp: 2 };
  if (state === "liquid") return { x: BOX.x + 30 + col * 35 + (row % 2) * 10, y: BOX.y + 110 + row * 25, amp: 10 };
  return { x: BOX.x + 20 + rnd(i, 1) * 160, y: BOX.y + 20 + rnd(i, 2) * 160, amp: 55 };
}

/** Twenty dots in a box: packed and wiggling, sliding, or zooming, depending on the heat. */
export function Matter({ step }: SceneProps) {
  const loop = useLoop();
  const state = STATE[step];
  const fast = state === "gas" ? 1.2 : state === "liquid" ? 2.2 : 0.35;
  const heat = step === 1 || step === 2;
  const cold = step === 3;
  const fill = state === "solid" ? "#9fd9ff" : state === "liquid" ? "#4d96ff" : "#c9b8ff";

  return (
    <svg viewBox={VIEW} className="h-full w-full" role="img" aria-label="Tiny particles in a box moving as ice, water or steam">
      <rect width="400" height="300" fill="#f3f6ff" />
      <motion.rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} rx="14" initial={false} animate={{ fill: state === "solid" ? "#e3f4ff" : state === "liquid" ? "#f0f7ff" : "#f8f3ff" }} stroke="#8aa0c8" strokeWidth="5" />
      {Array.from({ length: N }, (_, i) => {
        const h = home(i, state);
        return (
          <motion.circle key={i} r="9" cx="0" cy="0" fill={fill} stroke="#ffffff" strokeWidth="2" initial={false}
            animate={{ x: [h.x, h.x + (rnd(i, 3) - 0.5) * 2 * h.amp, h.x + (rnd(i, 4) - 0.5) * 2 * h.amp, h.x], y: [h.y, h.y + (rnd(i, 5) - 0.5) * 2 * h.amp, h.y + (rnd(i, 6) - 0.5) * 2 * h.amp, h.y] }}
            transition={loop({ duration: fast * (1 + rnd(i, 7)), ease: "linear" })} />
        );
      })}

      {/* the big picture on the right */}
      <circle cx="320" cy="110" r="52" fill="#ffffff" stroke="#d6def0" strokeWidth="4" />
      <motion.text key={state} x="320" y="128" textAnchor="middle" fontSize="56" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING} style={pin(320, 110)}>
        {state === "solid" ? "🧊" : state === "liquid" ? "💧" : "☁️"}
      </motion.text>
      <text x="320" y="190" textAnchor="middle" fontSize="22" fontWeight="800" fill="#3b2f4a">{state}</text>

      {heat && (
        <motion.text x="320" y="250" textAnchor="middle" fontSize="44" animate={{ scale: [1, 1.2, 0.95, 1.15, 1], rotate: [-4, 4, -3, 3, -4] }} transition={loop({ duration: 0.9 })} style={pin(320, 232)}>🔥</motion.text>
      )}
      {cold && (
        <motion.text x="320" y="250" textAnchor="middle" fontSize="44" animate={{ rotate: 360 }} transition={loop({ duration: 6, ease: "linear" })} style={pin(320, 236)}>❄️</motion.text>
      )}
    </svg>
  );
}
