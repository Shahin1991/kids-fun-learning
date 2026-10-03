"use client";

import { useEffect, useRef, useState } from "react";
import { ActivityHeader } from "@/components/ActivityHeader";
import { Button } from "@/components/Button";
import { CarAnimation, type CarState } from "@/components/CarAnimation";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import { audioManager } from "@/lib/audio/AudioManager";
import { finishActivity } from "@/lib/activity";
import { generateRacerQuestion } from "@/lib/math/racer-questions";

const FINISH = 10;

function Race() {
  const [correct, setCorrect] = useState(0);
  const [question, setQuestion] = useState(() => generateRacerQuestion(0));
  const [car, setCar] = useState<CarState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const show = (state: CarState, ms: number) => {
    setCar(state);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCar("idle"), ms);
  };

  const answer = (choice: number) => {
    // A wrong answer only nudges the car back; the position never drops.
    if (choice !== question.answer) {
      audioManager.play("failure");
      show("drive-left", 650);
      return;
    }
    const next = correct + 1;
    audioManager.playNote(Math.min(9, next - 1));
    setCorrect(next);
    if (next >= FINISH) {
      audioManager.play("reward");
      setCar("celebrate");
      void finishActivity("math-racer", { score: next });
      return;
    }
    show("boost", 800);
    setQuestion(generateRacerQuestion(next));
  };

  const restart = () => {
    setCorrect(0);
    setQuestion(generateRacerQuestion(0));
    setCar("idle");
  };

  const done = correct >= FINISH;
  return (
    <>
      <div className="relative h-48 overflow-hidden rounded-3xl bg-slate-600" aria-label={`Progress ${correct} of ${FINISH}`}>
        <div className="road-stripes absolute inset-x-0 top-1/2 h-1.5" />
        <div className="absolute inset-y-0 right-3 flex items-center text-5xl" aria-hidden>🏁</div>
        <div className="absolute bottom-6 transition-[left] duration-700" style={{ left: `${2 + (correct / FINISH) * 62}%` }}>
          <CarAnimation state={car} />
        </div>
      </div>
      {done ? (
        <div className="flex flex-col items-center gap-4" role="status">
          <p className="text-4xl font-extrabold">🏆 You won the race!</p>
          <Button onClick={restart}>Race again</Button>
        </div>
      ) : (
        <>
          <p className="text-center text-6xl font-extrabold" aria-live="polite">{question.prompt} = ?</p>
          <div className="flex flex-wrap justify-center gap-4">
            {question.choices.map((c) => (
              <button key={c} type="button" onClick={() => answer(c)} className="min-h-touch min-w-28 rounded-3xl bg-kid-orange px-6 text-4xl font-extrabold text-white shadow-md active:scale-95">
                {c}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export default function MathRacerPage() {
  return (
    <PageContainer>
      <ActivityHeader title="Math Racer" moduleId="math-racer" />
      <ClientOnly>
        <Race />
      </ClientOnly>
    </PageContainer>
  );
}
