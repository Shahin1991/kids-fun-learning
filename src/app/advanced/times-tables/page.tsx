"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { PickRound, type PickRoundData } from "@/components/games/PickRound";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import { skipCount, timesRound } from "@/lib/times-tables/round";

const TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10];
/** One thing to count per table, so each table has its own picture. */
const ITEMS: Record<number, string> = { 2: "🧦", 3: "🍀", 4: "🐞", 5: "⭐", 6: "🍪", 7: "🌈", 8: "🐙", 9: "🍓", 10: "🎈" };
const MAX_GROUPS = 10;

/** a rows of b dots, rows in alternating colours so they are easy to count along. */
function Dots({ a, b }: { a: number; b: number }) {
  const cell = 22;
  return (
    <svg viewBox={`0 0 ${b * cell} ${a * cell}`} style={{ width: Math.max(b, 3) * 22 }} className="h-auto" role="img" aria-label={`${a} rows of ${b}`}>
      {Array.from({ length: a * b }, (_, i) => {
        const row = Math.floor(i / b);
        return <circle key={i} cx={(i % b) * cell + cell / 2} cy={row * cell + cell / 2} r={cell * 0.38} fill={row % 2 ? "#4dabf7" : "#ff6b6b"} />;
      })}
    </svg>
  );
}

