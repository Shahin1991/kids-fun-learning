"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ActivityHeader } from "@/components/ActivityHeader";
import { Button } from "@/components/Button";
import { PageContainer } from "@/components/PageContainer";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { audioManager } from "@/lib/audio/AudioManager";
import { finishActivity } from "@/lib/activity";
import { getBestMoves } from "@/lib/progress/progress";
import { unlockAchievement } from "@/lib/rewards/RewardManager";

const FACES = [
  { emoji: "🐶", name: "Dog" }, { emoji: "🐱", name: "Cat" }, { emoji: "🐸", name: "Frog" }, { emoji: "🦁", name: "Lion" },
  { emoji: "🐼", name: "Panda" }, { emoji: "🐵", name: "Monkey" }, { emoji: "🦊", name: "Fox" }, { emoji: "🐰", name: "Rabbit" },
];
const LEVELS = {
  easy: { pairs: 3, cols: 3, icon: "🌱", label: "Easy", cards: 6, peek: 2200 },
  medium: { pairs: 6, cols: 4, icon: "🌟", label: "Medium", cards: 12, peek: 2600 },
  hard: { pairs: 8, cols: 4, icon: "🔥", label: "Hard", cards: 16, peek: 0 },
} as const;
type Level = keyof typeof LEVELS;

interface Card {
  id: number;
  emoji: string;
  name: string;
}

const BACK_COLORS = ["#9b51e0", "#4d96ff", "#ff6b6b", "#6bcb77"];

function deal(level: Level): Card[] {
  const faces = [...FACES].sort(() => Math.random() - 0.5).slice(0, LEVELS[level].pairs);
  return [...faces, ...faces].map((f, id) => ({ id, ...f })).sort(() => Math.random() - 0.5).map((c, id) => ({ ...c, id }));
}

/** Little burst of sparkles that flies out of a matched pair. */
function Sparkles({ at }: { at: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center" aria-hidden key={at}>
      {["✨", "⭐", "💫", "✨", "🌟", "💖"].map((s, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <motion.span key={i} className="absolute text-3xl" initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }} animate={{ x: Math.cos(a) * 70, y: Math.sin(a) * 70, scale: 1.3, opacity: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
            {s}
          </motion.span>
        );
      })}
    </div>
  );
}

/** Falling confetti for the win screen. */
function ConfettiRain() {
  const [bits] = useState(() => Array.from({ length: 28 }, (_, i) => ({ x: Math.random() * 100, delay: Math.random() * 1.2, dur: 2.2 + Math.random() * 1.6, e: ["🎉", "🎊", "⭐", "✨", "💖", "🌈"][i % 6], r: Math.random() * 360 })));
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
      {bits.map((b, i) => (
        <motion.span key={i} className="absolute -top-10 text-4xl" style={{ left: `${b.x}%` }} initial={{ y: -40, rotate: 0, opacity: 1 }} animate={{ y: "110vh", rotate: b.r }} transition={{ duration: b.dur, delay: b.delay, ease: "easeIn" }}>
          {b.e}
        </motion.span>
      ))}
    </div>
  );
}

