"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { ActivityHeader } from "@/components/ActivityHeader";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { StarBurst } from "@/components/StarBurst";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";

type Step = "flavor" | "stir" | "bake" | "frost" | "decorate" | "done";
const STEPS: Step[] = ["flavor", "stir", "bake", "frost", "decorate", "done"];
const PROMPTS: Record<Step, string> = {
  flavor: "Pick a cake flavor",
  stir: "Stir the batter!",
  bake: "Pop it in the oven",
  frost: "Frost your cake",
  decorate: "Tap the cake to decorate",
  done: "Happy Birthday!",
};

const FLAVORS = [
  { id: "vanilla", name: "Vanilla", sponge: "#f6dc9b", batter: "#f9e8b5", emoji: "🍦" },
  { id: "chocolate", name: "Chocolate", sponge: "#8a5a3c", batter: "#6b4228", emoji: "🍫" },
  { id: "strawberry", name: "Strawberry", sponge: "#f7a1b8", batter: "#fbbccd", emoji: "🍓" },
  { id: "lemon", name: "Lemon", sponge: "#fbe66a", batter: "#fdf08f", emoji: "🍋" },
  { id: "blueberry", name: "Blueberry", sponge: "#a79bf0", batter: "#bdb3f6", emoji: "🫐" },
  { id: "mint", name: "Mint", sponge: "#9fe3c4", batter: "#b8efd6", emoji: "🌿" },
];
const FROSTINGS = ["#ffffff", "#ff8fb8", "#c9a6ff", "#7fd6ff", "#ffe36e", "#9be59f", "#8a5a3c"];
const TOPPINGS = ["🍓", "🍒", "⭐", "🌸", "🍬", "💖", "🦄", "🌈", "🕯️", "🧁"];
const MAX_TOPPINGS = 24;
const STIRS = 8;

const BASE_Y = 232;
const TIER_H = 56;
const tierW = (i: number) => 210 - i * 56;

interface Topping {
  id: number;
  x: number;
  y: number;
  emoji: string;
}

function Frosting({ x, y, w, color }: { x: number; y: number; w: number; color: string }) {
  const n = Math.max(3, Math.round(w / 24));
  const r = w / n / 2;
  let d = `M ${x} ${y} h ${w} v 8`;
  for (let k = 0; k < n; k++) d += ` a ${r} ${r + 5} 0 0 1 ${-2 * r} 0`;
  return <path d={`${d} z`} fill={color} stroke="rgba(0,0,0,0.12)" strokeWidth={1.5} />;
}

