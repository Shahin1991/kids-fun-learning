"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { HomeButton } from "@/components/HomeButton";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { SoundToggle } from "@/components/SoundToggle";
import { audioManager } from "@/lib/audio/AudioManager";

const STYLES = [
  { id: "firework", icon: "🎆", particles: ["✨", "⭐", "💥"] },
  { id: "confetti", icon: "🎉", particles: ["🟥", "🟦", "🟩", "🟨", "🟪"] },
  { id: "bubble", icon: "🫧", particles: ["🫧", "⚪"] },
  { id: "splash", icon: "💦", particles: ["💧", "💦", "🔵"] },
] as const;

interface Burst {
  id: number;
  x: number;
  y: number;
  style: (typeof STYLES)[number];
}

let nextId = 0;

// No stars or achievements here on purpose: this is pure free play.
export default function TapFunPage() {
  const reduced = useAppReducedMotion();
  const [style, setStyle] = useState<(typeof STYLES)[number]>(STYLES[0]);
  const [bursts, setBursts] = useState<Burst[]>([]);

  const burst = (e: React.PointerEvent) => {
    const id = nextId++;
    audioManager.playNote(Math.floor((e.clientX / window.innerWidth) * 10));
    setBursts((b) => [...b.slice(-8), { id, x: e.clientX, y: e.clientY, style }]);
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1200);
  };

  return (
    <main className="relative min-h-dvh touch-none overflow-hidden" onPointerDown={burst}>
      <header className="relative z-10 flex items-center justify-between p-3" onPointerDown={(e) => e.stopPropagation()}>
        <HomeButton />
        <div className="flex gap-2">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-label={s.id}
              aria-pressed={style.id === s.id}
              onClick={() => setStyle(s)}
              className={`min-h-touch min-w-touch rounded-full text-4xl shadow-md ${style.id === s.id ? "bg-kid-yellow" : "bg-white"}`}
            >
              {s.icon}
            </button>
          ))}
        </div>
        <SoundToggle />
      </header>
      <p className="pointer-events-none absolute inset-x-0 top-1/2 text-center text-3xl font-bold opacity-40">Tap anywhere!</p>
      <AnimatePresence>
        {bursts.map((b) =>
          b.style.particles.flatMap((p, pi) =>
            Array.from({ length: reduced ? 1 : 4 }, (_, i) => {
              const angle = ((pi * 4 + i) / (b.style.particles.length * 4)) * Math.PI * 2;
              return (
                <motion.span
                  key={`${b.id}-${pi}-${i}`}
                  className="pointer-events-none absolute text-3xl"
                  style={{ left: b.x, top: b.y }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
                  animate={{ x: Math.cos(angle) * 110, y: Math.sin(angle) * 110 + (b.style.id === "splash" ? 40 : 0), opacity: 0, scale: 1.2 }}
                  transition={{ duration: reduced ? 0.3 : 1 }}
                >
                  {p}
                </motion.span>
              );
            }),
          ),
        )}
      </AnimatePresence>
    </main>
  );
}
