"use client";

import { motion } from "framer-motion";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { audioManager } from "@/lib/audio/AudioManager";
import { BOUNCE, SPRING, VIEW, pin, useBurst, useLoop, type SceneProps } from "./types";

/** Sea, sun, cloud and hill: each step lights up one part of the cycle. Tap the cloud to make it rain. */
export function WaterCycle({ step }: SceneProps) {
  const loop = useLoop();
  const reduced = useAppReducedMotion();
  const shower = useBurst(2800);
  const rain = step === 2 || shower.on;
  const glow = (n: number) => (step === n ? 1 : 0.3);

  const tap = () => {
    if (!shower.count) audioManager.speak("Plip plop! The heavy cloud rains.");
    audioManager.playSfx("plunk", 0.8);
    shower.fire();
  };

  return (
    <svg viewBox={VIEW} className="h-full w-full" role="img" aria-label="The water cycle: sea, sun, cloud, rain and river">
      <rect width="400" height="300" fill="#bfe6ff" />
      {/* sun */}
      <motion.g animate={{ rotate: 360 }} transition={loop({ duration: 30, ease: "linear" })} style={pin(52, 48)}>
        {Array.from({ length: 10 }, (_, i) => (
          <line key={i} x1="52" y1="10" x2="52" y2="20" stroke="#ffd43b" strokeWidth="5" strokeLinecap="round" transform={`rotate(${i * 36} 52 48)`} />
        ))}
      </motion.g>
      <circle cx="52" cy="48" r="26" fill="#ffd43b" />

      {/* hill and river */}
      <path d="M200,300 L200,200 Q250,100 310,120 Q360,140 400,170 L400,300 Z" fill="#6bcb77" />
      <path d="M300,128 Q280,170 300,200 Q320,230 250,262 Q210,276 170,262" stroke="#4d96ff" strokeWidth="9" strokeLinecap="round" fill="none" opacity={step === 3 ? 1 : 0.35} />
      {step === 3 && (
        <motion.path d="M300,128 Q280,170 300,200 Q320,230 250,262 Q210,276 170,262" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray="6 16" animate={{ strokeDashoffset: [0, -44] }} transition={loop({ duration: 1.2, ease: "linear" })} />
      )}
      {/* sea */}
      <rect y="232" width="400" height="68" fill="#4d96ff" opacity={0.95} />
      <rect y="232" width="200" height="68" fill="#4d96ff" />
      <motion.path d="M0,236 q15,-8 30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0" stroke="#ffffff" strokeWidth="3" fill="none" animate={{ x: [0, -30] }} transition={loop({ duration: 2.4, ease: "linear" })} />

      {/* vapour rises from the sea */}
      <g opacity={glow(0) + (step === 1 ? 0.2 : 0)}>
        {[60, 100, 140].map((x, i) => (
          <motion.path key={x} d={`M${x},230 q8,-10 0,-20 t0,-20 t0,-20`} stroke="#ffffff" strokeWidth="5" strokeLinecap="round" fill="none" initial={{ y: 0, opacity: 0 }} animate={{ y: [0, -70], opacity: [0, 1, 0] }} transition={loop({ duration: 2.4, delay: i * 0.6, ease: "easeOut" })} />
        ))}
      </g>

      {/* cloud, bigger and greyer when it holds more water */}
      <motion.g animate={{ scale: rain ? 1.12 : step === 0 ? 0.55 : step === 1 ? 1 : 0.8, fill: rain ? "#a8b4c4" : "#ffffff" }} transition={SPRING} style={pin(150, 90)}>
        {/* squashes on each tap and bounces back */}
        <motion.g key={shower.count} initial={shower.count > 0 && !reduced ? { scaleX: 1.15, scaleY: 0.8 } : false} animate={{ scaleX: 1, scaleY: 1 }} transition={BOUNCE} style={pin(150, 90)}>
          <ellipse cx="130" cy="96" rx="48" ry="22" />
          <ellipse cx="164" cy="80" rx="34" ry="24" />
          <ellipse cx="104" cy="84" rx="30" ry="20" />
          <ellipse cx="190" cy="98" rx="34" ry="18" />
        </motion.g>
      </motion.g>
      <ellipse cx="150" cy="88" rx="96" ry="44" fill="transparent" className="cursor-pointer" role="button" aria-label="Make it rain" onClick={tap} />
      {!shower.count && (
        <motion.text x="300" y="40" textAnchor="middle" fontSize="17" fontWeight="800" fill="#3b2f4a" animate={{ scale: [1, 1.08, 1] }} transition={loop({ duration: 1.2 })} style={pin(300, 34)}>👈 Tap the cloud</motion.text>
      )}

      {/* rain */}
      {rain && Array.from({ length: 12 }, (_, i) => (
        <motion.ellipse key={i} cx={100 + i * 14} rx="3" ry="7" fill="#4d96ff" initial={{ y: 110, opacity: 0 }} animate={{ y: 226, opacity: [0, 1, 1, 0] }} transition={loop({ duration: 1, delay: (i % 4) * 0.25, ease: "linear" })} />
      ))}
      {step === 1 && [0, 1, 2].map((i) => (
        <motion.circle key={i} cx={110 + i * 30} r="4" fill="#ffffff" initial={{ y: 170, opacity: 0 }} animate={{ y: 110, opacity: [0, 1, 0] }} transition={loop({ duration: 1.8, delay: i * 0.4, ease: "easeOut" })} />
      ))}
    </svg>
  );
}
