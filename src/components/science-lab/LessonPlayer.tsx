"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LabLesson } from "@/data/science-lab";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import { SCENES } from "./scenes";

const AUTO_MS = 7000;

/** Steps through one animated lesson: the scene, a spoken caption, big back / next buttons and an auto-play. */
export function LessonPlayer({ lesson, moduleId }: { lesson: LabLesson; moduleId: string }) {
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(false);
  const done = useRef(false);
  const last = lesson.steps.length - 1;
  const Scene = SCENES[lesson.id];
  // auto-play simply stops being active on the last step
  const playing = auto && step < last;

  const go = useCallback(
    (n: number) => {
      const next = Math.max(0, Math.min(last, n));
      setStep(next);
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
    const t = setTimeout(() => go(step + 1), AUTO_MS);
    return () => clearTimeout(t);
  }, [playing, step, go]);

  const s = lesson.steps[step];
  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="relative mx-auto aspect-[4/3] w-full max-w-[min(42rem,calc(52dvh*4/3))] overflow-hidden rounded-3xl border-4 border-white/80 bg-surface shadow-lg">
        <Scene step={step} go={go} />
      </div>

      <button type="button" onClick={() => audioManager.speak(s.say)} className="mx-auto flex w-full max-w-2xl items-start gap-3 rounded-3xl bg-surface p-4 text-left shadow-md active:scale-[0.98]" aria-label={`${s.title}. Tap to hear again.`}>
        <span className="text-4xl" aria-hidden>🔊</span>
        <span className="flex flex-col">
          <span className="text-2xl font-extrabold">{s.title}</span>
          <span className="text-lg leading-snug opacity-90">{s.say}</span>
        </span>
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
          <button type="button" onClick={() => { setAuto(false); go(0); }} className="h-16 w-24 rounded-3xl bg-kid-green text-3xl font-extrabold text-white shadow-md active:scale-95" aria-label="Watch again">🔁</button>
        )}
      </div>
    </div>
  );
}
