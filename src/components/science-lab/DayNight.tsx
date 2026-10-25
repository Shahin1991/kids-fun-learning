"use client";

import { animate, motion, useMotionValue, useMotionValueEvent, type AnimationPlaybackControls } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { audioManager } from "@/lib/audio/AudioManager";
import { homeSide, nearestTurn, turnBetween } from "@/lib/science-lab/spin";
import { SPRING, VIEW, pin, useLoop, viewPoint, type SceneProps } from "./types";

const ROTATION = [0, 0, -90, 90];
const EARTH = { x: 260, y: 150, r: 94 };

/** The Sun on the left lights half of the Earth; a little house rides round with the spin. Drag the Earth to spin it yourself. */
export function DayNight({ step }: SceneProps) {
  const loop = useLoop();
  const reduced = useAppReducedMotion();
  // one rotation for the land and house, whether it is spinning by itself, settling on a step, or being dragged
  const rot = useMotionValue(ROTATION[step]);
  const run = useRef<AnimationPlaybackControls | null>(null);
  // pointer angle around the Earth at the last move, while dragging
  const grab = useRef<number | null>(null);
  const [dragged, setDragged] = useState(false);
  const [touched, setTouched] = useState<number | null>(null);
  const [side, setSide] = useState(homeSide(ROTATION[step]));
  // the first step shows both halves; after that (or once the child spins it) we follow the house
  const showSide = step !== 0 || touched === step;

  const play = useCallback(
    (n: number) => {
      const c = rot.get();
      if (n === 1) return reduced ? null : animate(rot, [c, c - 360], { duration: 9, ease: "linear", repeat: Infinity });
      return animate(rot, nearestTurn(c, ROTATION[n]), reduced ? { duration: 0 } : SPRING);
    },
    [rot, reduced],
  );

  useEffect(() => {
    run.current = play(step);
    return () => run.current?.stop();
  }, [play, step]);

  useMotionValueEvent(rot, "change", (v) => {
    const s = homeSide(v);
    if (s === side) return;
    setSide(s);
    if (grab.current !== null) audioManager.playPop(s === "day" ? 3 : 1);
  });

  const angleAt = (e: PointerEvent) => {
    const p = viewPoint(e);
    return (Math.atan2(p.y - EARTH.y, p.x - EARTH.x) * 180) / Math.PI;
  };
  const move = (e: PointerEvent) => {
    if (grab.current === null) return;
    const a = angleAt(e);
    rot.set(rot.get() + turnBetween(grab.current, a));
    grab.current = a;
  };
  const end = () => {
    if (grab.current === null) return;
    grab.current = null;
    audioManager.speak(side === "day" ? "Day time!" : "Night time!");
    // the spinning step keeps on spinning from wherever the child let go
    if (step === 1) run.current = play(1);
  };

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
        <clipPath id="dn-earth"><circle cx={EARTH.x} cy={EARTH.y} r={EARTH.r} /></clipPath>
      </defs>
      <circle cx={EARTH.x} cy={EARTH.y} r={EARTH.r} fill="#4d96ff" />
      <motion.g clipPath="url(#dn-earth)" style={{ ...pin(EARTH.x, EARTH.y), rotate: rot }}>
        <path d="M200,110 q20,-30 50,-14 q14,16 -4,34 q-30,10 -46,-20 Z M262,170 q30,-16 50,6 q8,30 -22,40 q-30,-6 -28,-46 Z M286,92 q24,-8 36,10 q-14,20 -36,-10 Z" fill="#6bcb77" />
        <text x="260" y="76" textAnchor="middle" fontSize="38">🏠</text>
      </motion.g>
      {/* night side */}
      <path d="M260,56 A94,94 0 0 1 260,244 Z" fill="#0b0a2e" opacity="0.62" />
      <circle cx={EARTH.x} cy={EARTH.y} r={EARTH.r} fill="none" stroke="#9fd0ff" strokeWidth="3" opacity="0.7" />
      {!dragged && (
        <motion.circle cx={EARTH.x} cy={EARTH.y} r={EARTH.r + 6} fill="none" stroke="#ffd43b" strokeWidth="3" animate={{ scale: [1, 1.06, 1], opacity: [0.9, 0.2, 0.9] }} transition={loop({ duration: 1.6 })} style={pin(EARTH.x, EARTH.y)} />
      )}
      {/* big grab area: the whole Earth */}
      <circle
        cx={EARTH.x} cy={EARTH.y} r={EARTH.r} fill="transparent" className="cursor-grab" style={{ touchAction: "none" }}
        role="slider" aria-label="Spin the Earth" aria-valuetext={side === "day" ? "Day" : "Night"}
        onPointerDown={(e) => {
          run.current?.stop();
          grab.current = angleAt(e);
          setDragged(true);
          setTouched(step);
          (e.target as Element).setPointerCapture(e.pointerId);
        }}
        onPointerMove={move} onPointerUp={end} onPointerCancel={end}
      />

      <motion.text x="168" y="278" fontSize="22" fontWeight="800" fill="#ffd43b" initial={false} animate={{ opacity: !showSide || side === "day" ? 1 : 0.3 }}>☀️ day</motion.text>
      <motion.text x="270" y="278" fontSize="22" fontWeight="800" fill="#cbb8ff" initial={false} animate={{ opacity: !showSide || side === "night" ? 1 : 0.3 }}>🌙 night</motion.text>
      {showSide && (
        <motion.text key={side} x="260" y="40" textAnchor="middle" fontSize="40" initial={reduced ? false : { scale: 0 }} animate={{ scale: 1 }} transition={SPRING} style={pin(260, 30)}>{side === "day" ? "😄" : "😴"}</motion.text>
      )}
      {!dragged && (
        <motion.text x="80" y="286" textAnchor="middle" fontSize="17" fontWeight="800" fill="#ffd43b" animate={{ scale: [1, 1.08, 1] }} transition={loop({ duration: 1.2 })} style={pin(80, 280)}>Spin the Earth 👆</motion.text>
      )}
    </svg>
  );
}
