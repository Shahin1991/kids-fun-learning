"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { BOUNCE, SPRING, VIEW, pin, useLoop, type SceneProps } from "./types";

const N = 20;
const BOX = { x: 40, y: 40, w: 200, h: 200 };
const STATES = ["solid", "liquid", "gas"] as const;
type State = (typeof STATES)[number];
/** Step -> how hot: 0 solid, 1 liquid, 2 gas, 3 back to solid. */
const LEVEL = [0, 1, 2, 0];
const SAY: Record<State, string> = { solid: "Ice! The bits are packed tight.", liquid: "Water! The bits slide around.", gas: "Steam! The bits zoom about." };

/** Deterministic pseudo-random in [0,1) so the animation is the same on every render. */
const rnd = (i: number, k: number) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function home(i: number, state: State) {
  const col = i % 5;
  const row = Math.floor(i / 5);
  if (state === "solid") return { x: BOX.x + 40 + col * 30, y: BOX.y + 80 + row * 30, amp: 2 };
  if (state === "liquid") return { x: BOX.x + 30 + col * 35 + (row % 2) * 10, y: BOX.y + 110 + row * 25, amp: 10 };
  return { x: BOX.x + 20 + rnd(i, 1) * 160, y: BOX.y + 20 + rnd(i, 2) * 160, amp: 55 };
}

/** Twenty dots in a box: packed and wiggling, sliding, or zooming, depending on the heat. Tap 🔥 or ❄️ to change it. */
export function Matter({ step }: SceneProps) {
  const loop = useLoop();
  // the heat follows the step until the child taps fire or ice; `dir` remembers which one they tapped
  const [mine, setMine] = useState<{ step: number; level: number; dir: "hot" | "cold"; n: number } | null>(null);
  const tapped = mine?.step === step ? mine : null;
  const level = tapped ? tapped.level : LEVEL[step];
  const dir = tapped ? tapped.dir : step === 1 || step === 2 ? "hot" : step === 3 ? "cold" : null;
  const state = STATES[level];
  const fast = state === "gas" ? 1.2 : state === "liquid" ? 2.2 : 0.35;
  const fill = state === "solid" ? "#9fd9ff" : state === "liquid" ? "#4d96ff" : "#c9b8ff";

  const tap = (d: "hot" | "cold") => {
    const next = Math.max(0, Math.min(2, level + (d === "hot" ? 1 : -1)));
    setMine({ step, level: next, dir: d, n: (mine?.n ?? 0) + 1 });
    if (next === level) audioManager.playSfx("knock", 0.6);
    else audioManager.playPop(next);
    audioManager.speak(next === level ? (d === "hot" ? "It is already steam!" : "It is already ice!") : SAY[STATES[next]]);
  };

  const button = (d: "hot" | "cold", x: number) => {
    const active = dir === d;
    return (
      <g role="button" aria-label={d === "hot" ? "Heat it up" : "Cool it down"} className="cursor-pointer" onClick={() => tap(d)}>
        <circle cx={x} cy="250" r="34" fill={d === "hot" ? "#ffe3d6" : "#e0f2ff"} stroke={active ? (d === "hot" ? "#ff6b35" : "#4d96ff") : "#d6def0"} strokeWidth="4" />
        {/* re-keyed on each tap so it squashes and bounces back */}
        <motion.g key={tapped?.dir === d ? tapped.n : 0} initial={tapped?.dir === d ? { scale: 0.7 } : false} animate={{ scale: 1 }} transition={BOUNCE} style={pin(x, 250)}>
          {d === "hot" ? (
            <motion.text x={x} y="264" textAnchor="middle" fontSize="40" animate={active ? { scale: [1, 1.2, 0.95, 1.15, 1], rotate: [-4, 4, -3, 3, -4] } : { scale: 1, rotate: 0 }} transition={active ? loop({ duration: 0.9 }) : SPRING} style={pin(x, 246)}>🔥</motion.text>
          ) : (
            <motion.text x={x} y="264" textAnchor="middle" fontSize="40" animate={active ? { rotate: 360 } : { rotate: 0 }} transition={active ? loop({ duration: 6, ease: "linear" }) : SPRING} style={pin(x, 250)}>❄️</motion.text>
          )}
        </motion.g>
      </g>
    );
  };

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
      <circle cx="320" cy="96" r="50" fill="#ffffff" stroke="#d6def0" strokeWidth="4" />
      <motion.text key={state} x="320" y="114" textAnchor="middle" fontSize="54" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING} style={pin(320, 96)}>
        {state === "solid" ? "🧊" : state === "liquid" ? "💧" : "☁️"}
      </motion.text>
      <text x="320" y="176" textAnchor="middle" fontSize="22" fontWeight="800" fill="#3b2f4a">{state}</text>

      {button("hot", 282)}
      {button("cold", 358)}
      {!tapped && (
        <motion.text x="320" y="206" textAnchor="middle" fontSize="15" fontWeight="800" fill="#ff6b35" animate={{ scale: [1, 1.08, 1] }} transition={loop({ duration: 1.2 })} style={pin(320, 201)}>Tap 🔥 or ❄️ 👇</motion.text>
      )}
    </svg>
  );
}
