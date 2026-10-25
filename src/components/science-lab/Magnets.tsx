"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { BOUNCE, VIEW, pin, useLoop, type SceneProps } from "./types";

const N = "#ff4d6d";
const S = "#4d96ff";

/** A bar magnet drawn around its own centre, pole colours left then right. */
function Bar({ left, label = true }: { left: "N" | "S"; label?: boolean }) {
  const l = left === "N" ? N : S;
  const r = left === "N" ? S : N;
  return (
    <g>
      <rect x="-60" y="-20" width="60" height="40" rx="8" fill={l} />
      <rect x="0" y="-20" width="60" height="40" rx="8" fill={r} />
      <rect x="-8" y="-20" width="16" height="40" fill={l} />
      <rect x="0" y="-20" width="8" height="40" fill={r} />
      {label && (
        <>
          <text x="-30" y="9" textAnchor="middle" fontSize="26" fontWeight="800" fill="#fff">{left}</text>
          <text x="30" y="9" textAnchor="middle" fontSize="26" fontWeight="800" fill="#fff">{left === "N" ? "S" : "N"}</text>
        </>
      )}
    </g>
  );
}

const ITEMS = [
  { e: "📎", name: "paper clip", iron: true },
  { e: "🪵", name: "wood", iron: false },
  { e: "🔩", name: "bolt", iron: true },
  { e: "🧸", name: "teddy", iron: false },
  { e: "📌", name: "pin", iron: true },
  { e: "🍎", name: "apple", iron: false },
];
/** How long the scene waits for a tap before testing the next thing itself, so auto-play still shows it. */
const IDLE_MS = 2600;

/** Tap a thing to hold the magnet over it: iron flies up and sticks, everything else just wobbles. */
function PickUp() {
  const loop = useLoop();
  const [tested, setTested] = useState<number[]>([]);
  const all = tested.length === ITEMS.length;

  const test = (i: number, byChild: boolean) => {
    if (tested.includes(i)) return;
    setTested((t) => [...t, i]);
    audioManager.playPop(ITEMS[i].iron ? 3 : 0);
    if (byChild) audioManager.speak(`${ITEMS[i].name}: ${ITEMS[i].iron ? "it sticks!" : "no, it does not stick"}`);
  };

  // nobody tapping: test the next thing in a moment; once all are tested, start over
  useEffect(() => {
    const t = setTimeout(() => {
      if (all) setTested([]);
      else test(ITEMS.findIndex((_, i) => !tested.includes(i)), false);
    }, all ? IDLE_MS * 2 : IDLE_MS);
    return () => clearTimeout(t);
  });

  let stuck = 0;
  return (
    <>
      <motion.text fontSize="64" textAnchor="middle" x="200" y="70" animate={{ rotate: [-6, 6, -6] }} transition={loop({ duration: 2 })} style={pin(200, 24)}>🧲</motion.text>
      {ITEMS.map((it, i) => {
        const x = 50 + i * 60;
        const done = tested.includes(i);
        const slot = it.iron && done ? stuck++ : 0;
        return (
          <g key={it.e}>
            {it.iron ? (
              <motion.text textAnchor="middle" fontSize="32" initial={false} animate={done ? { x: 182 + slot * 18, y: 108 + (slot % 2) * 8, rotate: (slot - 1) * 14 } : { x, y: 250, rotate: 0 }} transition={done ? BOUNCE : { duration: 0.5 }}>{it.e}</motion.text>
            ) : (
              <motion.text textAnchor="middle" fontSize="32" x={x} y={250} initial={false} animate={done ? { rotate: [0, -14, 12, -8, 0], y: [0, -14, 0, -5, 0] } : { rotate: 0, y: 0 }} transition={{ duration: 0.7 }} style={pin(x, 240)}>{it.e}</motion.text>
            )}
            {done && (
              <motion.text x={x} y="288" textAnchor="middle" fontSize="22" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={BOUNCE} style={pin(x, 280)}>{it.iron ? "✅" : "❌"}</motion.text>
            )}
            <rect x={x - 28} y="210" width="56" height="84" fill="transparent" className="cursor-pointer" onClick={() => test(i, true)} role="button" aria-label={`Test the ${it.name}`} />
          </g>
        );
      })}
      {tested.length === 0 && (
        <motion.text x="200" y="180" textAnchor="middle" fontSize="20" fontWeight="800" fill="#3b2f4a" animate={{ scale: [1, 1.1, 1] }} transition={loop({ duration: 1.2 })} style={pin(200, 174)}>Tap a thing to test it 👆</motion.text>
      )}
      {all && [[120, 90], [280, 100], [200, 30]].map(([x, y], i) => (
        <motion.text key={i} x={x} y={y} textAnchor="middle" fontSize="26" initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1], opacity: [1, 1, 0.8] }} transition={{ duration: 0.6, delay: i * 0.12 }} style={pin(x, y - 8)}>✨</motion.text>
      ))}
    </>
  );
}

