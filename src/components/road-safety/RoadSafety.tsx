"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { ShakeOnWrong } from "@/components/ShakeOnWrong";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import { act, becomeSafe, CAR_LEN, CROSSING, crossingClear, moveLane, nextAction, QUIZ, roundKind, startCars, startCrossing, type Action, type Car, type CrossState, type Scene } from "@/lib/road-safety/road";

const MODULE_ID = "road-safety";
const CAR_COLORS = ["#ff6b6b", "#ffd93d", "#4d96ff", "#6bcb77", "#ff9f43", "#9b51e0"];
const PLACES = [
  { name: "school", emoji: "🏫" },
  { name: "the park", emoji: "🛝" },
  { name: "the shop", emoji: "🏪" },
  { name: "the ice-cream van", emoji: "🍦" },
  { name: "Grandma's house", emoji: "🏡" },
];
const LANE_Y = { far: 24, near: 39 };
const KID_Y = { start: 54, end: 7 };

type Light = "green" | "amber" | "red";

/** A side-on car facing right, CAR_LEN long, sitting on y = 0. */
function CarArt({ color }: { color: string }) {
  return (
    <g>
      <path d="M0.4 -1.6 L0.4 -3.6 Q0.4 -4.2 1 -4.2 L2.6 -4.2 L4 -6.4 L7.2 -6.4 L8.6 -4.2 L9.4 -4 Q9.8 -3.9 9.8 -3.4 L9.8 -1.6 Z" fill={color} stroke="rgba(0,0,0,0.35)" strokeWidth={0.3} />
      <path d="M4.3 -5.9 L5.5 -5.9 L5.5 -4.3 L3.3 -4.3 Z M6 -5.9 L7 -5.9 L8 -4.3 L6 -4.3 Z" fill="#cdeeff" />
      <circle cx={9.4} cy={-3.2} r={0.4} fill="#fff6a8" />
      {[2.4, 7.6].map((x) => (
        <g key={x}>
          <circle cx={x} cy={-1.4} r={1.3} fill="#222" />
          <circle cx={x} cy={-1.4} r={0.5} fill="#bbb" />
        </g>
      ))}
    </g>
  );
}

function intro(scene: Scene, place: string) {
  return scene === "lights" ? `Let's cross the road to ${place}. Press the button on the traffic light.` : `Let's cross to ${place} at the zebra crossing. Stand at the kerb first.`;
}

const ACTIONS: { id: Action; label: (s: Scene) => string; icon: (s: Scene) => string }[] = [
  { id: "ask", label: (s) => (s === "lights" ? "Press button" : "Stand at kerb"), icon: (s) => (s === "lights" ? "🔘" : "👣") },
  { id: "lookLeft", label: () => "Look left", icon: () => "👈" },
  { id: "lookRight", label: () => "Look right", icon: () => "👉" },
  { id: "walk", label: () => "Walk", icon: () => "🚶" },
];

