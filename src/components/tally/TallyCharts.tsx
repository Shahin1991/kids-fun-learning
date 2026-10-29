"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { ShakeOnWrong } from "@/components/ShakeOnWrong";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import { countOf, kindById, makeParade, makeQuestions, tallyGroups, type Parade, type Question } from "@/lib/tally/tally";

const MODULE_ID = "tally";
const BAR_COLORS = ["#ff6b6b", "#4d96ff", "#ffc93c", "#9b51e0"];

type Phase = "tally" | "chart" | "questions" | "done";

/** Tally marks: four sticks and a fifth across them. */
function Marks({ n }: { n: number }) {
  const { fives, ones } = tallyGroups(n);
  const gate = (k: number, sticks: number) => (
    <svg key={k} viewBox="0 0 54 44" className="h-10 w-12 shrink-0" aria-hidden>
      {Array.from({ length: Math.min(4, sticks) }, (_, i) => (
        <motion.line key={i} x1={8 + i * 11} y1={4} x2={8 + i * 11} y2={40} stroke="#3a2f2a" strokeWidth={4} strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.2 }} />
      ))}
      {sticks === 5 && <motion.line x1={2} y1={34} x2={50} y2={10} stroke="#d93838" strokeWidth={4} strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.25 }} />}
    </svg>
  );
  return (
    <span className="flex flex-wrap items-center gap-1">
      {Array.from({ length: fives }, (_, k) => gate(k, 5))}
      {ones > 0 && gate(fives, ones)}
    </span>
  );
}

