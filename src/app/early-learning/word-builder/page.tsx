"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { ShakeOnWrong } from "@/components/ShakeOnWrong";
import { shuffled } from "@/components/games/PickRound";
import { CVC_WORDS } from "@/data/cvc-words";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import { makePuzzle, nextSlot, placeTile, type WordPuzzle } from "@/lib/word-builder/puzzle";

const STAR_EVERY = 3;

function Game() {
  const reduced = useAppReducedMotion();
  const [order] = useState(() => shuffled(CVC_WORDS));
  const [built, setBuilt] = useState(0);
  const [entry, setEntry] = useState(order[0]);
  const [puzzle, setPuzzle] = useState<WordPuzzle>(() => makePuzzle(order[0].word, 0));
  const [wobble, setWobble] = useState({ i: -1, n: 0 });
  const [done, setDone] = useState(false);

  const sayWord = useCallback((p: WordPuzzle) => {
    const at = nextSlot(p);
    audioManager.speak(at < 0 ? p.word : `${p.word}. Find the letter for the ${["first", "middle", "last"][at] ?? "next"} sound.`);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => sayWord(puzzle), 600);
    return () => clearTimeout(t);
    // Only for the first word; later words are announced when they appear.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nextWord = (count: number) => {
    const e = order[count % order.length];
    // One more blank every 3 words, decoy tiles after that.
    const p = makePuzzle(e.word, Math.floor(count / 3));
    setEntry(e);
    setPuzzle(p);
    setDone(false);
    sayWord(p);
  };

  const tap = (i: number) => {
    if (done) return;
    const letter = puzzle.tiles[i];
    const r = placeTile(puzzle, i);
    if (!r.ok) {
      audioManager.play("failure");
      audioManager.speak(`That's ${letter}. Listen: ${puzzle.word}.`);
      setWobble((w) => ({ i, n: w.n + 1 }));
      return;
    }
    audioManager.playNote(nextSlot(puzzle) + 3);
    setPuzzle(r.puzzle);
    if (!r.done) {
      audioManager.speak(letter);
      return;
    }
    setDone(true);
    const count = built + 1;
    setBuilt(count);
    audioManager.play("success");
    // Sound it out, then say the whole word.
    audioManager.speak(`${puzzle.word.split("").join(", ")}. ${puzzle.word}! You built ${puzzle.word}!`);
    if (count % STAR_EVERY === 0) void finishActivity("word-builder", { score: count });
    setTimeout(() => nextWord(count), 3200);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8">
      <button type="button" onClick={() => sayWord(puzzle)} aria-label={`Hear the word ${entry.word}`} className="flex items-center gap-3 rounded-3xl bg-surface px-8 py-4 shadow-md active:scale-95">
        <span aria-hidden className="text-3xl">🔊</span>
        <motion.span key={entry.word} initial={reduced ? false : { scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} className="text-8xl" aria-hidden>
          {entry.emoji}
        </motion.span>
      </button>

      <div className="flex gap-3" aria-label="Word slots">
        {puzzle.slots.map((s, i) => (
          <div
            key={i}
            className={`flex h-24 w-20 items-center justify-center rounded-2xl text-6xl font-extrabold shadow-inner sm:h-28 sm:w-24 ${s ? "bg-kid-yellow text-ink" : "border-4 border-dashed border-foreground/30 bg-surface"} ${done ? "ring-8 ring-kid-green" : ""}`}
            aria-label={s ?? "empty"}
          >
            {s}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        <AnimatePresence>
          {puzzle.tiles.map((t, i) => (
            <motion.div key={`${puzzle.word}-${t}-${i}`} initial={reduced ? false : { y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
              <ShakeOnWrong trigger={wobble.i === i ? wobble.n : 0}>
                <button type="button" onClick={() => tap(i)} aria-label={`Letter ${t}`} className="flex h-24 w-24 items-center justify-center rounded-3xl bg-kid-blue text-6xl font-extrabold text-white shadow-lg active:scale-90">
                  {t}
                </button>
              </ShakeOnWrong>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <p className="text-center text-lg opacity-70" role="status">
        {done ? `🎉 ${entry.word}!` : "Tap the letters to build the word"}
      </p>
    </div>
  );
}

export default function WordBuilderPage() {
  return (
    <PageContainer>
      <ActivityHeader title="Word Builder" moduleId="word-builder" />
      <ClientOnly>
        <Game />
      </ClientOnly>
    </PageContainer>
  );
}