function CrossingRound({ scene, place, onDone }: { scene: Scene; place: (typeof PLACES)[number]; onDone: () => void }) {
  const reduced = useAppReducedMotion();
  const [state, setState] = useState<CrossState>(() => startCrossing(scene));
  const [cars, setCars] = useState<Car[]>(startCars);
  const [light, setLight] = useState<Light>("green");
  const [look, setLook] = useState<"left" | "right" | null>(null);
  const [walking, setWalking] = useState(false);
  const [hint, setHint] = useState(false);
  const [wobble, setWobble] = useState<Record<string, number>>({});
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const carsRef = useRef(cars);
  const stopRef = useRef(false);
  const stoppedAt = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    const t = setTimeout(() => audioManager.speak(intro(scene, place.name)), 400);
    return () => clearTimeout(t);
  }, [scene, place]);

  // Drive the cars; once they are stopped and the crossing is clear, it is safe
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const cs = carsRef.current;
      const next = [
        ...moveLane(
          cs.filter((c) => c.dir === 1),
          dt,
          stopRef.current,
        ),
        ...moveLane(
          cs.filter((c) => c.dir === -1),
          dt,
          stopRef.current,
        ),
      ];
      carsRef.current = next;
      setCars(next);
      const s = stateRef.current;
      if (stopRef.current && !s.safe && crossingClear(next) && now - stoppedAt.current > 1500) {
        stateRef.current = becomeSafe(s);
        setState(stateRef.current);
        if (s.scene === "lights") audioManager.speak("Beep beep beep! The man is green. Now look left and right.");
        else audioManager.speak("The cars have stopped. Now look left and right.");
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const stopCars = () => {
    stopRef.current = true;
    stoppedAt.current = performance.now();
  };

  const tap = (a: Action) => {
    if (walking) return;
    const res = act(state, a);
    audioManager.speak(res.say);
    if (!res.ok) {
      setWobble((w) => ({ ...w, [a]: (w[a] ?? 0) + 1 }));
      setHint(true);
      audioManager.play("failure");
      return;
    }
    setHint(false);
    setState(res.state);
    audioManager.playPop(1);
    if (a === "ask") {
      if (scene === "lights") {
        setLight("amber");
        timers.current.push(
          setTimeout(() => {
            setLight("red");
            stopCars();
          }, 1200),
        );
      } else stopCars();
    }
    if (a === "lookLeft" || a === "lookRight") {
      setLook(a === "lookLeft" ? "left" : "right");
      timers.current.push(setTimeout(() => setLook(null), 1100));
    }
    if (a === "walk") {
      setWalking(true);
      timers.current.push(
        setTimeout(() => {
          audioManager.play("reward");
          audioManager.speak(`You crossed safely to ${place.name}!`);
        }, 2600),
      );
      timers.current.push(setTimeout(onDone, 4600));
    }
  };

  const next = nextAction(state);
  const manGreen = state.safe;

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="relative w-full max-w-3xl" style={{ maxWidth: "min(48rem, calc((100dvh - 19rem) * 1.6))" }}>
        <svg viewBox="0 0 100 62" className="h-auto w-full select-none overflow-hidden rounded-3xl shadow-inner" aria-label="Road">
          {/* Far pavement and the place we're going */}
          <rect x={0} y={0} width={100} height={15} fill="#c9ced6" />
          <text x={50} y={11} textAnchor="middle" fontSize={10}>
            {place.emoji}
          </text>
          {/* Road */}
          <rect x={0} y={15} width={100} height={32} fill="#4a4f57" />
          <line x1={0} y1={31} x2={100} y2={31} stroke="#fff" strokeWidth={0.8} strokeDasharray="5 4" />
          {/* Zebra stripes */}
          {Array.from({ length: 7 }, (_, i) => (
            <rect key={i} x={CROSSING.left} y={16 + i * 4.5} width={CROSSING.right - CROSSING.left} height={2.4} fill="#fff" opacity={0.92} />
          ))}
          {/* Near pavement */}
          <rect x={0} y={47} width={100} height={15} fill="#c9ced6" />
          <rect x={0} y={47} width={100} height={1.2} fill="#9aa1ab" />

          {scene === "lights" ? (
            <g>
              <rect x={61} y={49} width={5.2} height={12.4} rx={1.2} fill="#222" />
              {(["red", "amber", "green"] as Light[]).map((c, i) => (
                <circle key={c} cx={63.6} cy={51.4 + i * 3.8} r={1.5} fill={light === c ? { red: "#ff4d4d", amber: "#ffb52e", green: "#3ddc6a" }[c] : "#444"} />
              ))}
              <rect x={68} y={49} width={7} height={8} rx={1.2} fill="#222" />
              <text x={71.5} y={55.6} textAnchor="middle" fontSize={5.4}>
                {manGreen ? "🚶" : "🧍"}
              </text>
              <rect x={68} y={49} width={7} height={8} rx={1.2} fill={manGreen ? "#3ddc6a" : "#ff4d4d"} opacity={0.35} />
              <motion.circle
                cx={71.5}
                cy={59.6}
                r={1.8}
                fill={state.asked ? "#ffd93d" : "#e0e0e0"}
                stroke="#555"
                strokeWidth={0.5}
                onClick={() => tap("ask")}
                className="cursor-pointer"
                animate={next === "ask" && hint && !reduced ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                transition={{ repeat: Infinity, duration: 0.9 }}
                aria-label="Crossing button"
              />
            </g>
          ) : (
            <g>
              {[CROSSING.left - 3, CROSSING.right + 3].map((x) => (
                <g key={x}>
                  <rect x={x - 0.5} y={47} width={1} height={10} fill="#333" />
                  <motion.circle cx={x} cy={47} r={2} fill="#ff9f43" animate={reduced ? undefined : { opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
                </g>
              ))}
            </g>
          )}

          {/* Looking: the side being checked lights up */}
          {look && <motion.rect x={look === "left" ? 0 : 50} y={15} width={50} height={32} fill="#ffd93d" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.3, 0] }} transition={{ duration: 1.1 }} />}

          {cars.map((c, i) => (
            <g key={c.id} transform={c.dir === 1 ? `translate(${c.x} ${LANE_Y.near})` : `translate(${c.x + CAR_LEN} ${LANE_Y.far}) scale(-1 1)`}>
              <CarArt color={CAR_COLORS[i % CAR_COLORS.length]} />
            </g>
          ))}

          <motion.g initial={false} animate={{ y: walking ? KID_Y.end - KID_Y.start : 0 }} transition={walking && !reduced ? { duration: 2.4, ease: "linear" } : { duration: 0 }}>
            <text x={50} y={KID_Y.start + 4} textAnchor="middle" fontSize={9}>
              🧒
            </text>
            {look && (
              <text x={look === "left" ? 42 : 58} y={KID_Y.start - 4} textAnchor="middle" fontSize={5}>
                👀
              </text>
            )}
          </motion.g>
        </svg>
      </div>

      <div className="grid w-full max-w-xl grid-cols-4 gap-2">
        {ACTIONS.map((a) => {
          const glow = hint && next === a.id;
          const done = (a.id === "ask" && state.asked) || (a.id === "lookLeft" && state.looked.left) || (a.id === "lookRight" && state.looked.right);
          return (
            <ShakeOnWrong key={a.id} trigger={wobble[a.id] ?? 0}>
              <motion.button
                type="button"
                onClick={() => tap(a.id)}
                disabled={walking}
                className={`flex w-full flex-col items-center rounded-3xl px-1 py-2 text-base font-extrabold shadow-md active:scale-95 disabled:opacity-50 ${done ? "bg-kid-green text-white" : "bg-surface"} ${glow ? "ring-4 ring-kid-yellow" : ""}`}
                animate={glow && !reduced ? { y: [0, -6, 0] } : { y: 0 }}
                transition={{ repeat: glow ? Infinity : 0, duration: 0.8 }}
              >
                <span className="text-4xl" aria-hidden>
                  {done ? "✅" : a.icon(scene)}
                </span>
                {a.label(scene)}
              </motion.button>
            </ShakeOnWrong>
          );
        })}
      </div>
    </div>
  );
}

