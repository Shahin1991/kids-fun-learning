"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { SPRING, VIEW, pin, useLoop, type SceneProps } from "./types";

// the wire loop
const L = 70;
const R = 330;
const T = 70;
const B = 230;
const W = R - L;
const H = B - T;
const PERIM = 2 * (W + H);

/** Point on the loop at fraction u (0..1), going clockwise from the top-left corner. */
function onLoop(u: number): [number, number] {
  let d = (((u % 1) + 1) % 1) * PERIM;
  if (d < W) return [L + d, T];
  d -= W;
  if (d < H) return [R, T + d];
  d -= H;
  if (d < W) return [R - d, B];
  d -= W;
  return [L, B - d];
}

/** Keyframes that carry one dot all the way round the loop, starting `offset` of the way along. */
function lap(offset: number) {
  const pts = Array.from({ length: 49 }, (_, i) => onLoop(offset + i / 48));
  return { x: pts.map((p) => p[0]), y: pts.map((p) => p[1]) };
}

const TESTERS = [
  { e: "🔑", ok: true, say: "Metal key: electricity flows" },
  { e: "🪵", ok: false, say: "Wood: electricity is blocked" },
  { e: "🪙", ok: true, say: "Metal coin: electricity flows" },
  { e: "🧸", ok: false, say: "Toy: electricity is blocked" },
];