function MemoryCard({ card, shown, matched, hint, burst, onFlip, reduced, index, color }: { card: Card; shown: boolean; matched: boolean; hint: boolean; burst: number; onFlip: () => void; reduced: boolean; index: number; color: string }) {
  return (
    <motion.div
      className="relative aspect-square w-full"
      style={{ perspective: 900 }}
      initial={reduced ? false : { opacity: 0, y: -60, rotate: -12, scale: 0.6 }}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: matched && !reduced ? [1, 1.18, 1] : 1 }}
      transition={{ delay: reduced ? 0 : index * 0.06, type: "spring", stiffness: 260, damping: 16, scale: { duration: 0.5 } }}
    >
      <motion.button
        type="button"
        aria-label={shown ? card.name : "Hidden card"}
        onClick={onFlip}
        className="relative h-full w-full rounded-3xl"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: shown ? 180 : 0, x: hint && !reduced ? [0, -5, 5, -4, 4, 0] : 0 }}
        transition={{ rotateY: { type: "spring", stiffness: 180, damping: 18 }, x: { duration: 0.6, repeat: hint ? Infinity : 0, repeatDelay: 1.2 } }}
        whileHover={reduced || shown ? undefined : { scale: 1.06 }}
        whileTap={reduced || shown ? undefined : { scale: 0.92 }}
      >
        {/* Back */}
        <span className="absolute inset-0 flex items-center justify-center rounded-3xl border-4 border-white/70 text-5xl shadow-lg" style={{ backfaceVisibility: "hidden", background: `repeating-linear-gradient(45deg, ${color}, ${color} 12px, color-mix(in srgb, ${color} 80%, white) 12px, color-mix(in srgb, ${color} 80%, white) 24px)` }}>
          <span className="drop-shadow">❓</span>
        </span>
        {/* Front */}
        <span className={`absolute inset-0 flex flex-col items-center justify-center gap-0 rounded-3xl border-4 bg-white text-ink shadow-lg ${matched ? "border-kid-green" : "border-kid-yellow"}`} style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
          <motion.span className="text-6xl leading-none sm:text-7xl" animate={matched && !reduced ? { rotate: [0, -12, 12, -8, 8, 0], scale: [1, 1.2, 1] } : {}} transition={{ duration: 0.7 }}>
            {card.emoji}
          </motion.span>
          {matched && <span className="text-base font-extrabold text-kid-green">{card.name}</span>}
        </span>
      </motion.button>
      {burst > 0 && <Sparkles at={burst} />}
    </motion.div>
  );
}

