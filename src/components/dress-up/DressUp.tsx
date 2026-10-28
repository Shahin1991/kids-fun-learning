"use client";

import { LayoutGroup, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { ShakeOnWrong } from "@/components/ShakeOnWrong";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import { clothingById, makeTray, nextWeather, wear, weatherById, type Slot, type WeatherId } from "@/lib/dress-up/weather";

const MODULE_ID = "dress-up";
const STAR_EVERY = 2;

const SKY: Record<WeatherId, string> = {
  sunny: "linear-gradient(#7fd0ff, #fff1a8)",
  rainy: "linear-gradient(#7d8aa3, #c8d2e2)",
  snowy: "linear-gradient(#a9cdfb, #f2f7ff)",
};

const HINT: Record<WeatherId, string> = { sunny: "for the hot sunshine", rainy: "for the rain", snowy: "to keep us warm" };
const PLAY: Record<WeatherId, string> = { sunny: "Ready for the sunshine!", rainy: "Ready to splash in the puddles!", snowy: "Ready to build a snowman!" };
const FEELING: Record<WeatherId, string> = { sunny: "🥵", rainy: "💧", snowy: "🥶" };

/** Where each slot sits on the character, in % of its box: [left, top, size in rem]. Gloves and boots come in pairs. */
const SLOT_AT: Record<Slot, [number, number, number][]> = {
  head: [[50, 6, 5.5]],
  eyes: [[50, 21, 3.4]],
  neck: [[50, 41, 3.2]],
  body: [[50, 52, 7.5]],
  hands: [[16, 55, 3], [84, 55, 3]],
  hand: [[86, 40, 5]],
  feet: [[38, 92, 3.6], [62, 92, 3.6]],
};

function Kid({ happy, reduced }: { happy: boolean; reduced: boolean }) {
  return (
    <motion.svg viewBox="0 0 200 320" className="h-full w-full" aria-hidden animate={reduced ? undefined : happy ? { y: [0, -14, 0], rotate: [0, -4, 4, 0] } : { y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: happy ? 0.7 : 2.6 }}>
      <path d="M70 290 L76 220 L94 220 L92 290 Z M108 290 L106 220 L124 220 L130 290 Z" fill="#3b5bdb" />
      <ellipse cx={82} cy={296} rx={16} ry={9} fill="#5a3825" />
      <ellipse cx={118} cy={296} rx={16} ry={9} fill="#5a3825" />
      <path d="M62 120 Q100 104 138 120 L146 226 L54 226 Z" fill="#ff8fb1" />
      <path d="M62 126 L32 182" stroke="#f3c19d" strokeWidth={16} strokeLinecap="round" />
      <path d="M138 126 L168 182" stroke="#f3c19d" strokeWidth={16} strokeLinecap="round" />
      <rect x={90} y={96} width={20} height={20} rx={6} fill="#f3c19d" />
      <circle cx={100} cy={66} r={42} fill="#f3c19d" />
      <path d="M58 60 C58 18 142 18 142 60 C128 40 76 38 58 60 Z" fill="#6b4226" />
      <motion.g animate={reduced ? undefined : { scaleY: [1, 1, 0.1, 1] }} transition={{ repeat: Infinity, duration: 3.5, times: [0, 0.9, 0.95, 1] }} style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}>
        <circle cx={86} cy={68} r={5} fill="#3b2f4a" />
        <circle cx={114} cy={68} r={5} fill="#3b2f4a" />
      </motion.g>
      <circle cx={76} cy={82} r={6} fill="#ff8fa3" opacity={0.5} />
      <circle cx={124} cy={82} r={6} fill="#ff8fa3" opacity={0.5} />
      {happy ? <path d="M86 86 Q100 102 114 86 Z" fill="#c2374f" /> : <path d="M90 90 Q100 86 110 90" fill="none" stroke="#3b2f4a" strokeWidth={4} strokeLinecap="round" />}
    </motion.svg>
  );
}

function WeatherFx({ weather, reduced }: { weather: WeatherId; reduced: boolean }) {
  if (weather === "sunny")
    return (
      <motion.div className="absolute right-4 top-4 text-7xl" animate={reduced ? undefined : { rotate: 360, scale: [1, 1.08, 1] }} transition={{ rotate: { repeat: Infinity, duration: 20, ease: "linear" }, scale: { repeat: Infinity, duration: 2 } }} aria-hidden>
        ☀️
      </motion.div>
    );
  const flake = weather === "snowy";
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute left-4 top-2 text-6xl opacity-90">☁️</div>
      <div className="absolute right-8 top-4 text-7xl opacity-90">☁️</div>
      {Array.from({ length: 18 }, (_, i) => (
        <motion.span
          key={i}
          className={`absolute ${flake ? "text-xl" : "h-4 w-1 rounded-full bg-sky-600/60"}`}
          style={{ left: `${(i * 53) % 100}%`, top: -20 }}
          animate={reduced ? { y: 120 + ((i * 37) % 300) } : { y: [0, 520], x: flake ? [0, 14, -14, 0] : 0 }}
          transition={reduced ? { duration: 0 } : { repeat: Infinity, duration: flake ? 5 + (i % 4) : 1.1 + (i % 3) * 0.2, delay: (i % 6) * 0.35, ease: "linear" }}
        >
          {flake ? "❄️" : ""}
        </motion.span>
      ))}
    </div>
  );
}

