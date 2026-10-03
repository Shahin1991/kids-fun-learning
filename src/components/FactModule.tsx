"use client";

import { useState } from "react";
import type { FactCategory, FactItem } from "@/data/facts";
import { audioManager } from "@/lib/audio/AudioManager";
import { ActivityHeader } from "./ActivityHeader";
import { Button } from "./Button";
import { ChoiceQuiz } from "./ChoiceQuiz";
import { ClientOnly } from "./ClientOnly";
import { PageContainer } from "./PageContainer";
import { SuccessPop } from "./SuccessPop";

/** Learn mode (tap to hear a fact) plus a quiz mode, shared by geography, science and vehicles. */
export function FactModule({ moduleId, title, categories }: { moduleId: string; title: string; categories: FactCategory[] }) {
  const [catId, setCatId] = useState(categories[0].id);
  const [mode, setMode] = useState<"learn" | "quiz">("learn");
  const [selected, setSelected] = useState<FactItem | null>(null);
  const cat = categories.find((c) => c.id === catId) ?? categories[0];

  const open = (item: FactItem, i: number) => {
    setSelected(item);
    audioManager.playNote(i % 10);
    audioManager.speak(item.sound ? `${item.label}. ${item.sound}` : `${item.label}. ${item.fact}`);
  };

  return (
    <PageContainer>
      <ActivityHeader title={title} moduleId={moduleId} />
      <div className="flex flex-wrap justify-center gap-2" role="tablist" aria-label="Topics">
        {categories.map((c) => (
          <Button
            key={c.id}
            role="tab"
            aria-selected={c.id === catId}
            variant={c.id === catId ? "primary" : "ghost"}
            onClick={() => {
              setCatId(c.id);
              setSelected(null);
            }}
          >
            {c.icon} {c.label}
          </Button>
        ))}
      </div>
      <div className="flex justify-center gap-2">
        <Button variant={mode === "learn" ? "secondary" : "ghost"} onClick={() => setMode("learn")}>Learn</Button>
        <Button variant={mode === "quiz" ? "secondary" : "ghost"} onClick={() => setMode("quiz")}>Quiz</Button>
      </div>
      {mode === "learn" ? (
        <>
          <div className="min-h-32 rounded-3xl bg-white p-4 text-center shadow-md" aria-live="polite">
            {selected ? (
              <SuccessPop key={selected.id} className="flex flex-col items-center gap-1">
                <span className="text-7xl" aria-hidden>{selected.emoji}</span>
                <span className="text-3xl font-extrabold">{selected.label}</span>
                <span className="text-xl">{selected.sound ? `${selected.sound} ${selected.fact}` : selected.fact}</span>
              </SuccessPop>
            ) : (
              <p className="pt-8 text-2xl">Tap one to learn about it!</p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {cat.items.map((item, i) => (
              <button key={item.id} type="button" aria-label={item.label} onClick={() => open(item, i)} className="flex min-h-touch flex-col items-center rounded-2xl bg-white p-2 shadow active:scale-95">
                <span className="text-5xl" aria-hidden>{item.emoji}</span>
                <span className="text-sm font-bold">{item.label}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <ClientOnly>
          <ChoiceQuiz key={cat.id} moduleId={moduleId} items={cat.items} />
        </ClientOnly>
      )}
    </PageContainer>
  );
}
