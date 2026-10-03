"use client";

import { useState } from "react";
import { ActivityHeader } from "@/components/ActivityHeader";
import { PageContainer } from "@/components/PageContainer";
import { SuccessPop } from "@/components/SuccessPop";
import { ALPHABET, type LetterEntry } from "@/data/alphabet";
import { audioManager } from "@/lib/audio/AudioManager";

export default function AlphabetPage() {
  const [current, setCurrent] = useState<LetterEntry | null>(null);

  const pick = (entry: LetterEntry, index: number) => {
    setCurrent(entry);
    audioManager.playNote(index % 10);
    audioManager.speak(`${entry.letter}. ${entry.letter} is for ${entry.word}`);
  };

  return (
    <PageContainer>
      <ActivityHeader title="Alphabet" moduleId="alphabet" />
      <div className="flex min-h-44 items-center justify-center rounded-3xl bg-white p-4 shadow-md" aria-live="polite">
        {current ? (
          <SuccessPop key={current.letter} className="flex items-center gap-6">
            <span className="text-8xl font-extrabold text-kid-blue">{current.letter}</span>
            <span className="text-7xl" aria-hidden>{current.emoji}</span>
            <span className="text-3xl font-bold">{current.word}</span>
          </SuccessPop>
        ) : (
          <p className="text-2xl">Tap a letter!</p>
        )}
      </div>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
        {ALPHABET.map((a, i) => (
          <button key={a.letter} type="button" onClick={() => pick(a, i)} className="min-h-touch rounded-2xl bg-white text-4xl font-extrabold shadow active:scale-95">
            {a.letter}
          </button>
        ))}
      </div>
    </PageContainer>
  );
}
