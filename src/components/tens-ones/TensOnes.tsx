"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { ShakeOnWrong } from "@/components/ShakeOnWrong";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import { bundle, check, EMPTY, hasHundreds, isReadRound, levelFor, makeTarget, matsFor, readChoices, sayMats, valueOf, type Mats } from "@/lib/tens-ones/place-value";

const MODULE_ID = "tens-ones";
const STAR_EVERY = 3;
/** Loose pieces allowed on a mat before the child must bundle them. */
const MAX_LOOSE = 19;

function Stick({ h = 64 }: { h?: number }) {
  return (
    <svg width={h * 0.18} height={h} viewBox="0 0 12 70" aria-hidden>
      <rect x={1} y={1} width={10} height={68} rx={5} fill="#f2c46d" stroke="#b88a3a" strokeWidth={2} />
      <rect x={3} y={6} width={3} height={50} rx={1.5} fill="#fff" opacity={0.35} />
    </svg>
  );
}

function Bundle({ h = 64 }: { h?: number }) {
  return (
    <svg width={h * 0.72} height={h} viewBox="0 0 50 70" aria-hidden>
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={1 + i * 4.8} y={1} width={4.6} height={68} rx={2.3} fill={i % 2 ? "#f2c46d" : "#e9b85a"} stroke="#b88a3a" strokeWidth={1} />
      ))}
      <rect x={0} y={30} width={50} height={9} rx={3} fill="#ff5d6c" />
    </svg>
  );
}

function Hundred({ h = 64 }: { h?: number }) {
  return (
    <svg width={h} height={h} viewBox="0 0 70 70" aria-hidden>
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={1 + i * 6.8} y={1} width={6.6} height={68} rx={2} fill={i % 2 ? "#e9b85a" : "#f2c46d"} stroke="#b88a3a" strokeWidth={1} />
      ))}
      <rect x={0} y={24} width={70} height={8} rx={3} fill="#4d96ff" />
      <rect x={0} y={40} width={70} height={8} rx={3} fill="#4d96ff" />
      <text x={35} y={66} textAnchor="middle" fontSize={12} fontWeight={800} fill="#3b2f4a">
        100
      </text>
    </svg>
  );
}

function Mat({ label, count, color, children }: { label: string; count: number; color: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
      <span className={`w-full rounded-t-2xl ${color} py-1 text-center text-lg font-extrabold text-white`}>{label}</span>
      <div className="flex min-h-40 w-full flex-wrap content-start items-start justify-center gap-1 rounded-b-2xl bg-surface p-2 shadow-inner">{children}</div>
      <span className="text-5xl font-extrabold tabular-nums">{count}</span>
    </div>
  );
}

const ENTER = { initial: { y: -50, scale: 0.4, opacity: 0 }, animate: { y: 0, scale: 1, opacity: 1 }, exit: { x: -80, scale: 0.3, opacity: 0 } };