export function Electricity({ step }: SceneProps) {
  const loop = useLoop();
  const [on, setOn] = useState(true);
  const [idx, setIdx] = useState(0);
  // bumps on every test so testing the same thing twice still drops it in again
  const [tries, setTries] = useState(0);
  // the testers cycle by themselves until the child picks one
  const [picked, setPicked] = useState(false);

  useEffect(() => {
    if (step !== 2 || picked) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % TESTERS.length), 2600);
    return () => clearInterval(t);
  }, [step, picked]);

  const test = (i: number) => {
    setPicked(true);
    setIdx(i);
    setTries((n) => n + 1);
    audioManager.speak(TESTERS[i].say);
  };

  if (step === 3) return <Static />;
  if (step === 4) return <Safety />;

  const tester = TESTERS[idx];
  const closed = step === 0 ? true : step === 1 ? on : tester.ok;
  const dots = Array.from({ length: 10 }, (_, i) => lap(i / 10));

  return (
    <svg viewBox={VIEW} className="h-full w-full" role="img" aria-label="A battery, a bulb and a switch in a loop of wire">
      <rect width="400" height="300" fill="#fff8e1" />
      {/* wire */}
      <rect x={L} y={T} width={W} height={H} rx="6" fill="none" stroke="#7a5c3c" strokeWidth="7" />

      {/* flowing charge */}
      {closed &&
        dots.map((k, i) => (
          <motion.circle key={i} r="5" fill="#ffd43b" stroke="#f2a900" strokeWidth="1.5" initial={{ x: k.x[0], y: k.y[0] }} animate={{ x: k.x, y: k.y }} transition={loop({ duration: 5, ease: "linear" })} />
        ))}

      {/* battery */}
      <rect x={L - 20} y="118" width="40" height="64" rx="6" fill="#6bcb77" stroke="#3f9c4a" strokeWidth="3" />
      <rect x={L - 8} y="110" width="16" height="10" rx="2" fill="#3f9c4a" />
      <text x={L} y="142" textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff">+</text>
      <text x={L} y="172" textAnchor="middle" fontSize="26" fontWeight="800" fill="#fff">−</text>

      {/* bulb */}
      <motion.circle cx="200" cy={T - 6} r="46" fill="#ffe14d" initial={false} animate={{ opacity: closed ? [0.25, 0.5, 0.25] : 0 }} transition={closed ? loop({ duration: 1.6 }) : { duration: 0.2 }} />
      <rect x="188" y={T + 8} width="24" height="14" rx="3" fill="#8a94a6" />
      <motion.circle cx="200" cy={T - 8} r="24" initial={false} animate={{ fill: closed ? "#ffe14d" : "#dfe6ee" }} stroke="#b9c3d0" strokeWidth="3" transition={{ duration: 0.25 }} />
      <path d="M190,66 q5,-12 10,0 q5,-12 10,0" stroke={closed ? "#f2a900" : "#9aa5b5"} strokeWidth="2.5" fill="none" />
      {closed && (
        <motion.g key={`rays-${step}-${on}-${idx}-${tries}`} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: [0.6, 1.15, 1], opacity: 1 }} transition={{ duration: 0.4 }} style={pin(200, T - 8)}>
          <motion.g animate={{ opacity: [0.5, 1, 0.5] }} transition={loop({ duration: 1.2 })}>
            {[-70, -40, 0, 40, 70, 110, -110].map((a) => (
              <line key={a} x1="200" y1={T - 42} x2="200" y2={T - 52} stroke="#f2a900" strokeWidth="4" strokeLinecap="round" transform={`rotate(${a} 200 ${T - 8})`} />
            ))}
          </motion.g>
        </motion.g>
      )}

      {/* switch or the thing being tested sits in the gap on the bottom wire */}
      <rect x="168" y={B - 10} width="64" height="20" fill="#fff8e1" />
      {step === 2 ? (
        <>
          <circle cx="170" cy={B} r="5" fill="#3b2f4a" />
          <circle cx="230" cy={B} r="5" fill="#3b2f4a" />
          {TESTERS.map((it, i) => {
            const x = 125 + i * 50;
            const cur = i === idx;
            return (
              <g key={it.e} className="cursor-pointer" onClick={() => test(i)} role="button" aria-label={`Test the ${it.say.split(":")[0].toLowerCase()}`}>
                <motion.rect x={x - 21} y="128" width="42" height="44" rx="10" initial={false} animate={{ fill: cur ? "#ffe9a8" : "#ffffff" }} stroke="#e5d9bd" strokeWidth="2" />
                <text x={x} y="151" textAnchor="middle" dominantBaseline="central" fontSize="26" opacity={cur ? 0.35 : 1}>{it.e}</text>
                <rect x={x - 25} y="120" width="50" height="60" fill="transparent" />
              </g>
            );
          })}
          {!picked && <motion.text x="200" y="112" textAnchor="middle" fontSize="16" fontWeight="800" fill="#3b2f4a" animate={{ scale: [1, 1.1, 1] }} transition={loop({ duration: 1.2 })} style={pin(200, 106)}>Tap one to test it 👆</motion.text>}
          <motion.text key={`${idx}-${tries}`} x="200" y={B + 12} textAnchor="middle" fontSize="34" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={SPRING} onAnimationStart={() => audioManager.playPop(tester.ok ? 3 : 0)}>{tester.e}</motion.text>
          <text x="200" y="274" textAnchor="middle" fontSize="20" fontWeight="800" fill="#3b2f4a">{tester.say} {tester.ok ? "✅" : "❌"}</text>
        </>
      ) : (
        <>
          <circle cx="170" cy={B} r="6" fill="#3b2f4a" />
          <circle cx="230" cy={B} r="6" fill="#3b2f4a" />
          <motion.line x1="170" y1={B} x2="230" y2={B} stroke="#3b2f4a" strokeWidth="7" strokeLinecap="round" initial={false} animate={{ rotate: closed ? 0 : -32 }} transition={SPRING} style={pin(170, B)} />
          {step === 1 && (
            <>
              <circle cx="200" cy={B} r="44" fill="transparent" className="cursor-pointer" onClick={() => { audioManager.playPop(on ? 0 : 3); setOn((v) => !v); }} role="button" aria-label={on ? "Turn the switch off" : "Turn the switch on"} />
              <motion.text x="200" y="272" textAnchor="middle" fontSize="22" fontWeight="800" fill="#3b2f4a" animate={{ scale: [1, 1.1, 1] }} transition={loop({ duration: 1.2 })} style={pin(200, 266)}>Tap the switch 👆</motion.text>
            </>
          )}
        </>
      )}
    </svg>
  );
}