function Game({ level, onBack, onAgain }: { level: Level; onBack: () => void; onAgain: () => void }) {
  const cfg = LEVELS[level];
  const reduced = useAppReducedMotion();
  const [cards] = useState(() => deal(level));
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const [peeking, setPeeking] = useState(cfg.peek > 0);
  const [bursts, setBursts] = useState<Record<string, number>>({});
  const [hintFace, setHintFace] = useState<string | null>(null);
  const won = matched.length === cfg.pairs;

  useEffect(() => {
    getBestMoves("memory", level).then(setBest).catch(() => {});
  }, [level]);

  // Show everything for a moment at the start so a child can try to remember.
  useEffect(() => {
    if (!cfg.peek) return;
    audioManager.speak("Remember where everyone is hiding!");
    const t = setTimeout(() => setPeeking(false), cfg.peek);
    return () => clearTimeout(t);
  }, [cfg.peek]);

  // After a quiet spell, a pair wiggles to help; any flip resets the wait.
  useEffect(() => {
    if (won || peeking) return;
    const t = setTimeout(() => {
      const left = cards.filter((c) => !matched.includes(c.name));
      if (left.length) setHintFace(left[Math.floor(Math.random() * left.length)].name);
    }, 12000);
    return () => clearTimeout(t);
  }, [cards, matched, open.length, won, peeking]);

  const flip = (card: Card) => {
    if (peeking || won || open.length === 2 || open.includes(card.id) || matched.includes(card.name)) return;
    audioManager.playNote(card.id % 10);
    setHintFace(null);
    const next = [...open, card.id];
    setOpen(next);
    if (next.length < 2) {
      audioManager.speak(card.name);
      return;
    }
    const m = moves + 1;
    setMoves(m);
    const [a, b] = next.map((id) => cards.find((c) => c.id === id)!);
    if (a.name === b.name) {
      const done = [...matched, a.name];
      setTimeout(() => {
        setMatched(done);
        setOpen([]);
        setBursts((x) => ({ ...x, [a.name]: (x[a.name] ?? 0) + 1 }));
        audioManager.play("success");
        audioManager.speak(done.length === cfg.pairs ? `${a.name}! You found them all!` : `${a.name}! A pair!`);
        if (done.length === cfg.pairs) {
          void finishActivity("memory", { moves: m, variant: level });
          if (level === "hard") void unlockAchievement("memory-master");
        }
      }, 650);
    } else {
      // No penalty: the cards just turn back over.
      audioManager.speak(`${card.name}. Not a pair. Try again!`);
      setTimeout(() => setOpen([]), 1300);
    }
  };

  const stars = moves <= cfg.pairs + 2 ? 3 : moves <= cfg.pairs * 2 ? 2 : 1;
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={onBack} aria-label="Back to levels">⬅️</Button>
        <div className="flex flex-1 flex-wrap items-center justify-center gap-1 text-3xl" aria-label={`${matched.length} of ${cfg.pairs} pairs found`}>
          {Array.from({ length: cfg.pairs }, (_, i) => {
            const face = FACES.find((f) => f.name === matched[i]);
            return (
              <motion.span key={i} animate={face ? { scale: [0, 1.4, 1] } : { scale: 1 }} className={`flex h-11 w-11 items-center justify-center rounded-full ${face ? "bg-kid-green/30" : "border-2 border-dashed border-foreground/30"}`}>
                {face?.emoji ?? ""}
              </motion.span>
            );
          })}
        </div>
        <span className="rounded-2xl bg-surface px-3 py-2 text-xl font-bold shadow" aria-label={`${moves} moves`}>👆 {moves}{best !== null && <span className="text-sm opacity-70"> · ⭐ {best}</span>}</span>
      </div>
      <AnimatePresence>
        {peeking && (
          <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center text-3xl font-extrabold" role="status">
            👀 Remember where they hide!
          </motion.p>
        )}
      </AnimatePresence>
      <div className="mx-auto grid w-full max-w-xl flex-1 content-center gap-3" style={{ gridTemplateColumns: `repeat(${cfg.cols}, minmax(0, 1fr))` }}>
        {cards.map((c, i) => (
          <MemoryCard
            key={c.id}
            card={c}
            index={i}
            color={BACK_COLORS[(c.id + Math.floor(c.id / cfg.cols)) % BACK_COLORS.length]}
            shown={peeking || open.includes(c.id) || matched.includes(c.name)}
            matched={matched.includes(c.name)}
            hint={hintFace === c.name && !matched.includes(c.name) && !peeking}
            burst={bursts[c.name] ?? 0}
            onFlip={() => flip(c)}
            reduced={reduced}
          />
        ))}
      </div>
      <AnimatePresence>
        {won && (
          <>
            <ConfettiRain />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-label="You won">
              <motion.div initial={{ scale: 0.3, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 220, damping: 12 }} className="flex flex-col items-center gap-4 rounded-3xl bg-surface p-8 text-center shadow-2xl">
                <motion.span className="text-8xl" animate={reduced ? {} : { y: [0, -16, 0], rotate: [0, -8, 8, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}>🏆</motion.span>
                <p className="text-4xl font-extrabold">You found them all!</p>
                <div className="flex gap-2 text-6xl" aria-label={`${stars} stars`}>
                  {[1, 2, 3].map((n) => (
                    <motion.span key={n} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.5 + n * 0.3, type: "spring", stiffness: 300, damping: 10 }} className={n <= stars ? "" : "opacity-25 grayscale"}>⭐</motion.span>
                  ))}
                </div>
                <p className="text-xl font-bold">{moves} moves</p>
                <div className="flex gap-3">
                  <Button onClick={onAgain}>🔄 Again</Button>
                  <Button variant="ghost" onClick={onBack}>⬅️ Levels</Button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default function MemoryPage() {
  const [level, setLevel] = useState<Level | null>(null);
  const [gameNo, setGameNo] = useState(0);
  const start = (l: Level) => {
    setGameNo((n) => n + 1);
    setLevel(l);
  };
  return (
    <PageContainer>
      <ActivityHeader title="Memory Match" moduleId="memory" />
      {level ? (
        <Game key={gameNo} level={level} onBack={() => setLevel(null)} onAgain={() => start(level)} />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-5">
          <motion.p initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-3xl font-extrabold">Pick a game!</motion.p>
          {(Object.keys(LEVELS) as Level[]).map((l, i) => (
            <motion.button
              key={l}
              type="button"
              onClick={() => {
                audioManager.play("success");
                start(l);
              }}
              initial={{ x: -80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.12, type: "spring", stiffness: 200, damping: 16 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.93 }}
              className="flex min-h-24 w-80 items-center gap-4 rounded-3xl bg-surface px-6 py-4 text-left shadow-lg"
            >
              <span className="text-6xl">{LEVELS[l].icon}</span>
              <span className="flex flex-col">
                <span className="text-3xl font-extrabold">{LEVELS[l].label}</span>
                <span className="text-lg opacity-70">{"🃏".repeat(Math.min(6, LEVELS[l].pairs))} {LEVELS[l].cards} cards</span>
              </span>
            </motion.button>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