export default function TensOnes() {
  const reduced = useAppReducedMotion();
  const [solved, setSolved] = useState(0);
  const level = levelFor(solved);
  const [target, setTarget] = useState(() => makeTarget(0));
  const read = isReadRound(solved);
  const [mats, setMats] = useState<Mats>(EMPTY);
  const [choices, setChoices] = useState<number[]>([]);
  const [won, setWon] = useState(false);
  const [wobble, setWobble] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const hundreds = hasHundreds(level);

  const intro = (n: number, isRead: boolean) => audioManager.speak(isRead ? "What number is this? Count the bundles and the sticks." : `Make ${n}!`);

  useEffect(() => {
    const t = setTimeout(() => intro(target, false), 500);
    return () => clearTimeout(t);
    // Only the first round; later rounds are introduced as they start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const win = (line: string) => {
    setWon(true);
    audioManager.play("success");
    audioManager.speak(line);
    const n = solved + 1;
    if (n % STAR_EVERY === 0) void finishActivity(MODULE_ID, { score: n });
    timers.current.push(
      setTimeout(() => {
        const nextLevel = levelFor(n);
        const t = makeTarget(nextLevel);
        const isRead = isReadRound(n);
        setSolved(n);
        setTarget(t);
        setWon(false);
        setMats(isRead ? matsFor(t) : EMPTY);
        setChoices(isRead ? readChoices(t) : []);
        intro(t, isRead);
      }, 2800),
    );
  };

  const update = (m: Mats) => {
    setMats(m);
    const v = valueOf(m);
    const c = check(target, m);
    if (c === "match") win(`${sayMats(m)} make ${target}. Well done!`);
    else if (c === "bundle") audioManager.speak(`${v}! Ten sticks make a bundle of ten. Tap Bundle!`);
    else if (c === "less") {
      setWobble((w) => w + 1);
      audioManager.play("failure");
      audioManager.speak(`That's ${v}. A bit too many! Tap one on the mat to take it back.`);
    } else audioManager.speak(String(v));
  };

  const add = (key: keyof Mats) => {
    if (won || read) return;
    if (mats[key] >= MAX_LOOSE) {
      audioManager.speak("That's lots! Tap Bundle to tie ten together.");
      return;
    }
    audioManager.playNote(key === "ones" ? 2 : key === "tens" ? 5 : 8);
    update({ ...mats, [key]: mats[key] + 1 });
  };

  const remove = (key: keyof Mats) => {
    if (won || read || mats[key] === 0) return;
    audioManager.playNote(0);
    update({ ...mats, [key]: mats[key] - 1 });
  };

  const doBundle = () => {
    if (won) return;
    const next = bundle(mats);
    if (next === mats) return;
    audioManager.playPop(1);
    update(next);
  };

  const pick = (n: number) => {
    if (won) return;
    if (n === target) win(`Yes! ${sayMats(mats)} make ${target}!`);
    else {
      setWobble((w) => w + 1);
      audioManager.play("failure");
      audioManager.speak(`That's ${n}. Count again: ${sayMats(mats)}.`);
    }
  };

  const canBundle = !read && (mats.ones >= 10 || (hundreds && mats.tens >= 10));
  const BTN = "flex min-h-touch items-center gap-2 rounded-3xl px-4 text-xl font-extrabold shadow-md active:scale-95 disabled:opacity-40";

  const pieces = (key: keyof Mats, n: number, piece: ReactNode, name: string) => (
    <AnimatePresence initial={false}>
      {Array.from({ length: n }, (_, i) => (
        <motion.button key={`${key}-${i}`} type="button" onClick={() => remove(key)} disabled={read || won} aria-label={`Take back a ${name}`} className="rounded-md p-0.5 active:scale-90" {...(reduced ? {} : ENTER)} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
          {piece}
        </motion.button>
      ))}
    </AnimatePresence>
  );

  return (
    <div className="flex flex-1 flex-col items-center gap-4 pb-4">
      <button type="button" onClick={() => intro(target, read)} aria-label="Hear it again" className="rounded-3xl bg-surface px-6 py-2 shadow-md active:scale-95">
        <span className="text-sm font-bold opacity-60">🔊 {read ? "What number is this?" : "Make this number"}</span>
        <motion.span key={`${solved}-${target}`} className="block text-6xl font-extrabold text-kid-purple" initial={reduced ? false : { scale: 0.4 }} animate={{ scale: won ? [1, 1.3, 1] : 1 }}>
          {read ? "?" : target}
        </motion.span>
      </button>

      <ShakeOnWrong trigger={wobble} className="w-full max-w-3xl">
        <div className={`flex w-full gap-2 sm:gap-3 ${won ? "rounded-3xl ring-8 ring-kid-green" : ""}`}>
          {hundreds && (
            <Mat label="Hundreds" count={mats.hundreds} color="bg-kid-purple">
              {pieces("hundreds", mats.hundreds, <Hundred h={56} />, "hundred")}
            </Mat>
          )}
          <Mat label="Tens" count={mats.tens} color="bg-kid-blue">
            {pieces("tens", mats.tens, <Bundle h={60} />, "bundle of ten")}
          </Mat>
          <Mat label="Ones" count={mats.ones} color="bg-kid-green">
            {pieces("ones", mats.ones, <Stick h={60} />, "stick")}
          </Mat>
        </div>
      </ShakeOnWrong>

      {read ? (
        <ShakeOnWrong trigger={wobble}>
          <div className="flex flex-wrap justify-center gap-4">
            {choices.map((n) => (
              <button key={n} type="button" onClick={() => pick(n)} className={`min-h-touch min-w-32 rounded-3xl bg-surface px-5 text-5xl font-extrabold shadow-md active:scale-90 ${won && n === target ? "ring-8 ring-kid-green" : ""}`}>
                {n}
              </button>
            ))}
          </div>
        </ShakeOnWrong>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={() => add("ones")} disabled={won} className={`${BTN} bg-kid-green text-white`}>
            <Stick h={44} /> +1
          </button>
          {level >= 1 && (
            <button type="button" onClick={() => add("tens")} disabled={won} className={`${BTN} bg-kid-blue text-white`}>
              <Bundle h={44} /> +10
            </button>
          )}
          {hundreds && (
            <button type="button" onClick={() => add("hundreds")} disabled={won} className={`${BTN} bg-kid-purple text-white`}>
              <Hundred h={44} /> +100
            </button>
          )}
          <motion.button
            type="button"
            onClick={doBundle}
            disabled={!canBundle || won}
            className={`${BTN} bg-kid-orange text-white`}
            animate={canBundle && !reduced ? { scale: [1, 1.12, 1] } : { scale: 1 }}
            transition={{ repeat: canBundle ? Infinity : 0, duration: 0.8 }}
          >
            🪢 Bundle!
          </motion.button>
        </div>
      )}
      <p className="text-xl font-bold opacity-80" role="status">
        {sayMats(mats)} = {valueOf(mats)}
      </p>
    </div>
  );
}
