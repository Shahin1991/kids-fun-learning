"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { ActivityHeader } from "@/components/ActivityHeader";
import { Button } from "@/components/Button";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { BUBBLE_ITEMS, BUBBLE_MODES, type BubbleItem, type BubbleMode } from "@/data/bubble-pop";
import { audioManager } from "@/lib/audio/AudioManager";
import { finishActivity } from "@/lib/activity";
import { unlockAchievement } from "@/lib/rewards/RewardManager";

const GOAL = 10;

function pickRound(mode: BubbleMode, count: number) {
  const pool = [...BUBBLE_ITEMS[mode]].sort(() => Math.random() - 0.5).slice(0, count);
  return { bubbles: pool, target: pool[Math.floor(Math.random() * pool.length)] };
}

function Game({ mode, onBack }: { mode: BubbleMode; onBack: () => void }) {
  const reduced = useAppReducedMotion();
  const [popped, setPopped] = useState(0);
  const [round, setRound] = useState(() => pickRound(mode, 2));
  const [wobble, setWobble] = useState<{ id: string; n: number }>({ id: "", n: 0 });

  const ask = (r: typeof round) => audioManager.speak(`Pop the ${r.target.name}`);

  const tap = (b: BubbleItem) => {
    if (b.id !== round.target.id) {
      audioManager.play("failure");
      setWobble((w) => ({ id: b.id, n: w.n + 1 }));
      return;
    }
    audioManager.playNote(Math.min(9, popped));
    const total = popped + 1;
    setPopped(total);
    if (total === GOAL) {
      void finishActivity("bubble-pop", { score: total });
      void unlockAchievement("bubble-popper");
    }
    // Scaffolding: 2 bubbles, then up to 5 as the child pops more.
    const next = pickRound(mode, Math.min(5, 2 + Math.floor(total / 3)));
    setRound(next);
    ask(next);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>← Modes</Button>
        <span className="text-xl font-bold">Popped: {popped}</span>
      </div>
      <button type="button" onClick={() => ask(round)} className="mx-auto rounded-3xl bg-white px-6 py-3 text-3xl font-extrabold shadow">
        🔊 Pop the {round.target.name}!
      </button>
      <div className="flex flex-1 flex-wrap items-center justify-center gap-6">
        <AnimatePresence mode="popLayout">
          {round.bubbles.map((b, i) => (
            // CSS float lives on this wrapper, never on the motion element.
            <div key={`${popped}-${b.id}`} className={reduced ? "" : "animate-float"} style={{ animationDelay: `${i * 0.4}s` }}>
              <motion.button
                type="button"
                aria-label={b.name}
                onClick={() => tap(b)}
                initial={{ scale: 0 }}
                animate={wobble.id === b.id && !reduced ? { scale: 1, x: [0, -8, 8, -5, 5, 0] } : { scale: 1 }}
                exit={{ scale: 1.4, opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white/80 text-5xl font-extrabold shadow-lg"
                style={{ background: b.color ?? "rgba(160,210,255,0.6)" }}
                key={wobble.id === b.id ? wobble.n : 0}
              >
                {b.face}
              </motion.button>
            </div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}

export default function BubblePopPage() {
  const [mode, setMode] = useState<BubbleMode | null>(null);
  return (
    <PageContainer>
      <ActivityHeader title="Bubble Pop" moduleId="bubble-pop" />
      {mode ? (
        <ClientOnly>
          <Game key={mode} mode={mode} onBack={() => setMode(null)} />
        </ClientOnly>
      ) : (
        <div className="grid flex-1 grid-cols-2 content-center gap-4">
          {BUBBLE_MODES.map((m) => (
            <Button key={m.id} className="h-32" onClick={() => setMode(m.id)}>
              <span className="text-5xl">{m.icon}</span> {m.label}
            </Button>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
