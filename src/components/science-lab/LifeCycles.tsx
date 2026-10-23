"use client";

import { motion } from "framer-motion";
import { VIEW, pin, useLoop, type SceneProps } from "./types";

/** Pills along the bottom naming each stage of the cycle; the current one lights up. */
function StageRow({ labels, step }: { labels: string[]; step: number }) {
  const w = 92;
  const x0 = (400 - labels.length * (w + 6) + 6) / 2;
  return (
    <g>
      {labels.map((l, i) => (
        <g key={l} transform={`translate(${x0 + i * (w + 6)} 266)`}>
          <motion.rect width={w} height="26" rx="13" initial={false} animate={{ fill: i === step ? "#ffd43b" : "#ffffff", opacity: i === step ? 1 : 0.7 }} stroke="#3b2f4a" strokeOpacity="0.25" strokeWidth="2" />
          <text x={w / 2} y="18" textAnchor="middle" fontSize="14" fontWeight="800" fill="#3b2f4a">{l}</text>
        </g>
      ))}
    </g>
  );
}

export function Butterfly({ step }: SceneProps) {
  const loop = useLoop();
  const wing = (d: number) => (
    <g>
      <ellipse cx={200 + d * 38} cy="102" rx="40" ry="28" fill="#ff9f43" stroke="#d9691b" strokeWidth="3" transform={`rotate(${-d * 24} ${200 + d * 38} 102)`} />
      <ellipse cx={200 + d * 28} cy="138" rx="28" ry="22" fill="#ffd43b" stroke="#d9a000" strokeWidth="3" transform={`rotate(${d * 22} ${200 + d * 28} 138)`} />
      <circle cx={200 + d * 44} cy="98" r="7" fill="#3b2f4a" />
      <circle cx={200 + d * 30} cy="140" r="5" fill="#ff6b6b" />
    </g>
  );
  return (
    <svg viewBox={VIEW} className="h-full w-full" role="img" aria-label="The life cycle of a butterfly">
      <rect width="400" height="300" fill="#d8f3ff" />
      <rect y="232" width="400" height="68" fill="#8bd48f" />
      <ellipse cx="200" cy="214" rx="130" ry="26" fill="#4caf50" stroke="#3f9c4a" strokeWidth="3" />
      <path d="M90,214 H310" stroke="#3f9c4a" strokeWidth="3" />

      {step === 0 && (
        <motion.ellipse cx="200" cy="184" rx="8" ry="10" fill="#fff7d6" stroke="#e0cf94" strokeWidth="2" animate={{ scale: [1, 1.15, 1] }} transition={loop({ duration: 1.6 })} style={pin(200, 194)} />
      )}

      {step === 1 && (
        <motion.g animate={{ scale: [0.8, 1.2] }} transition={loop({ duration: 6, repeatType: "reverse" })} style={pin(200, 200)}>
          {Array.from({ length: 7 }, (_, i) => (
            <motion.circle key={i} cx={130 + i * 17} cy="196" r="11" fill={i % 2 ? "#a3e07a" : "#6bcb77"} stroke="#3f9c4a" strokeWidth="2" animate={{ y: [0, -9, 0] }} transition={loop({ duration: 1.2, delay: i * 0.12 })} />
          ))}
          <circle cx="249" cy="194" r="13" fill="#ff8787" stroke="#d6264a" strokeWidth="2" />
          <circle cx="253" cy="190" r="3" fill="#3b2f4a" />
          <path d="M250,196 q4,5 8,0" stroke="#3b2f4a" strokeWidth="2" fill="none" />
        </motion.g>
      )}

      {step === 2 && (
        <>
          <path d="M110,40 H290" stroke="#8b5a3c" strokeWidth="9" strokeLinecap="round" />
          <motion.g animate={{ rotate: [-4, 4, -4] }} transition={loop({ duration: 3 })} style={pin(200, 40)}>
            <path d="M200,40 V78" stroke="#6bcb77" strokeWidth="3" />
            <ellipse cx="200" cy="116" rx="17" ry="38" fill="#7bc96f" stroke="#4a9b45" strokeWidth="3" />
            {[96, 112, 128].map((y) => <circle key={y} cx="200" cy={y} r="3" fill="#ffd43b" />)}
          </motion.g>
        </>
      )}

      {step === 3 && (
        <motion.g animate={{ x: [0, 70, 0, -70, 0], y: [0, -26, -6, -26, 0] }} transition={loop({ duration: 7 })}>
          <motion.g animate={{ scaleX: [1, 0.25, 1] }} transition={loop({ duration: 0.5 })} style={pin(200, 120)}>
            {wing(-1)}
            {wing(1)}
          </motion.g>
          <ellipse cx="200" cy="120" rx="5" ry="28" fill="#3b2f4a" />
          <path d="M197,94 q-8,-16 -16,-18 M203,94 q8,-16 16,-18" stroke="#3b2f4a" strokeWidth="2" fill="none" />
        </motion.g>
      )}
      <StageRow labels={["Egg", "Caterpillar", "Chrysalis", "Butterfly"]} step={step} />
    </svg>
  );
}

