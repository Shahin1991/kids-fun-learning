"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import type { LabLesson } from "@/data/science-lab";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import { stepMs } from "@/lib/science-lab/timing";
import { SCENES } from "./scenes";

/** Parts of a scene the child taps or drags; a gesture that starts on one is not a swipe. */
const INTERACTIVE = "[role=button],[role=slider]";
const SWIPE_PX = 50;

const SPARKS = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2;
  const d = 110 + (i % 3) * 30;
  return { x: Math.cos(a) * d, y: Math.sin(a) * d * 0.75, e: ["✨", "⭐", "🌟"][i % 3] };
});

/** A one-off burst of stars over the scene when the last step is reached. */
function Cheer() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      <motion.span className="absolute text-8xl" initial={{ scale: 0, opacity: 1 }} animate={{ scale: [0, 1.3, 1], opacity: [1, 1, 0] }} transition={{ duration: 1.4, times: [0, 0.3, 1] }}>⭐</motion.span>
      {SPARKS.map((s, i) => (
        <motion.span key={i} className="absolute text-3xl" initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }} animate={{ x: s.x, y: s.y, scale: 1.2, opacity: 0 }} transition={{ duration: 1.1, ease: "easeOut", delay: (i % 4) * 0.04 }}>{s.e}</motion.span>
      ))}
    </div>
  );
}

/** Steps through one animated lesson: the scene, a spoken caption, big back / next buttons and an auto-play. */
export function LessonPlayer({ lesson, moduleId }: { lesson: LabLesson; moduleId: string }) {
  const reduced = useAppReducedMotion();
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(false);
  const [cheer, setCheer] = useState(0);
  const done = useRef(false);
  // the step `go` last moved to, so it can tell when the last step is newly reached
  const current = useRef(0);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const last = lesson.steps.length - 1;
  const Scene = SCENES[lesson.id];
  // auto-play simply stops being active on the last step
  const playing = auto && step < last;

  const go = useCallback(
    (n: number) => {
      const next = Math.max(0, Math.min(last, n));
      const prev = current.current;
      current.current = next;
      setStep(next);
      if (next === last && prev !== last) {
        setCheer((c) => c + 1);
        audioManager.play("reward");
      }
      if (next === last && !done.current) {
        done.current = true;
        void finishActivity(moduleId, { variant: lesson.id });
      }
    },
    [last, lesson.id, moduleId],
  );

  // Read each step aloud; the short delay lets the previous line be cut off cleanly when stepping quickly.
  useEffect(() => {
    const t = setTimeout(() => audioManager.speak(lesson.steps[step].say), 300);
    return () => clearTimeout(t);
  }, [lesson, step]);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => go(step + 1), stepMs(lesson.steps[step].say));
    return () => clearTimeout(t);
  }, [playing, step, go, lesson]);

  // arrow keys for grown-ups on a keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      setAuto(false);
      go(step + (e.key === "ArrowRight" ? 1 : -1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, step]);

  // Swipe the scene left or right to change step. Tapping or dragging a part of the scene pauses auto-play
  // instead, so the lesson doesn't move on while the child is playing with it.
  const down = (e: PointerEvent) => {
    if ((e.target as Element).closest(INTERACTIVE)) {
      setAuto(false);
      swipe.current = null;
    } else {
      swipe.current = { x: e.clientX, y: e.clientY };
    }
  };
  const up = (e: PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(e.clientY - s.y) * 1.5) return;
    setAuto(false);
    audioManager.playPaper(dx < 0);
    go(step + (dx < 0 ? 1 : -1));
  };

  const s = lesson.steps[step];
  return (
    <div className="flex flex-1 flex-col gap-3">
      <div
        className="relative mx-auto aspect-[4/3] w-full max-w-[min(42rem,calc(52dvh*4/3))] touch-pan-y overflow-hidden rounded-3xl border-4 border-white/80 bg-surface shadow-lg"
        onPointerDown={down}
        onPointerUp={up}
        onPointerCancel={() => (swipe.current = null)}
      >
        <Scene step={step} go={go} />
        {cheer > 0 && !reduced && <Cheer key={cheer} />}
      </div>

      <button type="button" onClick={() => audioManager.speak(s.say)} className="mx-auto flex w-full max-w-2xl items-start gap-3 rounded-3xl bg-surface p-4 text-left shadow-md active:scale-[0.98]" aria-label={`${s.title}. Tap to hear again.`}>
        <span className="text-4xl" aria-hidden>🔊</span>
        <motion.span key={step} className="flex flex-col" initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}>
          <span className="text-2xl font-extrabold">{s.title}</span>
          <span className="text-lg leading-snug opacity-90">{s.say}</span>
        </motion.span>
      </button>

      <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
        <button type="button" onClick={() => { setAuto(false); go(step - 1); }} disabled={step === 0} className="h-16 w-20 rounded-3xl bg-surface text-3xl font-extrabold shadow-md active:scale-95 disabled:opacity-30" aria-label="Back">◀</button>
        <div className="flex flex-1 items-center justify-center gap-2" role="tablist" aria-label="Steps">
          {lesson.steps.map((st, i) => (
            <button key={st.title} type="button" role="tab" aria-selected={i === step} aria-label={`Step ${i + 1}: ${st.title}`} onClick={() => { setAuto(false); go(i); }} className="flex size-8 items-center justify-center">
              <span className={`block rounded-full transition-all ${i === step ? "size-5 bg-kid-blue" : i < step ? "size-3.5 bg-kid-green" : "size-3.5 bg-ink/25"}`} />
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setAuto((a) => !a)} className={`h-16 w-20 rounded-3xl text-3xl shadow-md active:scale-95 ${playing ? "bg-kid-yellow" : "bg-surface"}`} aria-label={playing ? "Pause" : "Play automatically"}>{playing ? "⏸" : "▶️"}</button>
        {step < last ? (
          <button type="button" onClick={() => { setAuto(false); go(step + 1); }} className="h-16 w-24 rounded-3xl bg-kid-blue text-3xl font-extrabold text-white shadow-md active:scale-95" aria-label="Next">▶</button>
        ) : (
          <motion.button type="button" onClick={() => { setAuto(false); go(0); }} className="h-16 w-24 rounded-3xl bg-kid-green text-3xl font-extrabold text-white shadow-md active:scale-95" aria-label="Watch again" animate={reduced ? undefined : { scale: [1, 1.08, 1] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}>🔁</motion.button>
        )}
      </div>
    </div>
  );
}