export function Magnets({ step }: SceneProps) {
  const loop = useLoop();
  return (
    <svg viewBox={VIEW} className="h-full w-full" role="img" aria-label="Magnets pulling and pushing">
      <rect width="400" height="300" fill="#fff5e6" />
      <rect y="262" width="400" height="38" fill="#e8d3b0" />

      {step === 0 && (
        <>
          <g transform="translate(110 150)"><Bar left="N" /></g>
          {[0, 1, 2, 3].map((i) => (
            <motion.text key={i} fontSize="30" textAnchor="middle" initial={{ x: 340, y: 120 + i * 20 }} animate={{ x: [340, 180 + (i % 2) * 6, 180 + (i % 2) * 6, 340], y: [120 + i * 20, 130 + i * 8, 130 + i * 8, 120 + i * 20] }} transition={loop({ duration: 4.5, delay: i * 0.35, times: [0, 0.4, 0.75, 1] })}>📎</motion.text>
          ))}
        </>
      )}

      {step === 1 && <PickUp />}

      {step === 2 && (
        <>
          <motion.g animate={{ x: [60, 60, 142, 142, 60] }} transition={loop({ duration: 4, times: [0, 0.15, 0.4, 0.8, 1], ease: "easeIn" })} style={{ y: 150 }}>
            <Bar left="N" />
          </motion.g>
          <motion.g animate={{ x: [340, 340, 258, 258, 340] }} transition={loop({ duration: 4, times: [0, 0.15, 0.4, 0.8, 1], ease: "easeIn" })} style={{ y: 150 }}>
            <Bar left="N" />
          </motion.g>
          <motion.text x="200" y="90" textAnchor="middle" fontSize="40" animate={{ scale: [0, 0, 1.3, 1, 0] }} transition={loop({ duration: 4, times: [0, 0.38, 0.45, 0.8, 1] })} style={{ originX: "50%", originY: "50%" }}>🤝</motion.text>
          <text x="200" y="230" textAnchor="middle" fontSize="24" fontWeight="800" fill="#3b2f4a">N and S pull together</text>
        </>
      )}

      {step === 3 && (
        <>
          <motion.g animate={{ x: [60, 110, 70, 60], rotate: [0, 0, -3, 0] }} transition={loop({ duration: 2.6 })} style={{ y: 150 }}>
            <Bar left="N" />
          </motion.g>
          <motion.g animate={{ x: [340, 290, 330, 340], rotate: [0, 0, 3, 0] }} transition={loop({ duration: 2.6 })} style={{ y: 150 }}>
            <Bar left="S" />
          </motion.g>
          <motion.text x="200" y="150" textAnchor="middle" fontSize="44" animate={{ scale: [0.6, 1.2, 0.6], opacity: [0.3, 1, 0.3] }} transition={loop({ duration: 2.6 })} style={{ originX: "50%", originY: "50%" }}>💥</motion.text>
          <text x="200" y="230" textAnchor="middle" fontSize="24" fontWeight="800" fill="#3b2f4a">Same poles push apart</text>
        </>
      )}

      {step === 4 && (
        <>
          {[40, 70, 100].flatMap((r, i) =>
            [-1, 1].map((d) => (
              <motion.path key={`${r}${d}`} d={`M-60,0 C-${60 + r * 1.6},${d * r * 1.6} ${60 + r * 1.6},${d * r * 1.6} 60,0`} transform="translate(200 150)" fill="none" stroke="#9b51e0" strokeWidth="3" strokeLinecap="round" strokeDasharray="8 10" animate={{ strokeDashoffset: [0, -36] }} transition={loop({ duration: 1.6 + i * 0.3, ease: "linear" })} opacity={0.9 - i * 0.2} />
            )),
          )}
          <g transform="translate(200 150)"><Bar left="N" /></g>
          <motion.circle r="0" cx="200" cy="150" fill="none" stroke="#9b51e0" strokeWidth="2" animate={{ r: [30, 120], opacity: [0.5, 0] }} transition={loop({ duration: 2.2, ease: "easeOut" })} />
        </>
      )}
    </svg>
  );
}
