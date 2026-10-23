"use client";

import { motion } from "framer-motion";
import { VIEW, useLoop, type SceneProps } from "./types";

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
  { e: "📎", iron: true },
  { e: "🪵", iron: false },
  { e: "🔩", iron: true },
  { e: "🧸", iron: false },
  { e: "📌", iron: true },
  { e: "🍎", iron: false },
];

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

      {step === 1 && (
        <>
          <motion.text fontSize="64" textAnchor="middle" x="200" y="70" animate={{ rotate: [-6, 6, -6] }} transition={loop({ duration: 2 })} style={{ originX: "50%", originY: "50%" }}>🧲</motion.text>
          {ITEMS.map((it, i) => {
            const x = 50 + i * 60;
            return (
              <g key={i}>
                {it.iron ? (
                  <motion.text textAnchor="middle" fontSize="32" initial={{ x, y: 250 }} animate={{ x: [x, 200, 200, x], y: [250, 112 + (i % 3) * 6, 112 + (i % 3) * 6, 250] }} transition={loop({ duration: 4, delay: i * 0.25, times: [0, 0.35, 0.7, 1] })}>{it.e}</motion.text>
                ) : (
                  <motion.text textAnchor="middle" fontSize="32" initial={{ x, y: 250 }} animate={{ x, y: 250, rotate: [0, -4, 4, 0] }} transition={loop({ duration: 2.4, delay: i * 0.2 })}>{it.e}</motion.text>
                )}
                <text x={x} y="288" textAnchor="middle" fontSize="22">{it.iron ? "✅" : "❌"}</text>
              </g>
            );
          })}
        </>
      )}

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
