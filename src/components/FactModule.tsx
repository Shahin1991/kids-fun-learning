"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type { FactCategory, FactItem } from "@/data/facts";
import { audioManager } from "@/lib/audio/AudioManager";
import { ActivityHeader } from "./ActivityHeader";
import { Button } from "./Button";
import { ChoiceQuiz } from "./ChoiceQuiz";
import { ClientOnly } from "./ClientOnly";
import { FactStage } from "./FactStage";
import { ItemArt } from "./ItemArt";
import { useAppReducedMotion } from "./ReducedMotionProvider";
import { PageContainer } from "./PageContainer";
import { SuccessPop } from "./SuccessPop";

/** Learn mode (tap to hear a fact) plus a quiz mode, shared by geography, science and vehicles. */
export function FactModule({ moduleId, title, categories }: { moduleId: string; title: string; categories: FactCategory[] }) {
  const [catId, setCatId] = useState(categories[0].id);
  const [mode, setMode] = useState<"learn" | "quiz">("learn");
  const [selected, setSelected] = useState<FactItem | null>(null);
  const reduced = useAppReducedMotion();
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
          <FactStage catId={cat.id} item={selected ?? cat.items[0]} speaking={Boolean(selected)} />
          <div className="min-h-24 rounded-3xl bg-surface p-4 text-center shadow-md" aria-live="polite">
            {selected ? (
              <SuccessPop key={selected.id} className="flex flex-col items-center gap-1">
                <span className="text-3xl font-extrabold">{selected.label}</span>
                <span className="text-xl">{selected.sound ? `${selected.sound} ${selected.fact}` : selected.fact}</span>
              </SuccessPop>
            ) : (
              <p className="pt-4 text-2xl">Tap one to watch it come alive!</p>
            )}
          </div>
          <div key={cat.id} className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {cat.items.map((item, i) => (
              <motion.button
                key={item.id}
                type="button"
                aria-label={item.label}
                aria-pressed={selected?.id === item.id}
                onClick={() => open(item, i)}
                initial={reduced ? false : { opacity: 0, y: 24, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 16, delay: reduced ? 0 : i * 0.05 }}
                whileHover={reduced ? undefined : { scale: 1.06, rotate: [0, -2, 2, 0] }}
                whileTap={{ scale: 0.86 }}
                className={`flex min-h-touch flex-col items-center rounded-2xl bg-surface p-2 shadow ${selected?.id === item.id ? "ring-4 ring-kid-blue" : ""}`}
              >
                <motion.div animate={reduced ? undefined : { y: [0, -4, 0] }} transition={{ duration: 2.4 + (i % 3) * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}>
                  <ItemArt art={item.art} emoji={item.emoji} label={item.label} size={72} />
                </motion.div>
                <span className="text-sm font-bold">{item.label}</span>
              </motion.button>
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