export default function TallyCharts() {
  const reduced = useAppReducedMotion();
  const [level, setLevel] = useState(0);
  const [parade, setParade] = useState<Parade>(() => makeParade(0));
  const [phase, setPhase] = useState<Phase>("tally");
  const [walked, setWalked] = useState(0);
  const [tally, setTally] = useState<Record<string, number>>({});
  const [bars, setBars] = useState<Record<string, number>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qi, setQi] = useState(0);
  const [wobble, setWobble] = useState<Record<string, number>>({});
  const [answered, setAnswered] = useState<string | number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const current = phase === "tally" ? parade.order[walked] : undefined;
  const counts = Object.fromEntries(parade.kinds.map((k) => [k, countOf(parade.order, k)]));
  const top = Math.max(...Object.values(counts)) + 2;

  useEffect(() => {
    const t = setTimeout(() => audioManager.speak("The animals are walking to the farm! Make a tally mark for each one. Tap the row for the animal you see."), 500);
    return () => clearTimeout(t);
  }, []);

  const shake = (key: string) => setWobble((w) => ({ ...w, [key]: (w[key] ?? 0) + 1 }));

  const mark = (kind: string) => {
    if (phase !== "tally" || !current) return;
    const k = kindById(current);
    if (kind !== current) {
      shake(kind);
      audioManager.play("failure");
      return void audioManager.speak(`That's a ${k.name}! Find the ${k.name} row.`);
    }
    const n = (tally[kind] ?? 0) + 1;
    setTally({ ...tally, [kind]: n });
    audioManager.playPop(n % 5 === 0 ? 2 : 1);
    const w = walked + 1;
    setWalked(w);
    if (n % 5 === 0) audioManager.speak(`${n}! Five makes a gate.`);
    if (w < parade.order.length) return;
    timers.current.push(
      setTimeout(() => {
        setPhase("chart");
        audioManager.speak("All the animals are here! Now make a bar chart. Tap the squares to make each bar as tall as its tally.");
      }, 1200),
    );
  };

  const setBar = (kind: string, h: number) => {
    if (phase !== "chart") return;
    const next = { ...bars, [kind]: h };
    setBars(next);
    audioManager.playNote(Math.min(9, h));
    const k = kindById(kind);
    if (h === counts[kind]) audioManager.speak(`${h} ${h === 1 ? k.name : k.plural}. That matches the tally!`);
    else audioManager.speak(`That bar shows ${h}. Count the ${k.name} tally marks again.`);
    if (parade.kinds.every((id) => next[id] === counts[id])) {
      const qs = makeQuestions(parade, level);
      timers.current.push(
        setTimeout(() => {
          audioManager.play("success");
          setQuestions(qs);
          setQi(0);
          setPhase("questions");
          audioManager.speak(`Great chart! ${qs[0].text}`);
        }, 1800),
      );
    }
  };

  const answer = (c: string | number) => {
    if (phase !== "questions" || answered !== null) return;
    const q = questions[qi];
    if (c !== q.answer) {
      shake(`q${c}`);
      audioManager.play("failure");
      return void audioManager.speak(typeof c === "string" ? "Look at the bars. Which one is right?" : "Count again using the chart.");
    }
    setAnswered(c);
    audioManager.play("success");
    audioManager.speak(`Yes! ${typeof c === "string" ? kindById(c).plural : c}.`);
    timers.current.push(
      setTimeout(() => {
        setAnswered(null);
        if (qi + 1 < questions.length) {
          setQi(qi + 1);
          audioManager.speak(questions[qi + 1].text);
          return;
        }
        setPhase("done");
        audioManager.speak("You counted, made a chart and read it. Super data detective!");
        void finishActivity(MODULE_ID, { score: level + 1 });
        timers.current.push(
          setTimeout(() => {
            const n = level + 1;
            setLevel(n);
            setParade(makeParade(n));
            setWalked(0);
            setTally({});
            setBars({});
            setPhase("tally");
            audioManager.speak("Here come more animals! Make a tally mark for each one.");
          }, 3500),
        );
      }, 1500),
    );
  };

  const q = phase === "questions" ? questions[qi] : null;

  return (
    <div className="flex flex-1 flex-col items-center gap-4 pb-4">
      {/* The lane where animals walk past */}
      {phase === "tally" && (
        <div
          className="relative h-28 w-full max-w-2xl overflow-hidden rounded-3xl shadow-inner"
          style={{
            background: "linear-gradient(#bfe6ff 0 55%, #8bdc7a 55% 100%)",
          }}
        >
          <span className="absolute right-3 top-1 text-5xl" aria-hidden>
            🏡
          </span>
          <AnimatePresence mode="popLayout">
            {current && (
              <motion.span
                key={walked}
                className="absolute bottom-2 left-1/2 text-7xl"
                initial={reduced ? { opacity: 0, x: "-50%" } : { x: "-400%" }}
                animate={reduced ? { opacity: 1, x: "-50%" } : { x: "-50%", y: [0, -8, 0] }}
                exit={reduced ? { opacity: 0 } : { x: "400%", opacity: 0 }}
                transition={{
                  x: { type: "spring", stiffness: 120, damping: 18 },
                  y: { repeat: Infinity, duration: 0.6 },
                }}
                aria-label={`A ${kindById(current).name}`}
              >
                {kindById(current).emoji}
              </motion.span>
            )}
          </AnimatePresence>
          <span className="absolute left-3 top-2 rounded-full bg-white/85 px-3 text-lg font-extrabold text-ink" aria-live="polite">
            {walked} / {parade.order.length}
          </span>
        </div>
      )}

      <div className="flex w-full max-w-4xl flex-col items-center gap-4 lg:flex-row lg:items-start lg:justify-center">
        {/* Tally table; the chart replaces it once it's drawn */}
        {(phase === "tally" || phase === "chart") && (
          <div className="w-full max-w-md rounded-3xl bg-surface p-3 shadow-md">
            <p className="mb-2 text-center text-lg font-extrabold">📝 Tally</p>
            <div className="flex flex-col gap-2">
              {parade.kinds.map((id) => {
                const k = kindById(id);
                return (
                  <ShakeOnWrong key={id} trigger={wobble[id] ?? 0}>
                    <button
                      type="button"
                      onClick={() => mark(id)}
                      disabled={phase !== "tally"}
                      aria-label={`${k.name} row, ${tally[id] ?? 0} marks`}
                      className="flex min-h-16 w-full items-center gap-3 rounded-2xl border-2 border-ink/10 bg-white px-3 text-left text-ink active:scale-[0.98] disabled:active:scale-100"
                    >
                      <span className="text-4xl" aria-hidden>
                        {k.emoji}
                      </span>
                      <span className="w-16 text-lg font-extrabold capitalize">{k.plural}</span>
                      <Marks n={tally[id] ?? 0} />
                    </button>
                  </ShakeOnWrong>
                );
              })}
            </div>
          </div>
        )}

        {/* Bar chart */}
        {phase !== "tally" && (
          <div className="rounded-3xl bg-surface p-3 shadow-md">
            <p className="mb-2 text-center text-lg font-extrabold">📊 Bar chart</p>
            <div className="flex items-end gap-1">
              <div className="flex flex-col-reverse pb-12" aria-hidden>
                {Array.from({ length: top }, (_, i) => (
                  <span key={i} className="flex h-7 items-center justify-end pr-1 text-sm font-bold opacity-60">
                    {i + 1}
                  </span>
                ))}
              </div>
              {parade.kinds.map((id, col) => {
                const k = kindById(id);
                const h = bars[id] ?? 0;
                const ok = h === counts[id];
                return (
                  <div key={id} className="flex flex-col items-center">
                    <div className={`flex flex-col-reverse rounded-lg ${ok && phase === "chart" ? "ring-4 ring-kid-green" : ""}`}>
                      {Array.from({ length: top }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setBar(id, i + 1)}
                          disabled={phase !== "chart"}
                          aria-label={`${k.plural} bar to ${i + 1}`}
                          className="h-7 w-12 border border-ink/10 transition-colors sm:w-14"
                          style={{
                            background: i < h ? BAR_COLORS[col] : "#fff",
                          }}
                        />
                      ))}
                    </div>
                    <span className="flex h-12 items-center text-3xl" aria-hidden>
                      {k.emoji}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {q && (
        <div className="order-first flex w-full max-w-2xl flex-col items-center gap-3">
          <button type="button" onClick={() => audioManager.speak(q.text)} className="rounded-3xl bg-kid-yellow px-5 py-3 text-center text-2xl font-extrabold text-ink shadow-md active:scale-[0.98]">
            {q.text} 🔊
          </button>
          <div className="flex flex-wrap justify-center gap-3">
            {q.choices.map((c) => (
              <ShakeOnWrong key={String(c)} trigger={wobble[`q${c}`] ?? 0}>
                <button type="button" onClick={() => answer(c)} className={`flex h-20 min-w-20 items-center justify-center gap-1 rounded-3xl px-3 text-4xl font-extrabold shadow-md active:scale-90 ${answered === c ? "bg-kid-green text-white ring-4 ring-kid-yellow" : "bg-surface"}`}>
                  {typeof c === "string" ? (
                    <>
                      <span aria-hidden>{kindById(c).emoji}</span>
                      <span className="text-lg capitalize">{kindById(c).plural}</span>
                    </>
                  ) : (
                    c
                  )}
                </button>
              </ShakeOnWrong>
            ))}
          </div>
        </div>
      )}
      {phase === "done" && (
        <motion.p className="text-4xl font-extrabold" initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }}>
          ⭐ Data detective! ⭐
        </motion.p>
      )}
    </div>
  );
}
