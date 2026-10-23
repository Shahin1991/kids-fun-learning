"use client";

import { motion } from "framer-motion";
import { SPRING, VIEW, pin, useLoop, type SceneProps } from "./types";

const GERMS: [number, number][] = [
  [150, 150], [190, 124], [232, 138], [262, 178], [168, 196], [222, 206], [200, 168],
];
const BUBBLES: [number, number, number][] = [
  [150, 130, 12], [196, 112, 9], [240, 126, 14], [128, 176, 10], [272, 168, 11], [176, 210, 13], [230, 218, 10], [204, 164, 15], [160, 168, 8], [250, 200, 9],
];

function Germ({ x, y, i, step }: { x: number; y: number; i: number; step: number }) {
  const loop = useLoop();
  const gone = step >= 3;
  return (
    <motion.g initial={false} animate={{ y: gone ? 150 : 0, opacity: step >= 4 ? 0 : gone ? 0.0 : step === 2 ? 0.55 : 1, scale: step === 2 ? 0.8 : 1 }} transition={gone ? { duration: 1.4, delay: i * 0.1 } : SPRING} style={pin(x, y)}>
      <motion.g animate={{ rotate: [-8, 8, -8], x: step === 2 ? [-2, 2, -2] : 0 }} transition={loop({ duration: step === 2 ? 0.25 : 1.4, delay: i * 0.2 })} style={pin(x, y)}>
        {Array.from({ length: 8 }, (_, k) => (
          <line key={k} x1={x} y1={y - 10} x2={x} y2={y - 17} stroke="#4aa83c" strokeWidth="3" strokeLinecap="round" transform={`rotate(${k * 45} ${x} ${y})`} />
        ))}
        <circle cx={x} cy={y} r="11" fill="#7ed957" stroke="#4aa83c" strokeWidth="2" />
        <circle cx={x - 4} cy={y - 2} r="2" fill="#3b2f4a" />
        <circle cx={x + 4} cy={y - 2} r="2" fill="#3b2f4a" />
        <path d={`M${x - 4},${y + 4} q4,${step === 2 ? -3 : 3} 8,0`} stroke="#3b2f4a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </motion.g>
    </motion.g>
  );
}

export function Germs({ step }: SceneProps) {
  const loop = useLoop();
  const water = step === 1 || step === 3;
  return (
    <svg viewBox={VIEW} className="h-full w-full" role="img" aria-label="Washing germs off a hand">
      <rect width="400" height="300" fill="#e6f7ff" />
      {/* tap */}
      <rect x="168" y="14" width="60" height="16" rx="6" fill="#9aa5b5" />
      <rect x="214" y="14" width="16" height="34" rx="6" fill="#9aa5b5" />
      {water && (
        <motion.line x1="222" y1="50" x2="222" y2="150" stroke="#4d96ff" strokeWidth="9" strokeLinecap="round" strokeDasharray="14 10" animate={{ strokeDashoffset: [0, -48] }} transition={loop({ duration: 0.6, ease: "linear" })} />
      )}

      {/* hand */}
      <motion.g animate={{ rotate: step === 2 ? [-5, 5, -5] : 0 }} transition={step === 2 ? loop({ duration: 0.4 }) : SPRING} style={pin(200, 180)}>
        <text x="200" y="244" textAnchor="middle" fontSize="170">🖐️</text>
      </motion.g>

      {GERMS.map(([x, y], i) => <Germ key={i} x={x} y={y} i={i} step={step} />)}

      {/* soap bubbles: they grow while scrubbing, then float off with the germs */}
      {BUBBLES.map(([x, y, r], i) => (
        <motion.circle key={i} cx={x} cy={y} fill="#ffffff" fillOpacity="0.75" stroke="#9fd0ff" strokeWidth="2" initial={false} animate={{ r: step === 2 ? r : 0, y: step === 2 ? [0, -6, 0] : step === 3 ? 140 : 0, opacity: step === 3 ? 0 : 1 }} transition={step === 2 ? loop({ duration: 1.4, delay: i * 0.1 }) : { duration: 1.2 }} />
      ))}
      {step === 2 && (
        <>
          <text x="58" y="80" textAnchor="middle" fontSize="54">🧼</text>
          <circle cx="342" cy="52" r="26" fill="none" stroke="#c9dff5" strokeWidth="7" />
          <g transform="rotate(-90 342 52)">
            <motion.circle cx="342" cy="52" r="26" fill="none" stroke="#4d96ff" strokeWidth="7" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 20, ease: "linear" }} />
          </g>
          <text x="342" y="58" textAnchor="middle" fontSize="18" fontWeight="800" fill="#3b2f4a">20</text>
          <text x="342" y="96" textAnchor="middle" fontSize="14" fontWeight="800" fill="#3b2f4a">seconds</text>
        </>
      )}
      {step === 4 && (
        <>
          {[[120, 110], [290, 120], [250, 80], [140, 230]].map(([x, y], i) => (
            <motion.text key={i} x={x} y={y} textAnchor="middle" fontSize="30" animate={{ scale: [0.6, 1.2, 0.6], opacity: [0.4, 1, 0.4] }} transition={loop({ duration: 1.4, delay: i * 0.3 })} style={pin(x, y - 10)}>✨</motion.text>
          ))}
          <motion.text x="200" y="284" textAnchor="middle" fontSize="26" fontWeight="800" fill="#3b2f4a" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING} style={pin(200, 276)}>Clean hands! 😄</motion.text>
        </>
      )}
    </svg>
  );
}
