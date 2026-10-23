"use client";

import { motion } from "framer-motion";
import { useRef, useState, type PointerEvent } from "react";
import { VIEW, pin, useLoop, type SceneProps } from "./types";

const OBJ_X = 170;
const WALL_X = 250;
const MID_Y = 150;
const OBJ_H = 44;
const RAINBOW = ["#ff4d4d", "#ff9f43", "#ffd93d", "#6bcb77", "#4d96ff", "#5b4dff", "#a24dff"];

function Torch({ x }: { x: number }) {
  const loop = useLoop();
  return (
    <g>
      <motion.circle cx={x + 16} cy={MID_Y} r="26" fill="#ffe14d" animate={{ opacity: [0.25, 0.5, 0.25] }} transition={loop({ duration: 1.6 })} />
      <rect x={x - 42} y={MID_Y - 10} width="40" height="20" rx="5" fill="#7d8aa0" />
      <path d={`M${x - 2},${MID_Y - 14} L${x + 16},${MID_Y - 24} L${x + 16},${MID_Y + 24} L${x - 2},${MID_Y + 14} Z`} fill="#ffe14d" stroke="#c99a00" strokeWidth="2" />
    </g>
  );
}

/** A torch, a toy and a wall: rays, a shadow that grows as the torch gets close, and a prism. */
export function Light({ step }: SceneProps) {
  const loop = useLoop();
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const [dragX, setDragX] = useState(70);
  const tx = step === 2 ? dragX : 60;
  const wallX = step === 3 ? 330 : WALL_X;

  const move = (e: PointerEvent) => {
    if (!dragging.current || !svg.current) return;
    const r = svg.current.getBoundingClientRect();
    setDragX(Math.max(50, Math.min(110, ((e.clientX - r.left) / r.width) * 400)));
  };

  // the shadow is the toy scaled up from the torch, onto the wall
  const f = (wallX - tx) / (OBJ_X - tx);
  const lens = tx + 16;
  const shadowH = OBJ_H * f;

  return (
    <svg ref={svg} viewBox={VIEW} className="h-full w-full touch-none" role="img" aria-label="A torch, a toy and its shadow on the wall" onPointerMove={move} onPointerUp={() => (dragging.current = false)} onPointerCancel={() => (dragging.current = false)}>
      <defs>
        <clipPath id="light-wall"><rect x={wallX} y="0" width={400 - wallX} height="300" /></clipPath>
      </defs>
      <rect width="400" height="300" fill="#1f1d4a" />
      <rect x={wallX} width={400 - wallX} height="300" fill={step === 3 ? "#f1ecd9" : "#fff3b0"} />

      {/* rays */}
      {step === 0 &&
        [-90, -45, 0, 45, 90].map((dy, i) => (
          <motion.line key={dy} x1={lens} y1={MID_Y} x2={wallX} y2={MID_Y + dy * 1.4} stroke="#ffe14d" strokeWidth="4" strokeLinecap="round" strokeDasharray="12 12" animate={{ strokeDashoffset: [0, -48] }} transition={loop({ duration: 1.3, delay: i * 0.1, ease: "linear" })} />
        ))}
      {(step === 1 || step === 2) &&
        [-1, 1].map((d) => (
          <motion.line key={d} x1={lens} y1={MID_Y} x2={wallX} y2={MID_Y + d * shadowH / 2} stroke="#ffe14d" strokeWidth="3" strokeLinecap="round" strokeDasharray="10 10" animate={{ strokeDashoffset: [0, -40] }} transition={loop({ duration: 1.2, ease: "linear" })} />
        ))}

      {/* toy and its shadow */}
      {(step === 1 || step === 2) && (
        <>
          <text x={OBJ_X} y={MID_Y} textAnchor="middle" dominantBaseline="central" fontSize={OBJ_H}>🧸</text>
          <g clipPath="url(#light-wall)">
            <text textAnchor="middle" dominantBaseline="central" fontSize={OBJ_H} transform={`translate(${(wallX + 400) / 2} ${MID_Y}) scale(${f})`} style={{ filter: "brightness(0)" }} opacity="0.8">🧸</text>
          </g>
        </>
      )}

      {/* prism and rainbow */}
      {step === 3 && (
        <>
          <line x1={lens} y1={MID_Y} x2="178" y2={MID_Y} stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
          <polygon points="200,98 158,192 242,192" fill="#bfeaff" fillOpacity="0.55" stroke="#e6f7ff" strokeWidth="3" />
          {RAINBOW.map((c, i) => (
            <g key={c}>
              <motion.line x1="222" y1={MID_Y} x2={wallX} y2={96 + i * 14} stroke={c} strokeWidth="6" strokeLinecap="round" strokeDasharray="14 6" animate={{ strokeDashoffset: [0, -40] }} transition={loop({ duration: 1.4, ease: "linear" })} />
              <rect x={wallX} y={90 + i * 14} width={400 - wallX} height="14" fill={c} />
            </g>
          ))}
        </>
      )}

      <Torch x={tx} />
      {step === 2 && (
        <>
          <rect x="0" y="100" width="170" height="100" fill="transparent" className="cursor-grab" onPointerDown={(e) => { dragging.current = true; (e.target as Element).setPointerCapture(e.pointerId); move(e); }} role="slider" aria-label="Torch position" aria-valuemin={50} aria-valuemax={110} aria-valuenow={Math.round(dragX)} />
          <motion.text x="100" y="262" textAnchor="middle" fontSize="22" fontWeight="800" fill="#ffffff" animate={{ scale: [1, 1.1, 1] }} transition={loop({ duration: 1.2 })} style={pin(100, 256)}>Drag the torch 👆</motion.text>
        </>
      )}
    </svg>
  );
}
