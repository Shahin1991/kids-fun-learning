"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type { TapItem } from "@/data/animals";
import { audioManager } from "@/lib/audio/AudioManager";
import { useAppReducedMotion } from "./ReducedMotionProvider";
import { ItemArt } from "./ItemArt";
import { ActivityHeader } from "./ActivityHeader";
import { PageContainer } from "./PageContainer";

/** Tap an item to hear its name and phrase, paired with a squash-and-stretch bounce and a pitched note. */
export function TapLearn({ moduleId, title, items }: { moduleId: string; title: string; items: TapItem[] }) {
  const reduced = useAppReducedMotion();
  const [active, setActive] = useState<string | null>(null);
  const [taps, setTaps] = useState(0);

  const tap = (item: TapItem, index: number) => {
    audioManager.playNote(index % 10);
    audioManager.speak(`${item.label}. ${item.phrase}`);
    setActive(item.id);
    setTaps((n) => n + 1);
  };

  return (
    <PageContainer>
      <ActivityHeader title={title} moduleId={moduleId} />
      <div className="grid flex-1 grid-cols-2 content-center gap-4 sm:grid-cols-3" data-taps={taps}>
        {items.map((item, i) => (
          <motion.button
            key={`${item.id}-${active === item.id ? taps : 0}`}
            type="button"
            aria-label={item.label}
            onClick={() => tap(item, i)}
            animate={active === item.id && !reduced ? { scale: [1, 1.2, 0.9, 1], scaleY: [1, 0.85, 1.1, 1] } : undefined}
            transition={{ duration: 0.5 }}
            className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-3xl p-4 shadow-md"
            style={{
              background: item.color ?? "white",
              boxShadow: active === item.id && item.color ? `0 0 40px 10px ${item.color}` : undefined,
            }}
          >
            <ItemArt art={item.art} emoji={item.emoji} label={item.label} size={88} />
            <span className={`text-2xl font-extrabold ${item.color ? "text-white drop-shadow" : ""}`}>{item.label}</span>
          </motion.button>
        ))}
      </div>
    </PageContainer>
  );
}
