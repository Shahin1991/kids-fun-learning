"use client";

import { useState } from "react";
import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import { ShakeOnWrong } from "@/components/ShakeOnWrong";
import { COUNT_OBJECTS } from "@/data/numbers";
import { audioManager } from "@/lib/audio/AudioManager";
import { finishActivity } from "@/lib/activity";
import { generateQuestion } from "@/lib/numbers/questions";

function NumbersGame() {
  const [level, setLevel] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [question, setQuestion] = useState(() => generateQuestion(0));
  const [wobble, setWobble] = useState<{ choice: number; n: number }>({ choice: -1, n: 0 });
  const emoji = COUNT_OBJECTS[(correct + level) % COUNT_OBJECTS.length];

  const answer = (choice: number) => {
    if (choice !== question.answer) {
      audioManager.play("failure");
      setWobble((w) => ({ choice, n: w.n + 1 }));
      return;
    }
    audioManager.playNote(Math.min(9, choice - 1));
    audioManager.speak(String(choice));
    const total = correct + 1;
    setCorrect(total);
    const nextLevel = total % 3 === 0 ? level + 1 : level;
    setLevel(nextLevel);
    if (total % 5 === 0) void finishActivity("numbers", { score: total });
    setQuestion(generateQuestion(nextLevel));
  };

  return (
    <PageContainer>
      <ActivityHeader title="Numbers" moduleId="numbers" />
      <p className="text-center text-4xl font-extrabold">{question.prompt}</p>
      <div className="flex min-h-40 flex-wrap items-center justify-center gap-2 text-6xl" aria-label={question.kind === "count" ? `${question.count} objects` : undefined}>
        {question.kind === "count" && Array.from({ length: question.count }, (_, i) => <span key={i}>{emoji}</span>)}
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        {question.choices.map((c) => (
          <ShakeOnWrong key={c} trigger={wobble.choice === c ? wobble.n : 0}>
            <button type="button" onClick={() => answer(c)} className="min-h-touch min-w-touch rounded-3xl bg-kid-blue px-8 text-5xl font-extrabold text-white shadow-md active:scale-95">
              {c}
            </button>
          </ShakeOnWrong>
        ))}
      </div>
    </PageContainer>
  );
}

export default function NumbersPage() {
  return (
    <ClientOnly>
      <NumbersGame />
    </ClientOnly>
  );
}