function Tadpole({ legs }: { legs: boolean }) {
  const loop = useLoop();
  return (
    <motion.g animate={{ y: [0, -8, 0] }} transition={loop({ duration: 2.4 })}>
      <motion.g animate={{ rotate: [-12, 12, -12] }} transition={loop({ duration: 0.5 })} style={pin(186, 190)}>
        <path d={legs ? "M186,190 q-14,-8 -26,0" : "M186,190 q-20,-12 -40,0 t-36,0"} stroke="#3b4a3a" strokeWidth="8" strokeLinecap="round" fill="none" />
      </motion.g>
      <ellipse cx="204" cy="190" rx={legs ? 22 : 17} ry={legs ? 16 : 12} fill={legs ? "#4f7f4a" : "#3b4a3a"} />
      <circle cx="212" cy="184" r="3.5" fill="#fff" />
      {legs && (
        <g fill="#4f7f4a" stroke="#355a31" strokeWidth="2">
          <ellipse cx="190" cy="206" rx="9" ry="5" transform="rotate(30 190 206)" />
          <ellipse cx="206" cy="208" rx="8" ry="4" transform="rotate(-10 206 208)" />
        </g>
      )}
    </motion.g>
  );
}

export function Frog({ step }: SceneProps) {
  const loop = useLoop();
  const S = 110;
  return (
    <svg viewBox={VIEW} className="h-full w-full" role="img" aria-label="The life cycle of a frog">
      <rect width="400" height="300" fill="#d8f3ff" />
      <rect y={S} width="400" height={300 - S} fill="#5bb8f0" />
      <motion.path d={`M0,${S} q12,-7 24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0 t24,0`} stroke="#fff" strokeWidth="3" fill="none" animate={{ x: [0, -24] }} transition={loop({ duration: 1.6, ease: "linear" })} />
      <rect y="276" width="400" height="24" fill="#8b6b4a" />
      {[60, 340].map((x) => (
        <motion.path key={x} d={`M${x},276 q-8,-30 0,-60 M${x + 10},276 q6,-24 -2,-48`} stroke="#3f9c4a" strokeWidth="6" strokeLinecap="round" fill="none" animate={{ rotate: [-4, 4, -4] }} transition={loop({ duration: 3 })} style={pin(x, 276)} />
      ))}

      {step === 0 &&
        Array.from({ length: 14 }, (_, i) => {
          const x = 164 + (i % 5) * 18 + (Math.floor(i / 5) % 2) * 9;
          const y = 170 + Math.floor(i / 5) * 16;
          return (
            <motion.g key={i} animate={{ y: [0, -4, 0] }} transition={loop({ duration: 2.2, delay: i * 0.15 })}>
              <circle cx={x} cy={y} r="11" fill="#e8fbff" fillOpacity="0.8" stroke="#b6e6f5" strokeWidth="2" />
              <circle cx={x} cy={y} r="4" fill="#3b2f4a" />
            </motion.g>
          );
        })}
      {(step === 1 || step === 2) && (
        <>
          <Tadpole legs={step === 2} />
          {[130, 270, 230].map((x, i) => (
            <motion.circle key={x} cx={x} r="5" fill="#fff" fillOpacity="0.7" stroke="#b6e6f5" strokeWidth="2" initial={{ y: 250 }} animate={{ y: [250, 130], opacity: [0, 1, 0] }} transition={loop({ duration: 3, delay: i, ease: "easeOut" })} />
          ))}
        </>
      )}
      {step === 3 && (
        <>
          <ellipse cx="200" cy={S + 4} rx="74" ry="14" fill="#4caf50" stroke="#3f9c4a" strokeWidth="3" />
          <motion.g animate={{ y: [0, -2, 0] }} transition={loop({ duration: 2 })}>
            <ellipse cx="200" cy={S - 26} rx="38" ry="28" fill="#5cc468" stroke="#3f9c4a" strokeWidth="3" />
            <ellipse cx="200" cy={S - 12} rx="22" ry="12" fill="#c9f2c0" />
            <motion.ellipse cx="200" cy={S - 12} rx="14" ry="8" fill="#e8ffe0" animate={{ scale: [1, 1.25, 1] }} transition={loop({ duration: 1 })} style={pin(200, S - 12)} />
            {[184, 216].map((x) => (
              <g key={x}>
                <circle cx={x} cy={S - 50} r="11" fill="#5cc468" stroke="#3f9c4a" strokeWidth="3" />
                <circle cx={x} cy={S - 50} r="7" fill="#fff" />
                <circle cx={x + 1} cy={S - 50} r="3.5" fill="#3b2f4a" />
              </g>
            ))}
            <path d={`M182,${S - 30} Q200,${S - 18} 218,${S - 30}`} stroke="#3f9c4a" strokeWidth="3" fill="none" strokeLinecap="round" />
          </motion.g>
          <motion.text x="310" y="52" textAnchor="middle" fontSize="26" animate={{ y: [52, 46, 52], opacity: [1, 1, 0, 0, 1] }} transition={loop({ duration: 3.2, times: [0, 0.7, 0.74, 0.95, 1] })}>🪰</motion.text>
          <motion.path d={`M214,${S - 30} L304,56`} stroke="#ff6b8b" strokeWidth="6" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: [0, 0, 1, 0, 0] }} transition={loop({ duration: 3.2, times: [0, 0.62, 0.72, 0.82, 1], ease: "easeOut" })} />
        </>
      )}
      <StageRow labels={["Eggs", "Tadpole", "Legs", "Frog"]} step={step} />
    </svg>
  );
}
