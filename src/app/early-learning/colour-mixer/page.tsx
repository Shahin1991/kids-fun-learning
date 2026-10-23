"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import { StarBurst } from "@/components/StarBurst";
import { PickRound, type PickRoundData } from "@/components/games/PickRound";
import { MixerStage, NameChip, useMixer } from "@/components/colour-mixing/Mixer";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import { MAX_DROPS, NAMED, POTS, colourOf, explain, mixQuestion, nameOf, pickTarget, recipeSpeech, sameRecipe, toCounts, total, type NamedColour, type Pot, type Recipe } from "@/lib/colour-mixing/mix";

const MODULE = "colour-mixer";

const potsIn = (r: Recipe): Pot[] => POTS.filter((_, i) => r[i] > 0).map((p) => p.id);
const swatch = "inline-block size-10 rounded-full border-4 border-white shadow sm:size-12";

/** The recipe as coloured dots, one per drop: 🔴🔴🟡. */
function Dots({ recipe, className = "" }: { recipe: Recipe; className?: string }) {
  return (
    <span className={`inline-flex flex-wrap items-center justify-center gap-1 ${className}`} aria-hidden>
      {POTS.flatMap((p, i) => Array.from({ length: recipe[i] }, (_, k) => <span key={`${p.id}${k}`} className="inline-block size-8 rounded-full border-4 border-white shadow" style={{ background: p.color }} />))}
    </span>
  );
}