export default function DressUp() {
  const reduced = useAppReducedMotion();
  const [weather, setWeather] = useState<WeatherId>(() => nextWeather(null));
  const [done, setDone] = useState(0);
  const [tray, setTray] = useState<string[]>(() => makeTray(weatherById(weather), 0));
  const [worn, setWorn] = useState<string[]>([]);
  const [wobble, setWobble] = useState<Record<string, number>>({});
  const [dressed, setDressed] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const w = weatherById(weather);

  useEffect(() => {
    const t = setTimeout(() => audioManager.speak(weatherById(weather).intro), 500);
    return () => clearTimeout(t);
    // Only the first weather; later ones are announced as they arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = (id: string) => {
    if (dressed) return;
    const item = clothingById(id);
    const result = wear(w, worn, id);
    if (result === "wrong") {
      setWobble((x) => ({ ...x, [id]: (x[id] ?? 0) + 1 }));
      audioManager.play("failure");
      audioManager.speak(`A ${item.name}? Not today! Let's find something ${HINT[weather]}.`);
      return;
    }
    if (result === "already") return;
    const next = [...worn, id];
    setWorn(next);
    audioManager.playPop(next.length);
    audioManager.playNote(next.length * 2);
    if (result === "on") {
      audioManager.speak(item.why);
      return;
    }
    setDressed(true);
    audioManager.play("reward");
    audioManager.speak(`${item.why} ${PLAY[weather]}`);
    const n = done + 1;
    setDone(n);
    if (n % STAR_EVERY === 0) void finishActivity(MODULE_ID, { score: n });
    timers.current.push(
      setTimeout(() => {
        const nw = nextWeather(weather);
        setWeather(nw);
        setWorn([]);
        setDressed(false);
        setTray(makeTray(weatherById(nw), Math.min(3, n)));
        audioManager.speak(weatherById(nw).intro);
      }, 4200),
    );
  };

  const wornItems = worn.map(clothingById);

  return (
    <LayoutGroup>
      <div className="flex flex-1 flex-col items-center gap-4">
        <button type="button" onClick={() => audioManager.speak(w.intro)} aria-label={`${w.label}. Hear it again`} className="relative h-[min(56dvh,30rem)] w-full max-w-2xl overflow-hidden rounded-3xl shadow-inner transition-[background] duration-700" style={{ background: SKY[weather] }}>
          <WeatherFx key={weather} weather={weather} reduced={reduced} />
          <div className="absolute inset-x-0 bottom-0 h-14" style={{ background: weather === "snowy" ? "#ffffff" : "#8bdc7a" }} aria-hidden />
          <div className="absolute bottom-3 left-1/2 aspect-[200/320] h-[85%] -translate-x-1/2">
            <Kid happy={dressed} reduced={reduced} />
            {!dressed && worn.length === 0 && (
              <motion.span className="absolute -right-6 top-0 text-4xl" animate={reduced ? undefined : { y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 1.2 }} aria-hidden>
                {FEELING[weather]}
              </motion.span>
            )}
            {wornItems.flatMap((c) =>
              SLOT_AT[c.slot].map(([left, top, rem], i) => (
                <motion.span
                  key={`${c.id}-${i}`}
                  layoutId={i === 0 ? `wear-${c.id}` : undefined}
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 leading-none"
                  style={{ left: `${left}%`, top: `${top}%`, fontSize: `${rem}rem` }}
                  initial={i === 0 || reduced ? false : { scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  aria-hidden
                >
                  {c.emoji}
                </motion.span>
              )),
            )}
            {dressed &&
              !reduced &&
              ["⭐", "💖", "✨", "🌟", "✨", "💛"].map((s, i) => {
                const a = (i / 6) * Math.PI * 2;
                return (
                  <motion.span key={s + i} className="pointer-events-none absolute left-1/2 top-1/3 text-3xl" initial={{ x: 0, y: 0, opacity: 1 }} animate={{ x: Math.cos(a) * 140, y: Math.sin(a) * 120, opacity: 0 }} transition={{ duration: 1.1 }} aria-hidden>
                    {s}
                  </motion.span>
                );
              })}
          </div>
          <span className="absolute left-3 top-3 rounded-full bg-white/80 px-3 py-1 text-xl font-extrabold text-ink" aria-hidden>
            {w.emoji} {w.label}
          </span>
        </button>

        <div className="flex flex-wrap justify-center gap-3" aria-label="Clothes">
          {tray.map((id) => {
            const c = clothingById(id);
            const on = worn.includes(id);
            return (
              <ShakeOnWrong key={`${weather}-${id}`} trigger={wobble[id] ?? 0}>
                <button type="button" onClick={() => tap(id)} disabled={on} aria-label={c.name} className="flex min-h-touch min-w-touch items-center justify-center rounded-3xl bg-surface shadow-md active:scale-90 disabled:opacity-40">
                  {on ? (
                    <span className="text-3xl text-kid-green">✓</span>
                  ) : (
                    <motion.span layoutId={`wear-${id}`} className="text-5xl leading-none">
                      {c.emoji}
                    </motion.span>
                  )}
                </button>
              </ShakeOnWrong>
            );
          })}
        </div>
      </div>
    </LayoutGroup>
  );
}
