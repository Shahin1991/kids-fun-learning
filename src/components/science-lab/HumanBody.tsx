"use client";

import { motion } from "framer-motion";
import { audioManager } from "@/lib/audio/AudioManager";
import { SPRING, VIEW, pin, useLoop, type SceneProps } from "./types";

const HEART = "M0,34 C-62,-6 -42,-58 0,-26 C42,-58 62,-6 0,34 Z";
const SKIN = "#ffd9b8";
const LINE = "#c98f65";

/** The small body with tappable organs on the left, and the chosen organ blown up with its job on the right. */
export function HumanBody({ step, go }: SceneProps) {
  const loop = useLoop();
  const dim = (n: number) => (step === 0 || step === n ? 1 : 0.28);
  const pick = (n: number) => {
    audioManager.playPop(n);
    go(n);
  };
  const organ = (n: number, cx: number, cy: number) => (
    <circle cx={cx} cy={cy} r={24} fill="transparent" className="cursor-pointer" onClick={() => pick(n)} aria-label={["", "Brain", "Heart", "Lungs", "Tummy"][n]} role="button" />
  );
  const bodyBreath = loop({ duration: 4 });

  return (
    <svg viewBox={VIEW} className="h-full w-full" role="img" aria-label="A human body and the organ you are learning about">
      <rect width="400" height="300" fill="#fdf6e3" />
      <motion.g animate={{ scale: [1, 1.025, 1] }} transition={bodyBreath} style={pin(110, 150)}>
        {/* arms and legs */}
        <g stroke={SKIN} strokeWidth="17" strokeLinecap="round">
          <line x1="76" y1="92" x2="48" y2="156" />
          <line x1="144" y1="92" x2="172" y2="156" />
          <line x1="96" y1="190" x2="92" y2="268" strokeWidth="21" />
          <line x1="124" y1="190" x2="128" y2="268" strokeWidth="21" />
        </g>
        <rect x="72" y="74" width="76" height="124" rx="34" fill={SKIN} stroke={LINE} strokeWidth="2" />
        <circle cx="110" cy="42" r="30" fill={SKIN} stroke={LINE} strokeWidth="2" />
        <circle cx="99" cy="48" r="2.6" fill="#3b2f4a" />
        <circle cx="121" cy="48" r="2.6" fill="#3b2f4a" />
        <path d="M101,58 Q110,66 119,58" stroke="#3b2f4a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {/* organs, small */}
        <motion.ellipse cx="110" cy="30" rx="18" ry="11" fill="#ff9ab8" animate={{ opacity: dim(1), scale: step === 1 ? [1, 1.12, 1] : 1 }} transition={step === 1 ? loop({ duration: 1.2 }) : SPRING} />
        <motion.g animate={{ opacity: dim(3) }}>
          <motion.ellipse cx="94" cy="118" rx="13" ry="23" fill="#8fd3f4" animate={{ scaleY: step === 3 ? [1, 1.18, 1] : 1 }} transition={step === 3 ? loop({ duration: 4 }) : SPRING} />
          <motion.ellipse cx="126" cy="118" rx="13" ry="23" fill="#8fd3f4" animate={{ scaleY: step === 3 ? [1, 1.18, 1] : 1 }} transition={step === 3 ? loop({ duration: 4 }) : SPRING} />
        </motion.g>
        <motion.path d={HEART} fill="#ff4d6d" transform="translate(112 132) scale(0.3)" animate={{ opacity: dim(2) }} />
        <motion.ellipse cx="122" cy="166" rx="15" ry="9" fill="#ffa94d" transform="rotate(20 122 166)" animate={{ opacity: dim(4) }} />
        {organ(1, 110, 32)}
        {organ(2, 112, 134)}
        {organ(3, 100, 110)}
        {organ(4, 122, 166)}
      </motion.g>
      {/* magnifier bubble */}
      <circle cx="288" cy="150" r="104" fill="#ffffff" stroke="#e5d9bd" strokeWidth="6" />
      <g transform="translate(288 150)">
        {step === 0 && <text textAnchor="middle" y="18" fontSize="64">👆</text>}
        {step === 1 && <BigBrain />}
        {step === 2 && <BigHeart />}
        {step === 3 && <BigLungs />}
        {step === 4 && <BigTummy />}
      </g>
    </svg>
  );
}

function BigBrain() {
  const loop = useLoop();
  const zig = ["M0,0 L24,-30 L40,-10 L66,-44", "M0,10 L30,26 L52,10 L78,34", "M-10,0 L-34,-28 L-50,-8 L-74,-40"];
  return (
    <g>
      <motion.g animate={{ scale: [1, 1.07, 1] }} transition={loop({ duration: 1.6 })}>
        <ellipse cx="-24" cy="0" rx="40" ry="46" fill="#ff9ab8" stroke="#e0709a" strokeWidth="3" />
        <ellipse cx="24" cy="0" rx="40" ry="46" fill="#ffb3cb" stroke="#e0709a" strokeWidth="3" />
        <path d="M-40,-20 Q-24,-8 -40,6 M-18,-30 Q-4,-14 -20,0 M20,-30 Q6,-12 22,2 M40,-14 Q26,0 42,16 M-30,20 Q-10,30 -28,38 M18,24 Q36,32 22,40" stroke="#e0709a" strokeWidth="3" fill="none" strokeLinecap="round" />
      </motion.g>
      {zig.map((d, i) => (
        <motion.path key={d} d={d} transform={`translate(${i === 2 ? -10 : 10} ${i === 1 ? 20 : -10})`} stroke="#ffd43b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" initial={{ pathLength: 0, opacity: 1 }} animate={{ pathLength: [0, 1, 1], opacity: [1, 1, 0] }} transition={loop({ duration: 1.4, delay: i * 0.45, ease: "linear" })} />
      ))}
    </g>
  );
}