/** Build "3 groups of 4" one plate at a time; the sum and the times sentence grow with it. */
function Groups() {
  const reduced = useAppReducedMotion();
  const [table, setTable] = useState(2);
  const [groups, setGroups] = useState(1);
  const finished = useRef(new Set<number>());
  const item = ITEMS[table];
  const total = groups * table;

  const pickTable = (n: number) => {
    setTable(n);
    setGroups(1);
    audioManager.playPop(0);
    audioManager.speak(`The ${n} times table. Tap plus to add a group of ${n}.`);
  };

  const add = () => {
    if (groups >= MAX_GROUPS) return;
    const g = groups + 1;
    setGroups(g);
    audioManager.playNote(g - 1);
    audioManager.speak(`${g} groups of ${table} is ${g * table}`);
    if (g === MAX_GROUPS && !finished.current.has(table)) {
      finished.current.add(table);
      void finishActivity("times-tables", { variant: `groups-${table}` });
    }
  };

  const remove = () => {
    if (groups <= 1) return;
    const g = groups - 1;
    setGroups(g);
    audioManager.playPaper(false);
    audioManager.speak(`${g} ${g === 1 ? "group" : "groups"} of ${table} is ${g * table}`);
  };

  return (
    <div className="flex flex-1 flex-col items-center gap-4">
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Times tables">
        {TABLES.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={table === n}
            aria-label={`${n} times table`}
            onClick={() => pickTable(n)}
            className={`h-14 w-14 rounded-2xl text-2xl font-extrabold shadow active:scale-90 ${table === n ? "bg-kid-purple text-white" : "bg-surface"}`}
          >
            {n}
          </button>
        ))}
      </div>

      <p className="text-center text-4xl font-extrabold sm:text-5xl" aria-live="polite">
        {groups} × {table} = <span className="text-kid-purple">{total}</span>
      </p>
      <p className="text-center text-lg font-bold opacity-80 sm:text-2xl">
        {groups} {groups === 1 ? "group" : "groups"} of {table}: {Array(groups).fill(table).join(" + ")} = {total}
      </p>

      <div className="flex gap-4">
        <button type="button" onClick={remove} disabled={groups <= 1} aria-label="Take a group away" className="h-20 w-20 rounded-3xl bg-surface text-4xl font-extrabold shadow-md active:scale-90 disabled:opacity-40">
          ➖
        </button>
        <button type="button" onClick={add} disabled={groups >= MAX_GROUPS} className="h-20 rounded-3xl bg-kid-green px-6 text-2xl font-extrabold text-white shadow-md active:scale-95 disabled:opacity-40">
          ➕ Add a group
        </button>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <AnimatePresence initial={false}>
          {Array.from({ length: groups }, (_, g) => (
            <motion.button
              key={`${table}-${g}`}
              type="button"
              aria-label={`Group ${g + 1}: ${(g + 1) * table} so far`}
              onClick={() => audioManager.speak(String((g + 1) * table))}
              initial={reduced ? false : { scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { scale: 0.3, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className="flex w-32 flex-col items-center gap-1 rounded-3xl bg-surface p-2 shadow-md active:scale-95 sm:w-44"
            >
              <span className="flex max-w-[5.5em] flex-wrap justify-center gap-0.5 text-2xl leading-none sm:text-3xl" aria-hidden>
                {Array.from({ length: table }, (_, i) => (
                  <span key={i}>{item}</span>
                ))}
              </span>
              <span className="rounded-full bg-kid-purple px-2 text-lg font-extrabold text-white">{(g + 1) * table}</span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}

/** The times grid: tap a square to light up that many rows and columns and hear the fact. */
function Grid() {
  const [sel, setSel] = useState<{ r: number; c: number } | null>(null);
  const seen = useRef(new Set<string>());

  const tap = (r: number, c: number) => {
    setSel({ r, c });
    audioManager.playNote(Math.min(9, Math.floor((r * c) / 11)));
    audioManager.speak(r === c ? `${r} times ${c} is ${r * c}` : `${r} times ${c} is ${r * c}. And ${c} times ${r} is ${r * c} too!`);
    seen.current.add(`${r}x${c}`);
    if (seen.current.size === 10) void finishActivity("times-tables", { variant: "grid" });
  };

  return (
    <div className="flex flex-1 flex-col items-center gap-3">
      <p className="min-h-12 text-center text-4xl font-extrabold" aria-live="polite">
        {sel ? (
          <>
            {sel.r} × {sel.c} = <span className="text-kid-purple">{sel.r * sel.c}</span>
          </>
        ) : (
          "Tap a number"
        )}
      </p>
      <div className="grid w-full max-w-xl grid-cols-10 gap-1" role="grid" aria-label="Times grid">
        {Array.from({ length: 100 }, (_, i) => {
          const r = Math.floor(i / 10) + 1;
          const c = (i % 10) + 1;
          const lit = sel && r <= sel.r && c <= sel.c;
          const picked = sel?.r === r && sel?.c === c;
          return (
            <button
              key={i}
              type="button"
              aria-label={`${r} times ${c}`}
              onClick={() => tap(r, c)}
              className={`aspect-square rounded-md text-sm font-bold shadow-sm active:scale-90 sm:rounded-lg sm:text-xl ${picked ? "bg-kid-purple text-white" : lit ? "bg-kid-yellow" : r === 1 || c === 1 ? "bg-surface font-extrabold" : "bg-surface/60"}`}
            >
              {r * c}
            </button>
          );
        })}
      </div>
      {sel && sel.r !== sel.c && (
        <p className="text-center text-lg font-bold opacity-80">
          {sel.r} rows of {sel.c}, or {sel.c} rows of {sel.r}: both make {sel.r * sel.c}
        </p>
      )}
    </div>
  );
}

function makeRound(streak: number): PickRoundData {
  const q = timesRound(streak);
  return {
    say: `What is ${q.a} times ${q.b}?`,
    prompt: (
      <span className="flex flex-col items-center gap-2">
        <Dots a={q.a} b={q.b} />
        <span className="text-4xl">
          {q.a} × {q.b} = ?
        </span>
      </span>
    ),
    answerId: String(q.answer),
    choices: q.choices.map((n) => ({ id: String(n), label: String(n), node: <span>{n}</span> })),
    wrongSay: (c) => `Not ${c.label}. That's ${q.a} rows of ${q.b}. Count in ${q.b}s: ${skipCount(q.a, q.b).join(", ")}.`,
    praise: `${q.a} times ${q.b} is ${q.answer}!`,
  };
}

const TABS = [
  ["groups", "🍪 Groups"],
  ["grid", "🔢 Grid"],
  ["quiz", "⭐ Quiz"],
] as const;

export default function TimesTablesPage() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("groups");
  return (
    <PageContainer>
      <ActivityHeader title="Times Tables" moduleId="times-tables" />
      <div className="flex flex-wrap justify-center gap-2" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`min-h-touch rounded-3xl px-5 text-xl font-bold shadow active:scale-95 ${tab === id ? "bg-kid-purple text-white" : "bg-surface"}`}>
            {label}
          </button>
        ))}
      </div>
      <ClientOnly>
        {tab === "groups" && <Groups />}
        {tab === "grid" && <Grid />}
        {tab === "quiz" && <PickRound moduleId="times-tables" makeRound={makeRound} />}
      </ClientOnly>
    </PageContainer>
  );
}