/** Free play: pour any paints, see and hear what they make, and collect every colour. */
function Mix() {
  const mixer = useMixer();
  const [found, setFound] = useState<string[]>([]);
  const starred = useRef(false);
  const talk = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(talk.current), []);

  const onPour = (pot: Pot) => {
    const next = mixer.pour(pot);
    if (!next) return;
    // speak once the drop has landed, and only the last pour if the child taps quickly
    clearTimeout(talk.current);
    talk.current = setTimeout(() => audioManager.speak(explain(next)), 900);
    const n = nameOf(next);
    if (n && sameRecipe(next, toCounts(n.recipe)) && !found.includes(n.name)) {
      const all = [...found, n.name];
      setFound(all);
      if (all.length >= 5 && !starred.current) {
        starred.current = true;
        void finishActivity(MODULE, { variant: "mix", score: all.length });
      }
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center gap-3">
      <MixerStage mixer={mixer} onPour={onPour} />
      <NameChip counts={mixer.counts} />
      <button type="button" onClick={mixer.clear} className={`min-h-touch rounded-3xl bg-kid-blue px-6 text-xl font-extrabold text-white shadow-md active:scale-95 ${total(mixer.counts) >= MAX_DROPS ? "animate-pulse ring-8 ring-kid-yellow" : ""}`}>
        🧽 Pour out
      </button>
      <section className="w-full max-w-md" aria-label="Colours you have found">
        <p className="mb-1 text-center text-lg font-bold">
          Colours found: {found.length} / {NAMED.length}
        </p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {NAMED.map((n) => {
            const got = found.includes(n.name);
            return (
              <button key={n.name} type="button" disabled={!got} onClick={() => audioManager.speak(n.name)} aria-label={got ? n.name : "Not found yet"} title={got ? n.name : "?"} className="flex size-10 items-center justify-center rounded-full border-4 border-white text-lg font-extrabold shadow" style={{ background: got ? colourOf(n) : "#d9dde6" }}>
                {got ? "" : "?"}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/** Make the colour shown: pour until the glass matches. Hints appear on request or after a pause. */
function Make() {
  const mixer = useMixer();
  const [streak, setStreak] = useState(0);
  const [target, setTarget] = useState<NamedColour>(() => pickTarget(0, null));
  const [solved, setSolved] = useState(false);
  const [hint, setHint] = useState(false);
  const [stuck, setStuck] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const ask = useCallback((t: NamedColour) => audioManager.speak(`Can you make ${t.name.toLowerCase()}?`), []);
  useEffect(() => {
    const t = setTimeout(() => ask(target), 900);
    return () => clearTimeout(t);
  }, [target, ask]);

  // after a long quiet moment, show the recipe
  useEffect(() => {
    if (solved || hint) return;
    const t = setTimeout(() => {
      setHint(true);
      audioManager.speak(`Try ${recipeSpeech(target.recipe)}.`);
    }, 20000);
    return () => clearTimeout(t);
  }, [mixer.counts, target, solved, hint]);

  const onPour = (pot: Pot) => {
    if (solved) return;
    const next = mixer.pour(pot);
    if (!next) {
      setStuck(true);
      return;
    }
    if (sameRecipe(next, toCounts(target.recipe))) {
      const s = streak + 1;
      setSolved(true);
      setStreak(s);
      audioManager.playNote(Math.min(9, s + 4));
      audioManager.speak(`${target.name}! You made ${target.name.toLowerCase()}!`);
      if (s % 3 === 0) void finishActivity(MODULE, { variant: "make", score: s });
      timer.current = setTimeout(() => {
        setTarget(pickTarget(s, target.name));
        mixer.clear();
        setSolved(false);
        setHint(false);
        setStuck(false);
      }, 2600);
    } else if (total(next) >= MAX_DROPS) {
      audioManager.speak("Not quite. Pour it out and try again!");
      setStuck(true);
      setHint(true);
    }
  };

  const pourOut = () => {
    mixer.clear();
    setStuck(false);
  };

  return (
    <div className="relative flex flex-1 flex-col items-center gap-3">
      <button type="button" onClick={() => ask(target)} aria-label={`Make ${target.name}. Tap to hear.`} className="flex min-h-20 items-center gap-4 rounded-3xl bg-surface px-5 py-2 shadow-md active:scale-95">
        <span className="text-2xl font-extrabold">Make</span>
        <motion.span key={target.name} initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 12 }} className="size-16 rounded-full border-4 border-white shadow-md" style={{ background: colourOf(target) }} aria-hidden />
        <span className="text-3xl font-extrabold">{target.name}</span>
        <span className="text-2xl" aria-hidden>🔊</span>
      </button>

      {hint && (
        <p className="flex items-center gap-2 rounded-3xl bg-kid-yellow/40 px-4 py-1 text-lg font-bold" role="status">
          💡 Try <Dots recipe={target.recipe} />
        </p>
      )}

      <MixerStage mixer={mixer} onPour={onPour} hint={hint ? potsIn(target.recipe) : []} disabled={solved} />
      <NameChip counts={mixer.counts} />

      <div className="flex gap-3">
        <button type="button" onClick={pourOut} className={`min-h-touch rounded-3xl bg-kid-blue px-6 text-xl font-extrabold text-white shadow-md active:scale-95 ${stuck ? "animate-pulse ring-8 ring-kid-yellow" : ""}`}>
          🧽 Pour out
        </button>
        <button type="button" onClick={() => { setHint(true); audioManager.speak(`Try ${recipeSpeech(target.recipe)}.`); }} className="min-h-touch rounded-3xl bg-kid-yellow px-6 text-xl font-extrabold shadow-md active:scale-95">
          💡 Hint
        </button>
      </div>
      <p className="text-xl font-bold" aria-label={`${streak} made`}>🔥 {streak}</p>

      <AnimatePresence>
        {solved && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-x-0 top-[46%] flex flex-col items-center gap-1" role="status" aria-label="Correct">
            <StarBurst />
            <p className="rounded-3xl bg-surface px-5 py-2 text-3xl font-extrabold shadow-lg">You made {target.name.toLowerCase()}!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** What colour do these paints make? */
function Quiz() {
  const recent = useRef<string[]>([]);
  const makeRound = useCallback((streak: number): PickRoundData => {
    const q = mixQuestion(streak, new Set(recent.current));
    recent.current = [...recent.current, q.answer.name].slice(-4);
    const parts = recipeSpeech(q.answer.recipe);
    return {
      say: `What colour do ${parts} make?`,
      prompt: (
        <span className="flex items-center gap-2 text-4xl">
          <Dots recipe={q.answer.recipe} /> = ?
        </span>
      ),
      answerId: q.answer.name,
      choices: q.choices.map((c) => ({
        id: c.name,
        label: c.name,
        node: (
          <span className="flex flex-col items-center gap-2 text-2xl leading-tight sm:text-3xl">
            <span className={swatch} style={{ background: colourOf(c), width: 72, height: 72 }} aria-hidden />
            {c.name}
          </span>
        ),
      })),
      wrongSay: (c) => `That is ${c.label.toLowerCase()}. ${parts} make ${q.answer.name.toLowerCase()}.`,
      praise: `${parts} make ${q.answer.name.toLowerCase()}.`,
    };
  }, []);
  return <PickRound moduleId={MODULE} makeRound={makeRound} />;
}

const TABS = [
  ["mix", "🎨 Mix"],
  ["make", "🎯 Make it"],
  ["quiz", "🧩 Quiz"],
] as const;

export default function ColourMixerPage() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("mix");
  return (
    <PageContainer className="gap-3!">
      <ActivityHeader title="Colour Mixer" moduleId={MODULE} />
      <div className="flex justify-center gap-2" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`min-h-touch rounded-3xl px-5 text-xl font-bold shadow active:scale-95 ${tab === id ? "bg-kid-purple text-white" : "bg-surface"}`}>
            {label}
          </button>
        ))}
      </div>
      <ClientOnly>{tab === "mix" ? <Mix /> : tab === "make" ? <Make /> : <Quiz />}</ClientOnly>
    </PageContainer>
  );
}
