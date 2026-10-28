"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { fallbackLine, nativeLine, SCRIPTS, type LetterGroup, type Script, type WorldLetter } from "@/data/world-letters";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import { arabicFont, devanagariFont } from "./fonts";
import { LetterTracer } from "./LetterTracer";

const MODULE_ID = "hindi-arabic";
const SAVE_KEY = "world-letters";
/** A star for every this many new letters heard, and for every this many letters traced. */
const HEARD_STAR = 8;
const TRACED_STAR = 3;

type Mode = "learn" | "trace";
interface Saved {
  script: Script;
  group: LetterGroup;
}

const BTN = "min-h-14 rounded-full px-4 text-xl font-bold shadow active:scale-95";

function load(): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) ?? "null") as Saved | null;
    const script = SCRIPTS.find((x) => x.id === s?.script);
    if (script && script.groups.some((g) => g.id === s?.group)) return s!;
  } catch {
    // storage unavailable
  }
  return { script: "hindi", group: "vowels" };
}

function Dots({ n }: { n: number }) {
  return (
    <span className="flex max-w-40 flex-wrap justify-center gap-1" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="h-5 w-5 rounded-full bg-kid-orange" />
      ))}
    </span>
  );
}

export default function WorldLetters() {
  const reduced = useAppReducedMotion();
  const [saved, setSaved] = useState<Saved>(load);
  const [mode, setMode] = useState<Mode>("learn");
  const [index, setIndex] = useState(0);
  const [cheer, setCheer] = useState(0);
  const heard = useRef(new Set<string>());
  const traced = useRef(0);
  const lastNote = useRef(-1);
  const advance = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexRef = useRef(index);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);
  useEffect(
    () => () => {
      if (advance.current) clearTimeout(advance.current);
    },
    [],
  );

  const script = SCRIPTS.find((s) => s.id === saved.script)!;
  const group = script.groups.find((g) => g.id === saved.group)!;
  const letters = group.letters;
  const current = letters[Math.min(index, letters.length - 1)];
  const font = script.id === "hindi" ? devanagariFont : arabicFont;

  const say = (l: WorldLetter) => audioManager.speakIn(script.lang, nativeLine(script.id, l), fallbackLine(script.id, l));

  const choose = (next: Saved) => {
    if (advance.current) clearTimeout(advance.current);
    setSaved(next);
    setIndex(0);
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable
    }
  };

  const pick = (i: number) => {
    const l = letters[i];
    setIndex(i);
    audioManager.playNote(i % 10);
    say(l);
    const key = `${script.id}:${l.char}`;
    if (!heard.current.has(key)) {
      heard.current.add(key);
      if (heard.current.size % HEARD_STAR === 0) void finishActivity(MODULE_ID, { score: heard.current.size, variant: "learn" });
    }
  };

  const step = (d: number) => {
    if (advance.current) clearTimeout(advance.current);
    const i = (indexRef.current + d + letters.length) % letters.length;
    lastNote.current = -1;
    setIndex(i);
    say(letters[i]);
  };

  // Say the letter when a trace starts, so the child hears what they are painting
  useEffect(() => {
    if (mode !== "trace") return;
    const t = setTimeout(() => say(current), 300);
    return () => clearTimeout(t);
    // Only when entering trace mode or changing set; ◀ ▶ speak for themselves
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, saved]);

  const traceDone = () => {
    traced.current++;
    setCheer((c) => c + 1);
    audioManager.play("success");
    const l = current;
    setTimeout(() => say(l), 500);
    if (traced.current % TRACED_STAR === 0) void finishActivity(MODULE_ID, { score: traced.current, variant: "trace" });
    advance.current = setTimeout(() => step(1), 3200);
  };

  const word = current.word;
  const letterCard = (
    <button
      type="button"
      onClick={() => say(current)}
      aria-label={`Hear ${current.sound} again`}
      className="flex w-full max-w-xl items-center justify-center gap-4 rounded-3xl bg-surface px-4 py-3 shadow-md active:scale-[0.98]"
    >
      <motion.span key={current.char} initial={reduced ? false : { scale: 0.4, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 380, damping: 14 }} className={`${font.className} text-8xl leading-tight font-bold text-kid-purple`}>
        {current.char}
      </motion.span>
      <span className="flex flex-col items-center gap-1">
        {current.value ? <Dots n={current.value} /> : word && <span className="text-6xl leading-none" aria-hidden>{word.emoji}</span>}
        {word && (
          <>
            <span className={`${font.className} text-3xl font-bold`} dir={script.rtl ? "rtl" : undefined}>
              {word.text}
            </span>
            <span className="text-base font-semibold opacity-70">
              {word.roman}
              {current.value ? "" : ` · ${word.meaning}`}
            </span>
          </>
        )}
        {!word && <span className="text-xl font-semibold opacity-70">“{current.sound}”</span>}
      </span>
      <span className="self-start text-2xl" aria-hidden>
        🔊
      </span>
    </button>
  );

  return (
    <div className="flex flex-1 flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {SCRIPTS.map((s) => (
          <button key={s.id} type="button" aria-pressed={s.id === script.id} aria-label={s.label} onClick={() => choose({ script: s.id, group: s.groups[0].id })} className={`${BTN} ${s.id === script.id ? "bg-kid-blue text-white" : "bg-surface"}`}>
            <span className={s.id === "hindi" ? devanagariFont.className : arabicFont.className}>{s.native}</span>
          </button>
        ))}
        <span className="mx-1 hidden h-8 w-px bg-foreground/20 sm:block" aria-hidden />
        {(["learn", "trace"] as const).map((m) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => {
              if (advance.current) clearTimeout(advance.current);
              setMode(m);
            }} className={`${BTN} ${mode === m ? "bg-kid-orange text-white" : "bg-surface"}`}>
            {m === "learn" ? "👀 Learn" : "✏️ Trace"}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Letter set">
        {script.groups.map((g) => (
          <button key={g.id} type="button" aria-pressed={g.id === group.id} aria-label={g.id} onClick={() => choose({ script: script.id, group: g.id })} className={`${BTN} ${font.className} ${g.id === group.id ? "bg-kid-green text-white" : "bg-surface"}`}>
            {g.label}
          </button>
        ))}
      </div>

      {mode === "learn" ? (
        <>
          {letterCard}
          <div dir={script.rtl ? "rtl" : "ltr"} className="grid w-full max-w-4xl gap-2 pb-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(5.25rem, 1fr))" }}>
            {letters.map((l, i) => (
              <motion.button
                key={l.char}
                type="button"
                whileTap={reduced ? undefined : { scale: 0.85 }}
                onClick={() => pick(i)}
                aria-label={l.word ? `${l.sound}, ${l.word.meaning}` : l.sound}
                className={`${font.className} min-h-touch rounded-2xl text-5xl font-bold shadow ${i === index ? "bg-kid-yellow text-ink ring-4 ring-kid-orange" : "bg-surface"}`}
              >
                {l.char}
              </motion.button>
            ))}
          </div>
        </>
      ) : (
        <div className="flex w-full flex-1 flex-col items-center gap-3 pb-4">
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Previous letter" onClick={() => step(script.rtl ? 1 : -1)} className="min-h-touch min-w-touch rounded-3xl bg-kid-blue text-3xl text-white shadow active:scale-95">
              ◀
            </button>
            <button type="button" onClick={() => say(current)} aria-label="Hear it" className="flex min-h-touch items-center gap-2 rounded-3xl bg-surface px-5 shadow active:scale-95">
              <span className={`${font.className} text-5xl font-bold`}>{current.char}</span>
              {word && !current.value && <span className="text-4xl" aria-hidden>{word.emoji}</span>}
              <span className="text-2xl" aria-hidden>🔊</span>
            </button>
            <button type="button" aria-label="Next letter" onClick={() => step(script.rtl ? -1 : 1)} className="min-h-touch min-w-touch rounded-3xl bg-kid-blue text-3xl text-white shadow active:scale-95">
              ▶
            </button>
          </div>
          <div className="relative" style={{ width: "max(16rem, min(36rem, 92vw, calc(100dvh - 24rem)))", height: "max(16rem, min(36rem, 92vw, calc(100dvh - 24rem)))" }}>
            <LetterTracer
              key={`${script.id}-${current.char}`}
              char={current.char}
              family={font.style.fontFamily}
              onProgress={(f) => {
                const n = Math.min(9, Math.floor(f * 10));
                if (n > lastNote.current) {
                  lastNote.current = n;
                  audioManager.playNote(n);
                }
              }}
              onDone={traceDone}
            />
            <AnimatePresence>
              {cheer > 0 && (
                <motion.div key={cheer} className="pointer-events-none absolute inset-0 flex items-center justify-center text-7xl" initial={{ opacity: 0, y: 20, scale: 0.5 }} animate={{ opacity: [0, 1, 1, 0], y: -20, scale: 1.2 }} transition={{ duration: 2 }} aria-hidden>
                  🌟🎉🌟
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
