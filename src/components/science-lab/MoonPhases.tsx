"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { audioManager } from "@/lib/audio/AudioManager";
import { litPath, phaseName } from "@/lib/science-lab/moon";
import { VIEW, pin, useLoop, type SceneProps } from "./types";

/** Phase angle for each step. */
const ANGLE = [0, 50, 90, 180, 270];
const CX = 110;
const CY = 150;
const R = 76;
const BIG = { x: 296, y: 150, r: 74 };

/** The moon circles the Earth in the Sun's light; the big moon shows what we see from Earth. Drag the moon round its orbit to try every phase. */
export function MoonPhases({ step }: SceneProps) {
  const loop = useLoop();
  const reduced = useAppReducedMotion();
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const [dragged, setDragged] = useState(false);
  // the phase name follows the step until the child drags the moon somewhere else
  const [drag, setDrag] = useState<{ step: number; name: string } | null>(null);
  const label = drag?.step === step ? drag.name : phaseName(ANGLE[step]);
  // one angle drives both pictures, so the moon travels round its orbit while the big moon's shape changes
  const angle = useMotionValue(ANGLE[step]);
  // new moon sits between us and the Sun (left); full moon is on the far side (right)
  const mx = useTransform(angle, (a) => CX - R * Math.cos((a * Math.PI) / 180));
  const my = useTransform(angle, (a) => CY - R * Math.sin((a * Math.PI) / 180));
  const lit = useTransform(angle, (a) => litPath(a, BIG.r) || "M0,0");

  useEffect(() => {
    const c = animate(angle, ANGLE[step], reduced ? { duration: 0 } : { duration: 1.4, ease: "easeInOut" });
    return () => c.stop();
  }, [angle, step, reduced]);

  const move = (e: PointerEvent) => {
    if (!dragging.current || !svg.current) return;
    const r = svg.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 400;
    const y = ((e.clientY - r.top) / r.height) * 300;
    const a = (Math.atan2(CY - y, CX - x) * 180) / Math.PI;
    const deg = (a + 360) % 360;
    angle.set(deg);
    const name = phaseName(deg);
    if (name !== label) {
      setDrag({ step, name });
      audioManager.playPop(name === "Full moon" ? 3 : 1);
    }
  };
  const end = () => {
    if (!dragging.current) return;
    dragging.current = false;
    audioManager.speak(label);
  };

  return (
    <svg ref={svg} viewBox={VIEW} className="h-full w-full" role="img" aria-label="The moon going around the Earth, and the shape we see" onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      <rect width="400" height="300" fill="#141a4a" />
      {Array.from({ length: 22 }, (_, i) => (
        <motion.circle key={i} cx={(i * 83) % 400} cy={(i * 47) % 300} r={1 + (i % 3) * 0.6} fill="#ffffff" animate={{ opacity: [0.3, 1, 0.3] }} transition={loop({ duration: 2 + (i % 4), delay: (i % 5) * 0.4 })} />
      ))}

      {/* sunlight comes from the left */}
      <text x="8" y="40" fontSize="30">☀️</text>
      {[80, 150, 220].map((y, i) => (
        <motion.line key={y} x1="30" x2="60" y1={y} y2={y} stroke="#ffd43b" strokeWidth="4" strokeLinecap="round" strokeDasharray="8 10" animate={{ strokeDashoffset: [0, -36] }} transition={loop({ duration: 1.4, delay: i * 0.2, ease: "linear" })} />
      ))}

      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#6f7bd6" strokeWidth="2" strokeDasharray="6 8" />
      <motion.g animate={{ rotate: 360 }} transition={loop({ duration: 20, ease: "linear" })} style={pin(CX, CY)}>
        <circle cx={CX} cy={CY} r="26" fill="#4d96ff" />
        <path d="M96,142 q10,-14 22,-4 q4,10 -8,16 q-14,0 -14,-12 Z" fill="#6bcb77" />
      </motion.g>

      {/* small moon: sunny half always faces the Sun */}
      <motion.g style={{ x: mx, y: my }}>
        <circle r="13" fill="#4a4f7a" />
        <path d="M0,-13 A13,13 0 0 0 0,13 Z" fill="#f4f1de" />
        {!dragged && <motion.circle r="19" fill="none" stroke="#ffd43b" strokeWidth="2.5" animate={{ scale: [1, 1.35, 1], opacity: [0.9, 0.2, 0.9] }} transition={loop({ duration: 1.6 })} />}
        {/* big grab handle for small fingers */}
        <circle
          r="30" fill="transparent" className="cursor-grab" style={{ touchAction: "none" }}
          role="slider" aria-label="Moon position" aria-valuetext={label}
          onPointerDown={(e) => {
            dragging.current = true;
            setDragged(true);
            (e.target as Element).setPointerCapture(e.pointerId);
          }}
        />
      </motion.g>

      {/* what we see */}
      <circle cx={BIG.x} cy={BIG.y} r={BIG.r} fill="#2a2f66" stroke="#4a4f9a" strokeWidth="3" />
      <motion.path d={lit} transform={`translate(${BIG.x} ${BIG.y})`} fill="#f4f1de" />
      <text x={BIG.x} y="64" textAnchor="middle" fontSize="16" fontWeight="800" fill="#8f98d8">what we see</text>
      <text x={BIG.x} y="258" textAnchor="middle" fontSize="20" fontWeight="800" fill="#cfd6ff">{label}</text>
      {!dragged && (
        <motion.text x={CX} y="286" textAnchor="middle" fontSize="17" fontWeight="800" fill="#ffd43b" animate={{ scale: [1, 1.08, 1] }} transition={loop({ duration: 1.2 })} style={pin(CX, 280)}>Drag the moon 👆</motion.text>
      )}
    </svg>
  );
}