export default function CakeBakery({ onExit }: { onExit?: () => void }) {
  const reduced = useAppReducedMotion();
  const [step, setStep] = useState<Step>("flavor");
  const [flavor, setFlavor] = useState(FLAVORS[0]);
  const [stirs, setStirs] = useState(0);
  const [baking, setBaking] = useState(false);
  const [baked, setBaked] = useState(false);
  const [tiers, setTiers] = useState(2);
  const [frosting, setFrosting] = useState(FROSTINGS[1]);
  const [topping, setTopping] = useState(TOPPINGS[0]);
  const [placed, setPlaced] = useState<Topping[]>([]);
  const nextId = useRef(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const go = useCallback((s: Step) => {
    setStep(s);
    audioManager.playNote(STEPS.indexOf(s) + 2);
    audioManager.speak(PROMPTS[s]);
    if (s === "done") {
      audioManager.play("reward");
      void finishActivity("cake-bakery", { moves: 0 });
    }
  }, []);

  const stir = () => {
    if (stirs >= STIRS) return;
    setStirs(stirs + 1);
    audioManager.playNote(stirs % 8);
  };

  const bake = () => {
    if (baking || baked) return;
    setBaking(true);
    audioManager.play("success");
    timer.current = setTimeout(() => {
      setBaking(false);
      setBaked(true);
      audioManager.playNote(9);
    }, reduced ? 800 : 2600);
  };

  const place = (e: PointerEvent<SVGSVGElement>) => {
    if (step !== "decorate") return;
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 300;
    const y = ((e.clientY - r.top) / r.height) * 260;
    const top = BASE_Y - tiers * TIER_H - 18;
    const onCake = y >= top && y <= BASE_Y && Math.abs(x - 150) <= tierW(0) / 2 + 8;
    if (!onCake) return;
    audioManager.playNote(placed.length % 10);
    setPlaced((p) => [...p.slice(-(MAX_TOPPINGS - 1)), { id: nextId.current++, x, y, emoji: topping }]);
  };

  const again = () => {
    setStep("flavor");
    setStirs(0);
    setBaked(false);
    setBaking(false);
    setPlaced([]);
    audioManager.speak(PROMPTS.flavor);
  };

  const canNext = (step === "stir" && stirs >= STIRS) || (step === "bake" && baked) || step === "flavor" || step === "frost" || step === "decorate";
  const next = STEPS[STEPS.indexOf(step) + 1];
  const showCake = step === "frost" || step === "decorate" || step === "done";
  const sponge = flavor.sponge;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-3 p-3" style={{ background: "linear-gradient(180deg, var(--tint, #fff0f6), transparent)" }}>
      <ActivityHeader title="Cake Bakery" moduleId="cake-bakery" />
      <div className="flex items-center justify-center gap-2" aria-hidden>
        {STEPS.slice(0, 5).map((s) => (
          <span key={s} className={`h-3 rounded-full transition-all ${s === step ? "w-10 bg-pink-500" : STEPS.indexOf(s) < STEPS.indexOf(step) ? "w-3 bg-pink-300" : "w-3 bg-black/15"}`} />
        ))}
      </div>
      <p className="text-center text-2xl font-extrabold" role="status">{PROMPTS[step]}</p>

      <div className="relative mx-auto flex w-full max-w-md flex-1 items-center justify-center">
        {step === "flavor" && (
          <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
            {FLAVORS.map((f) => (
              <motion.button
                key={f.id}
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setFlavor(f);
                  audioManager.playNote(FLAVORS.indexOf(f) + 1);
                  audioManager.speak(f.name);
                }}
                aria-pressed={flavor.id === f.id}
                className={`flex min-h-touch flex-col items-center justify-center gap-1 rounded-3xl border-4 p-3 text-xl font-extrabold shadow ${flavor.id === f.id ? "border-pink-500" : "border-transparent"}`}
                style={{ background: f.sponge }}
              >
                <span className="text-4xl">{f.emoji}</span>
                <span className="text-black/80">{f.name}</span>
              </motion.button>
            ))}
          </div>
        )}

        {step === "stir" && (
          <button type="button" onClick={stir} aria-label="Stir the batter" className="relative h-72 w-72 touch-none select-none">
            <svg viewBox="0 0 240 240" className="h-full w-full">
              <ellipse cx="120" cy="190" rx="100" ry="22" fill="rgba(0,0,0,0.1)" />
              <path d="M30 100 Q30 215 120 215 Q210 215 210 100 Z" fill="#ff8fb8" stroke="#d6578a" strokeWidth="4" />
              <ellipse cx="120" cy="100" rx="90" ry="26" fill={flavor.batter} stroke="#d6578a" strokeWidth="4" />
              <motion.g
                animate={reduced ? undefined : { rotate: stirs * 120 }}
                transition={{ type: "spring", stiffness: 120, damping: 12 }}
                style={{ originX: "120px", originY: "100px" }}
              >
                <path d="M120 100 q25 -6 40 4 M120 100 q-25 6 -40 -4" stroke="rgba(0,0,0,0.25)" strokeWidth="5" strokeLinecap="round" fill="none" />
                <rect x="112" y="10" width="14" height="95" rx="7" fill="#c68b59" transform="rotate(14 120 100)" />
              </motion.g>
            </svg>
            <span className="absolute inset-x-0 -bottom-2 text-center text-2xl font-extrabold">{"🥄".repeat(Math.min(stirs, STIRS))}{stirs < STIRS ? " tap tap!" : " Yum!"}</span>
          </button>
        )}

        {step === "bake" && (
          <button type="button" onClick={bake} aria-label="Bake the cake" className="relative h-72 w-72 select-none">
            <svg viewBox="0 0 240 240" className="h-full w-full">
              <rect x="20" y="30" width="200" height="190" rx="26" fill="#c9ced6" stroke="#8a919c" strokeWidth="5" />
              <rect x="40" y="70" width="160" height="120" rx="14" fill={baking ? "#ffb347" : "#3a3f48"} stroke="#8a919c" strokeWidth="4" style={{ transition: "fill 0.5s" }} />
              <motion.g
                animate={baking && !reduced ? { scaleY: [0.55, 1.15], y: [0, -4] } : { scaleY: baked ? 1.1 : 0.55 }}
                transition={{ duration: 2.4 }}
                style={{ originX: "120px", originY: "180px" }}
              >
                <rect x="70" y="120" width="100" height="60" rx="16" fill={sponge} stroke="rgba(0,0,0,0.25)" strokeWidth="3" />
              </motion.g>
              {[60, 100, 140, 180].map((x) => (
                <circle key={x} cx={x} cy="48" r="9" fill={baking ? "#ff6b6b" : "#8a919c"} />
              ))}
            </svg>
            <span className="absolute inset-x-0 bottom-0 text-center text-2xl font-extrabold">{baked ? "Ding! 🔔 Ready!" : baking ? "Baking… ♨️" : "Tap the oven"}</span>
          </button>
        )}

        {showCake && (
          <div className="relative w-full">
            <motion.svg
              ref={svgRef}
              viewBox="0 0 300 260"
              className="max-h-[42dvh] w-full touch-none select-none"
              onPointerDown={place}
              aria-label="Your cake"
              initial={reduced ? false : { scale: 0.85 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 10 }}
            >
              <ellipse cx="150" cy={BASE_Y + 6} rx="140" ry="16" fill="#e8e8f0" stroke="#b9b9c9" strokeWidth="3" />
              {Array.from({ length: tiers }, (_, i) => {
                const w = tierW(i);
                const y = BASE_Y - (i + 1) * TIER_H;
                return (
                  <g key={i}>
                    <rect x={150 - w / 2} y={y} width={w} height={TIER_H} rx="12" fill={sponge} stroke="rgba(0,0,0,0.18)" strokeWidth="2" />
                    <Frosting x={150 - w / 2} y={y} w={w} color={frosting} />
                    <ellipse cx="150" cy={y} rx={w / 2} ry="9" fill={frosting} stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" />
                  </g>
                );
              })}
              {placed.map((t) => (
                <g key={t.id} transform={`translate(${t.x} ${t.y})`}>
                  <motion.text
                    fontSize="38"
                    textAnchor="middle"
                    dominantBaseline="central"
                    initial={reduced ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 360, damping: 10 }}
                    style={{ transformBox: "fill-box", transformOrigin: "center" }}
                  >
                    {t.emoji}
                  </motion.text>
                </g>
              ))}
            </motion.svg>
            {step === "done" && (
              <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
                <StarBurst />
              </div>
            )}
          </div>
        )}
      </div>

      {step === "frost" && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-2" role="group" aria-label="Number of layers">
            {[1, 2, 3].map((n) => (
              <button key={n} type="button" aria-pressed={tiers === n} onClick={() => { setTiers(n); audioManager.playNote(n * 2); }} className={`min-h-touch min-w-touch rounded-2xl text-2xl font-extrabold shadow ${tiers === n ? "bg-pink-500 text-white" : "bg-surface"}`}>
                {n} 🍰
              </button>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Frosting color">
            {FROSTINGS.map((c) => (
              <button key={c} type="button" aria-label={`Frosting ${c}`} aria-pressed={frosting === c} onClick={() => { setFrosting(c); audioManager.playNote(FROSTINGS.indexOf(c) + 1); }} className={`h-16 w-16 rounded-full border-4 shadow ${frosting === c ? "border-pink-600" : "border-white"}`} style={{ background: c }} />
            ))}
          </div>
        </div>
      )}

      {step === "decorate" && (
        <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Toppings">
          {TOPPINGS.map((t) => (
            <button key={t} type="button" aria-pressed={topping === t} onClick={() => { setTopping(t); audioManager.playNote(TOPPINGS.indexOf(t)); }} className={`h-16 w-16 rounded-2xl text-3xl shadow ${topping === t ? "bg-pink-200 ring-4 ring-pink-500" : "bg-surface"}`}>
              {t}
            </button>
          ))}
          <button type="button" onClick={() => setPlaced((p) => p.slice(0, -1))} disabled={!placed.length} className="min-h-16 rounded-2xl bg-surface px-4 text-lg font-bold shadow disabled:opacity-40">↩ Undo</button>
        </div>
      )}

      <div className="flex justify-center gap-3 pb-3">
        {step === "done" ? (
          <>
            <button type="button" onClick={again} className="min-h-touch rounded-3xl bg-pink-500 px-8 text-2xl font-extrabold text-white shadow-lg">🎂 Bake another</button>
            {onExit && <button type="button" onClick={onExit} className="min-h-touch rounded-3xl bg-surface px-8 text-2xl font-extrabold shadow">Home</button>}
          </>
        ) : (
          <button type="button" disabled={!canNext} onClick={() => go(next)} className="min-h-touch min-w-60 rounded-3xl bg-pink-500 px-10 text-2xl font-extrabold text-white shadow-lg disabled:opacity-40">
            {step === "decorate" ? "All done! 🎉" : "Next ▶"}
          </button>
        )}
      </div>
    </main>
  );
}