function QuizRound({ quiz, onDone }: { quiz: number; onDone: () => void }) {
  const q = QUIZ[quiz];
  const [wobble, setWobble] = useState<Record<number, number>>({});
  const [right, setRight] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  // Shuffled once per question
  const [order] = useState(() => q.choices.map((_, i) => i).sort(() => Math.random() - 0.5));

  useEffect(() => {
    const t = setTimeout(() => audioManager.speak(`Road safety question! ${q.q}`), 400);
    return () => clearTimeout(t);
  }, [q]);

  const choose = (i: number) => {
    if (right) return;
    const c = q.choices[i];
    if (!c.right) {
      setWobble((w) => ({ ...w, [i]: (w[i] ?? 0) + 1 }));
      audioManager.play("failure");
      audioManager.speak(`Hmm, not ${c.label.toLowerCase()}. ${q.q}`);
      return;
    }
    setRight(true);
    audioManager.play("success");
    audioManager.speak(`Yes! ${q.why}`);
    timers.current.push(setTimeout(onDone, 3800));
  };

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-4">
      <button type="button" onClick={() => audioManager.speak(q.q)} className="rounded-3xl bg-kid-yellow px-5 py-4 text-center text-2xl font-extrabold text-ink shadow-md active:scale-[0.98]">
        🚦 {q.q} 🔊
      </button>
      <div className="grid w-full grid-cols-3 gap-3">
        {order.map((i) => {
          const c = q.choices[i];
          return (
            <ShakeOnWrong key={i} trigger={wobble[i] ?? 0}>
              <button type="button" onClick={() => choose(i)} className={`flex w-full flex-col items-center gap-1 rounded-3xl p-3 text-lg font-extrabold shadow-md active:scale-95 ${right && c.right ? "bg-kid-green text-white ring-4 ring-kid-yellow" : "bg-surface"}`}>
                <span className="text-6xl" aria-hidden>
                  {c.emoji}
                </span>
                {c.label}
              </button>
            </ShakeOnWrong>
          );
        })}
      </div>
      {right && <p className="text-center text-xl font-bold">{q.why}</p>}
    </div>
  );
}

export default function RoadSafety() {
  const [n, setN] = useState(0);
  const kind = roundKind(n);
  const place = PLACES[n % PLACES.length];
  const next = () => {
    if (n % 3 === 2) void finishActivity(MODULE_ID, { score: n + 1 });
    setN(n + 1);
  };
  return <div className="flex flex-1 flex-col items-center gap-3 pb-4">{kind.kind === "cross" ? <CrossingRound key={n} scene={kind.scene} place={place} onDone={next} /> : <QuizRound key={n} quiz={kind.quiz} onDone={next} />}</div>;
}
