"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { useAliveSleep } from "@/components/games/useAliveSleep";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import { BARS, checkCopy, extendTune, SONGS } from "@/lib/music-maker/music";

type Mode = "free" | "copy" | "songs";
const MODES: { id: Mode; icon: string; label: string }[] = [
  { id: "free", icon: "🎵", label: "Play" },
  { id: "copy", icon: "🦜", label: "Copy me" },
  { id: "songs", icon: "📖", label: "Songs" },
];

/** Eight rainbow bars, longest (lowest) on the left like a real xylophone. */
function Xylophone({ lit, glow, onTap, disabled }: { lit: number | null; glow: number | null; onTap: (i: number) => void; disabled?: boolean }) {
  const reduced = useAppReducedMotion();
  return (
    <div className="flex w-full max-w-3xl items-center justify-center gap-1.5 rounded-3xl bg-[#8d5524] p-3 shadow-xl sm:gap-3" role="group" aria-label="Xylophone">
      {BARS.map((b, i) => (
        <motion.button
          key={i}
          type="button"
          aria-label={`Note ${b.name}`}
          disabled={disabled}
          onPointerDown={(e) => {
            e.preventDefault();
            onTap(i);
          }}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onTap(i)}
          animate={lit === i && !reduced ? { scaleY: 0.92, y: 6 } : { scaleY: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 14 }}
          className={`relative flex min-w-0 flex-1 items-end justify-center rounded-2xl pb-3 text-xl font-extrabold text-white/90 shadow-md ${glow === i && !reduced ? "animate-pulse ring-8 ring-white" : glow === i ? "ring-8 ring-white" : ""}`}
          style={{ background: b.color, height: `${15 - i * 0.9}rem`, filter: lit === i ? "brightness(1.35)" : undefined }}
        >
          <span className="absolute left-1/2 top-3 h-3 w-3 -translate-x-1/2 rounded-full bg-white/70" aria-hidden />
          <span className="absolute bottom-10 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-white/70" aria-hidden />
          {b.name}
        </motion.button>
      ))}
    </div>
  );
}

function MusicMaker() {
  const sleep = useAliveSleep();
  const [mode, setMode] = useState<Mode>("free");
  const [lit, setLit] = useState<number | null>(null);
  const litTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** Bumped whenever a new tune starts or the mode changes, so an older playback stops. */
  const run = useRef(0);
  // Copy me
  const [tune, setTune] = useState<number[]>([]);
  const [taps, setTaps] = useState<number[]>([]);
  const [listening, setListening] = useState(false);
  const [copied, setCopied] = useState(0);
  // Songs
  const [song, setSong] = useState<number | null>(null);
  const [pos, setPos] = useState(0);
  const [msg, setMsg] = useState("Tap the bars to make music!");

  const strike = useCallback((i: number) => {
    audioManager.playBell(BARS[i].freq);
    setLit(i);
    clearTimeout(litTimer.current);
    litTimer.current = setTimeout(() => setLit(null), 220);
  }, []);

  useEffect(() => () => clearTimeout(litTimer.current), []);

  const playTune = async (t: number[]) => {
    const id = ++run.current;
    setListening(true);
    setMsg("Listen… 👂");
    if (!(await sleep(700)) || run.current !== id) return;
    for (const n of t) {
      strike(n);
      if (!(await sleep(620)) || run.current !== id) return;
    }
    setListening(false);
    setMsg("Your turn! 🦜");
    setTaps([]);
  };

  const startCopy = (len = 2) => {
    let t: number[] = [];
    for (let i = 0; i < len; i++) t = extendTune(t);
    setTune(t);
    void playTune(t);
  };

  const pickMode = (m: Mode) => {
    run.current++;
    setListening(false);
    setMode(m);
    setSong(null);
    setPos(0);
    if (m === "free") setMsg("Tap the bars to make music!");
    if (m === "copy") {
      audioManager.speak("Listen, then copy me!");
      startCopy();
    }
    if (m === "songs") {
      setMsg("Pick a song!");
      audioManager.speak("Pick a song!");
    }
  };

  const tap = (i: number) => {
    strike(i);
    if (mode === "copy" && !listening && tune.length) {
      const next = [...taps, i];
      const r = checkCopy(tune, next);
      if (r === "wrong") {
        // No penalty: just hear the same tune again.
        setMsg("Let's listen again 👂");
        audioManager.play("failure");
        void playTune(tune);
      } else if (r === "complete") {
        const n = copied + 1;
        setCopied(n);
        setMsg("You copied it! 🎉");
        audioManager.speak("You did it!");
        if (n % 3 === 0) void finishActivity("music-maker", { score: tune.length });
        const longer = extendTune(tune);
        setTune(longer);
        setTaps([]);
        setTimeout(() => void playTune(longer), 1300);
      } else setTaps(next);
    }
    if (mode === "songs" && song !== null) {
      const notes = SONGS[song].notes;
      if (i !== notes[pos]) return;
      const p = pos + 1;
      if (p >= notes.length) {
        setPos(0);
        setSong(null);
        setMsg(`You played ${SONGS[song].title}! 🎉`);
        audioManager.play("reward");
        audioManager.speak(`You played ${SONGS[song].title}! Bravo!`);
        void finishActivity("music-maker", { score: notes.length });
      } else setPos(p);
    }
  };

  const glow = mode === "songs" && song !== null ? SONGS[song].notes[pos] : null;

  return (
    <div className="flex flex-1 flex-col items-center gap-5">
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Mode">
        {MODES.map((m) => (
          <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => pickMode(m.id)} className={`flex min-h-touch items-center gap-2 rounded-3xl px-5 text-xl font-bold shadow active:scale-95 ${mode === m.id ? "bg-kid-purple text-white" : "bg-surface"}`}>
            <span aria-hidden>{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      <p className="min-h-10 text-center text-2xl font-extrabold" role="status">
        {msg}
        {mode === "copy" && tune.length > 0 && <span className="ml-2 text-lg opacity-60">({tune.length} notes)</span>}
      </p>

      {mode === "songs" && song === null && (
        <div className="grid w-full max-w-xl grid-cols-2 gap-3">
          {SONGS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSong(i);
                setPos(0);
                setMsg(`${s.title}: tap the glowing bar!`);
                audioManager.speak(`${s.title}. Tap the glowing bar!`);
              }}
              className="flex min-h-24 items-center gap-3 rounded-3xl bg-surface px-4 text-left text-xl font-bold shadow active:scale-95"
            >
              <span className="text-5xl" aria-hidden>{s.emoji}</span>
              {s.title}
            </button>
          ))}
        </div>
      )}

      <Xylophone lit={lit} glow={glow} onTap={tap} disabled={mode === "copy" && listening} />

      {mode === "copy" && !listening && tune.length > 0 && (
        <button type="button" onClick={() => void playTune(tune)} className="min-h-touch rounded-3xl bg-surface px-6 text-xl font-bold shadow active:scale-95">
          👂 Hear it again
        </button>
      )}
    </div>
  );
}

export default function MusicMakerPage() {
  return (
    <PageContainer>
      <ActivityHeader title="Music Maker" moduleId="music-maker" />
      <ClientOnly>
        <MusicMaker />
      </ClientOnly>
    </PageContainer>
  );
}