/** A balloon rubbed on hair, then stuck to the wall by its charge. */
function Static() {
  const loop = useLoop();
  const t = loop({ duration: 7, times: [0, 0.4, 0.55, 0.9, 1], ease: "easeInOut" });
  return (
    <svg viewBox={VIEW} className="h-full w-full" role="img" aria-label="A child rubbing a balloon on their hair, then the balloon sticking to the wall">
      <rect width="400" height="300" fill="#fff8e1" />
      <rect x="330" width="70" height="300" fill="#e9d8b8" />
      <rect y="262" width="400" height="38" fill="#e8d3b0" />
      <text x="90" y="222" textAnchor="middle" fontSize="110">🧒</text>
      <motion.g animate={{ x: [-20, 2, -20, 2, 80, 152], y: [-10, -6, -10, -6, -20, -20], rotate: [0, 12, 0, 12, 0, 0] }} transition={loop({ duration: 7, times: [0, 0.14, 0.28, 0.4, 0.55, 1], ease: "easeInOut" })} style={pin(150, 130)}>
        <ellipse cx="150" cy="140" rx="26" ry="32" fill="#ff6b6b" stroke="#d6264a" strokeWidth="3" />
        <path d="M150,172 q-6,14 4,26" stroke="#3b2f4a" strokeWidth="2" fill="none" />
        {[[-10, -8], [8, -14], [10, 6], [-12, 10], [0, 0], [-2, 18]].map(([dx, dy], i) => (
          <motion.text key={i} x={150 + dx} y={142 + dy} textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff" initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 1, 1, 1, 1] }} transition={loop({ duration: 7, times: [0, 0.05 + i * 0.04, 0.3, 0.55, 0.9, 1], ease: "linear" })}>−</motion.text>
        ))}
      </motion.g>
      <motion.text x="96" y="70" textAnchor="middle" fontSize="40" animate={{ opacity: [1, 1, 0, 0, 0] }} transition={t}>✨</motion.text>
      {[60, 110, 160, 210].map((y) => (
        <text key={y} x="352" y={y} fontSize="18" fontWeight="800" fill="#4d96ff">+</text>
      ))}
    </svg>
  );
}

/** A socket with a clear stop sign; no scary detail. */
function Safety() {
  const loop = useLoop();
  return (
    <svg viewBox={VIEW} className="h-full w-full" role="img" aria-label="Never touch sockets or wires, and ask a grown-up">
      <rect width="400" height="300" fill="#fff0f0" />
      <rect x="130" y="80" width="140" height="140" rx="22" fill="#ffffff" stroke="#c9ced6" strokeWidth="5" />
      <rect x="165" y="125" width="14" height="38" rx="4" fill="#3b2f4a" />
      <rect x="221" y="125" width="14" height="38" rx="4" fill="#3b2f4a" />
      <circle cx="200" cy="186" r="7" fill="#3b2f4a" />
      <motion.g animate={{ scale: [1, 1.12, 1] }} transition={loop({ duration: 1.4 })} style={pin(200, 150)}>
        <circle cx="200" cy="150" r="96" fill="none" stroke="#ff4d4d" strokeWidth="16" />
        <line x1="132" y1="218" x2="268" y2="82" stroke="#ff4d4d" strokeWidth="16" strokeLinecap="round" />
      </motion.g>
      <text x="62" y="62" fontSize="38">💧</text>
      <text x="318" y="62" fontSize="38">✋</text>
      <text x="200" y="272" textAnchor="middle" fontSize="26" fontWeight="800" fill="#3b2f4a">Ask a grown-up 🧑</text>
    </svg>
  );
}