function BigHeart() {
  const loop = useLoop();
  // lub-dub: two quick beats then a rest
  const beat = loop({ duration: 1.1, times: [0, 0.12, 0.24, 0.36, 1], ease: "easeOut" });
  return (
    <g>
      {[0, 1].map((i) => (
        <motion.circle key={i} r="50" fill="none" stroke="#ff4d6d" strokeWidth="4" initial={{ scale: 0.8, opacity: 0.6 }} animate={{ scale: 2, opacity: 0 }} transition={loop({ duration: 1.1, delay: i * 0.55, ease: "easeOut" })} />
      ))}
      <motion.path d={HEART} fill="#ff4d6d" stroke="#d6264a" strokeWidth="4" initial={{ scale: 0.85 }} animate={{ scale: [0.85, 1.02, 0.88, 0.97, 0.85] }} transition={beat} style={pin(0, 0)} />
      <text textAnchor="middle" y="-62" fontSize="22" fontWeight="800" fill="#d6264a">lub-dub</text>
      {[0, 1, 2].map((i) => (
        <motion.circle key={`d${i}`} r="7" fill="#ff4d6d" initial={{ x: -86, y: 70 }} animate={{ x: [-86, 0, 86], y: [70, 82, 70], opacity: [0, 1, 0] }} transition={loop({ duration: 3, delay: i, ease: "linear" })} />
      ))}
    </g>
  );
}

function BigLungs() {
  const loop = useLoop();
  const t = loop({ duration: 4 });
  return (
    <g>
      <path d="M0,-80 L0,-20 M0,-20 L-26,10 M0,-20 L26,10" stroke="#d9a07a" strokeWidth="9" strokeLinecap="round" fill="none" />
      <motion.ellipse cx="-42" cy="12" rx="32" ry="52" fill="#8fd3f4" stroke="#4fa8d8" strokeWidth="4" animate={{ scaleX: [0.88, 1.12, 0.88], scaleY: [0.9, 1.1, 0.9] }} transition={t} style={pin(-42, 12)} />
      <motion.ellipse cx="42" cy="12" rx="32" ry="52" fill="#8fd3f4" stroke="#4fa8d8" strokeWidth="4" animate={{ scaleX: [0.88, 1.12, 0.88], scaleY: [0.9, 1.1, 0.9] }} transition={t} style={pin(42, 12)} />
      {[0, 1, 2].map((i) => (
        <motion.circle key={i} cx={(i - 1) * 8} r="5" fill="#ffffff" stroke="#4fa8d8" strokeWidth="2" initial={{ y: -92, opacity: 0 }} animate={{ y: [-92, -20, -20], opacity: [0, 1, 0] }} transition={loop({ duration: 4, delay: i * 0.25, times: [0, 0.5, 0.52], ease: "linear" })} />
      ))}
      <motion.text textAnchor="middle" y="-96" fontSize="20" fontWeight="800" fill="#4fa8d8" animate={{ opacity: [1, 1, 0, 0, 1] }} transition={loop({ duration: 4, times: [0, 0.45, 0.5, 0.95, 1], ease: "linear" })}>breathe in</motion.text>
    </g>
  );
}

function BigTummy() {
  const loop = useLoop();
  return (
    <g>
      <path d="M-4,-90 L-4,-42" stroke="#d9a07a" strokeWidth="14" strokeLinecap="round" />
      <motion.path d="M-14,-44 C-60,-40 -70,30 -30,56 C10,80 66,52 62,12 C58,-18 30,-14 12,-28 C4,-34 6,-46 -4,-44 Z" fill="#ffa94d" stroke="#e8790c" strokeWidth="4" animate={{ scaleX: [1, 1.07, 0.95, 1], scaleY: [1, 0.93, 1.06, 1] }} transition={loop({ duration: 1.6 })} style={pin(0, 10)} />
      {["🍎", "🥕", "🍞"].map((e, i) => (
        <motion.text key={e} textAnchor="middle" fontSize="26" initial={{ y: -92, x: -4, scale: 1, opacity: 0 }} animate={{ y: [-92, -40, 14], x: [-4, -4, 10 + i * 6], scale: [1, 1, 0.3], opacity: [0, 1, 0] }} transition={loop({ duration: 3.2, delay: i * 1.05, ease: "linear" })}>{e}</motion.text>
      ))}
    </g>
  );
}
