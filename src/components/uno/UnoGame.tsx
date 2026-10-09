"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChipRow, GameSettings } from "@/components/board-games/GameSettings";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { audioManager } from "@/lib/audio/AudioManager";
import { finishActivity } from "@/lib/activity";
import { botAction, canPlay, COLOURS, drawOne, isWild, newGame, passTurn, playable, playCard, top, type Card, type Colour, type Level, type UnoState } from "@/lib/board-games/uno";

const HEX: Record<Colour, string> = { red: "#ef4444", yellow: "#facc15", green: "#22c55e", blue: "#3b82f6" };
const OPP = [
  { name: "Robo", emoji: "🤖" },
  { name: "Froggy", emoji: "🐸" },
  { name: "Unicorn", emoji: "🦄" },
];
const LEVELS: { id: Level; icon: string; label: string }[] = [
  { id: "easy", icon: "🐣", label: "Easy" },
  { id: "medium", icon: "🐱", label: "Medium" },
  { id: "hard", icon: "🦁", label: "Hard" },
];
const SYMBOL: Record<string, string> = { skip: "🚫", reverse: "🔄", draw2: "+2", wild: "🌈", wild4: "+4" };
const ORDER: Record<string, number> = { red: 0, yellow: 1, green: 2, blue: 3, wild: 4 };
const stripEmoji = (s: string) => s.replace(/[\p{Extended_Pictographic}️]/gu, "").trim();

function cardLabel(c: Card) {
  const k = c.kind === "draw2" ? "draw two" : c.kind === "wild4" ? "wild draw four" : c.kind;
  return `${c.colour ?? ""} ${k}`.trim();
}

function UnoCard({ card, faceDown, small, glow, dim, onClick, label }: { card?: Card; faceDown?: boolean; small?: boolean; glow?: boolean; dim?: boolean; onClick?: () => void; label?: string }) {
  const size = small ? "h-12 w-9 rounded-lg border-2 text-sm sm:h-14 sm:w-10" : "h-24 w-16 rounded-xl border-[3px] text-3xl sm:h-28 sm:w-20 sm:rounded-2xl sm:border-4 sm:text-4xl";
  const common = `relative flex shrink-0 select-none items-center justify-center border-white font-extrabold shadow-lg ${size}`;
  const inner = faceDown || !card ? (
    <span className={`flex h-full w-full items-center justify-center rounded-[inherit] bg-gradient-to-br from-zinc-900 to-zinc-700 ${small ? "text-xs" : "text-xl"} text-rose-400`}>
      <span className="-rotate-12 rounded-full bg-rose-500 px-1 py-0.5 font-black text-yellow-200">UNO</span>
    </span>
  ) : (
    <span className="flex h-full w-full items-center justify-center rounded-[inherit]" style={{ background: card.colour ? HEX[card.colour] : "conic-gradient(#ef4444 0 25%, #facc15 0 50%, #22c55e 0 75%, #3b82f6 0 100%)" }}>
      <span className={`flex items-center justify-center rounded-[50%] bg-white text-ink ${small ? "h-7 w-5 text-sm sm:h-8 sm:w-6" : "h-16 w-11 text-2xl sm:h-20 sm:w-14 sm:text-3xl"}`} style={{ transform: "rotate(-18deg)" }}>
        <span style={{ transform: "rotate(18deg)", color: card.colour ? HEX[card.colour] : "#222" }}>{SYMBOL[card.kind] ?? card.kind}</span>
      </span>
      {!small && <span className="absolute left-1 top-0 text-sm text-white drop-shadow">{SYMBOL[card.kind] ?? card.kind}</span>}
    </span>
  );
  const cls = `${common} ${glow ? "ring-4 ring-white" : ""} ${dim ? "opacity-55 saturate-50" : ""}`;
  return onClick ? (
    <button type="button" aria-label={label ?? (card ? cardLabel(card) : "card")} onClick={onClick} className={`${cls} active:scale-95`}>
      {inner}
    </button>
  ) : (
    <span className={cls} aria-hidden={!label} aria-label={label}>
      {inner}
    </span>
  );
}

function Confetti() {
  const [bits] = useState(() => Array.from({ length: 30 }, (_, i) => ({ x: Math.random() * 100, delay: Math.random() * 1.2, dur: 2.4 + Math.random() * 1.6, e: ["🎉", "🎊", "⭐", "✨", "💖", "🌈"][i % 6], r: Math.random() * 360 })));
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
      {bits.map((b, i) => (
        <motion.span key={i} className="absolute -top-10 text-4xl" style={{ left: `${b.x}%` }} initial={{ y: -40, rotate: 0 }} animate={{ y: "110vh", rotate: b.r }} transition={{ duration: b.dur, delay: b.delay, ease: "easeIn" }}>
          {b.e}
        </motion.span>
      ))}
    </div>
  );
}

/** Uno against 1-3 bots: tap a glowing card to play it, tap the pile when nothing fits. */
export function UnoGame() {
  const reduced = useAppReducedMotion();
  const [opponents, setOpponents] = useState(1);
  const [level, setLevel] = useState<Level>("easy");
  const [game, setGame] = useState(0);
  const [state, setState] = useState<UnoState>(() => newGame(2));
  const [message, setMessage] = useState("Your turn! Match the colour or the number 👆");
  const [picking, setPicking] = useState<number | null>(null);
  const [flash, setFlash] = useState<{ player: number; n: number } | null>(null);
  const [shake, setShake] = useState(0);
  const [last, setLast] = useState({ player: 0, id: -1 });
  const rewarded = useRef(false);

  const name = useCallback((p: number) => (p === 0 ? "You" : OPP[p - 1].name), []);
  const say = useCallback((m: string, speak = false) => {
    setMessage(m);
    if (speak) audioManager.speak(stripEmoji(m));
  }, []);

  const start = useCallback((opp: number, lv: Level) => {
    setOpponents(opp);
    setLevel(lv);
    setGame((g) => g + 1);
    setState(newGame(opp + 1));
    setPicking(null);
    setMessage("Your turn! Match the colour or the number 👆");
    rewarded.current = false;
    setLast({ player: 0, id: -1 });
  }, []);

  const apply = useCallback(
    (p: number, cardId: number, colour?: Colour) => {
      const card = state.hands[p].find((c) => c.id === cardId)!;
      const r = playCard(state, p, cardId, colour);
      setLast({ player: p, id: cardId });
      audioManager.playNote(card.colour ? COLOURS.indexOf(card.colour) * 2 + 1 : 8);
      setState(r.state);
      const bits: string[] = [`${name(p)} played ${cardLabel(card)}`];
      if (r.effect.penalised) bits.push(`${name(r.effect.penalised.player)} picks up ${r.effect.penalised.count}!`);
      else if (r.effect.skipped !== null) bits.push(`${name(r.effect.skipped)} loses a turn!`);
      if (r.effect.reversed && !r.effect.skipped) bits.push("Direction changes! 🔄");
      if (isWild(card) && colour) bits.push(`Colour is now ${colour}`);
      const left = r.state.hands[p].length;
      if (r.state.winner !== null) {
        const won = p === 0;
        setMessage(won ? "You won! 🎉" : `${name(p)} won! Good game! 👏`);
        audioManager.play(won ? "success" : "reward");
        audioManager.speak(won ? "You won! Hooray!" : `${name(p)} won! Good game!`);
        if (won && !rewarded.current) {
          rewarded.current = true;
          void finishActivity("uno", { score: 1, variant: `${opponents}-${level}` });
        }
        return;
      }
      if (left === 1) {
        bits.push(`${name(p)} shouts UNO! 📣`);
        audioManager.speak("Uno!");
        setFlash({ player: p, n: Date.now() });
      }
      setMessage(bits.join(" · "));
      if (r.state.turn === 0) setTimeout(() => setMessage((m) => m + " · Your turn!"), 0);
    },
    [state, name, opponents, level],
  );

  // Bots take their turns after a short, readable pause.
  useEffect(() => {
    if (state.winner !== null || state.turn === 0 || picking !== null) return;
    const t = setTimeout(() => {
      const p = state.turn;
      const a = botAction(state, p, level);
      if (a.type === "play") apply(p, a.cardId, a.colour);
      else if (a.type === "draw") {
        const d = drawOne(state, p);
        setState(d.state);
        audioManager.playNote(0);
        setMessage(`${name(p)} picks up a card`);
      } else {
        setState(passTurn(state));
        setMessage(`${name(p)} passes`);
      }
    }, reduced ? 300 : 1100);
    return () => clearTimeout(t);
  }, [state, level, picking, apply, name, reduced]);

  const mine = useMemo(() => [...state.hands[0]].sort((a, b) => ORDER[a.colour ?? "wild"] - ORDER[b.colour ?? "wild"] || a.kind.localeCompare(b.kind)), [state.hands]);
  const canNow = useMemo(() => new Set(playable(state, 0).filter((c) => state.drew === null || c.id === state.drew).map((c) => c.id)), [state]);
  const myTurn = state.turn === 0 && state.winner === null;
  const mustDraw = myTurn && state.drew === null && canNow.size === 0;
  const drewCard = state.drew !== null ? state.hands[0].find((c) => c.id === state.drew) : undefined;

  // After drawing an unplayable card the turn passes by itself.
  useEffect(() => {
    if (!myTurn || state.drew === null) return;
    const c = state.hands[0].find((x) => x.id === state.drew);
    if (c && canPlay(c, state)) return;
    const t = setTimeout(() => {
      setState((s) => passTurn(s));
      setMessage("No match, so we pass. Next player!");
    }, 1100);
    return () => clearTimeout(t);
  }, [myTurn, state]);

  const tapCard = (c: Card) => {
    if (!myTurn) return;
    if (!canNow.has(c.id)) {
      setShake((n) => n + 1);
      audioManager.play("failure");
      say("That one doesn't match. Try the same colour or number! 🙂", true);
      return;
    }
    if (isWild(c)) setPicking(c.id);
    else apply(0, c.id);
  };

  const draw = () => {
    if (!mustDraw) {
      if (myTurn) say(canNow.size ? "You have a card to play! Look for the glowing ones ✨" : "", canNow.size > 0);
      return;
    }
    const d = drawOne(state, 0);
    setState(d.state);
    audioManager.playNote(2);
    say(d.canPlayIt ? "You picked up a card you can play! Play it or keep it 👇" : "You picked up a card. No match this time", true);
  };

  const topCard = top(state);
  const done = state.winner !== null;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {state.winner === 0 && <Confetti />}
      <div className="flex items-center justify-center gap-2">
        <GameSettings title="Game settings">
          {(close) => (
            <>
              <ChipRow label="Who are you playing?" value={opponents} options={[1, 2, 3].map((n) => ({ id: n, text: `👥 ${n + 1}`, aria: `${n} opponent${n > 1 ? "s" : ""}` }))} onPick={(n) => { start(n, level); close(); }} />
              <ChipRow label="How clever are they?" value={level} options={LEVELS.map((l) => ({ id: l.id, text: `${l.icon} ${l.label}` }))} onPick={(l) => { start(opponents, l); close(); }} />
            </>
          )}
        </GameSettings>
        <button type="button" onClick={() => start(opponents, level)} className={`min-h-14 rounded-2xl px-5 text-xl font-bold text-ink shadow-md active:scale-95 ${done ? "animate-bounce bg-kid-green" : "bg-kid-yellow"}`}>
          🔄 {done ? "Play again" : "New game"}
        </button>
        <span className="rounded-2xl bg-surface px-3 py-3 text-lg font-bold shadow" aria-label={`${LEVELS.find((l) => l.id === level)?.label} level`}>{LEVELS.find((l) => l.id === level)?.icon}</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 rounded-[1.5rem] bg-gradient-to-b from-emerald-600 to-emerald-800 p-2 shadow-inner sm:gap-3 sm:rounded-[2rem] sm:p-3" key={game}>
        {/* Opponents */}
        <div className="flex justify-around gap-2">
          {Array.from({ length: opponents }, (_, i) => i + 1).map((p) => (
            <motion.div key={p} animate={state.turn === p && !done ? { scale: 1.08, y: -2 } : { scale: 1, y: 0 }} className={`flex flex-col items-center gap-1 rounded-2xl p-2 ${state.turn === p && !done ? "bg-white/25 ring-4 ring-yellow-300" : "bg-black/15"}`}>
              <div className="flex items-center gap-1 text-white">
                <span className="text-3xl" aria-hidden>{OPP[p - 1].emoji}</span>
                <span className="font-extrabold">{OPP[p - 1].name}</span>
                <motion.span key={state.hands[p].length} initial={{ scale: 1.8 }} animate={{ scale: 1 }} className="rounded-full bg-white px-2 text-lg font-extrabold text-ink" aria-label={`${state.hands[p].length} cards`}>{state.hands[p].length}</motion.span>
              </div>
              <div className="flex -space-x-5">
                {state.hands[p].slice(0, 7).map((c, i) => (
                  <UnoCard key={c.id} faceDown small label={i === 0 ? `${OPP[p - 1].name} has ${state.hands[p].length} cards` : undefined} />
                ))}
              </div>
              <AnimatePresence>
                {flash?.player === p && state.hands[p].length === 1 && (
                  <motion.span key={flash.n} initial={{ scale: 0, rotate: -20 }} animate={{ scale: [0, 1.4, 1], rotate: 0 }} exit={{ scale: 0 }} className="rounded-full bg-rose-500 px-3 py-1 text-xl font-black text-yellow-100 shadow-lg">
                    UNO!
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Table */}
        <div className="flex min-h-0 flex-1 items-center justify-center gap-4 sm:gap-6">
          <button type="button" onClick={draw} aria-label="Draw a card" className={`relative rounded-2xl ${mustDraw && !reduced ? "animate-pulse ring-8 ring-yellow-300" : ""}`}>
            <span className="absolute left-1 top-1"><UnoCard faceDown /></span>
            <span className="absolute left-0.5 top-0.5"><UnoCard faceDown /></span>
            <UnoCard faceDown />
            <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2 text-sm font-bold text-ink shadow">{mustDraw ? "Tap me! 👆" : `${state.deck.length}`}</span>
          </button>
          <div className="relative flex h-28 w-24 items-center justify-center sm:h-32 sm:w-28">
            <span className="absolute inset-0 rounded-full opacity-30 blur-md" style={{ background: HEX[state.colour] }} aria-hidden />
            <AnimatePresence mode="popLayout">
              <motion.div
                key={topCard.id}
                initial={reduced ? false : { scale: 1.5, y: last.player === 0 ? 140 : -140, rotate: (last.id % 2 ? 1 : -1) * 40, opacity: 0 }}
                animate={{ scale: 1, y: 0, rotate: ((topCard.id * 37) % 21) - 10, opacity: 1 }}
                exit={{ opacity: 0.6 }}
                transition={{ type: "spring", stiffness: 220, damping: 16 }}
                className="relative"
              >
                <UnoCard card={topCard} label={`Top card: ${cardLabel(topCard)}`} />
                {isWild(topCard) && <span className="absolute -right-2 -top-2 h-8 w-8 rounded-full border-4 border-white shadow" style={{ background: HEX[state.colour] }} aria-label={`Colour is ${state.colour}`} />}
              </motion.div>
            </AnimatePresence>
          </div>
          <motion.div animate={reduced ? {} : { rotate: state.dir === 1 ? 360 : -360 }} transition={{ repeat: Infinity, duration: 6, ease: "linear" }} className="text-5xl text-white/80" aria-label={state.dir === 1 ? "Clockwise" : "Counter-clockwise"}>
            {state.dir === 1 ? "↻" : "↺"}
          </motion.div>
        </div>

        <p role="status" className="mx-auto max-w-md shrink-0 rounded-2xl bg-white px-3 py-1.5 text-center text-base font-extrabold leading-tight text-ink shadow-lg sm:px-4 sm:py-2 sm:text-lg">
          {message}
        </p>

        {/* Your hand */}
        <div className="flex shrink-0 flex-col items-center gap-1 sm:gap-2">
          <div className={`flex w-full items-center justify-center gap-2 ${myTurn ? "" : "opacity-90"}`}>
            <span className={`rounded-full px-3 py-1 text-lg font-extrabold ${myTurn ? "bg-yellow-300 text-ink" : "bg-black/20 text-white"}`}>🐯 You · {state.hands[0].length}</span>
            {drewCard && canPlay(drewCard, state) && myTurn && (
              <button type="button" onClick={() => { setState((s) => passTurn(s)); say("You kept it. Next player!"); }} className="min-h-12 rounded-2xl bg-white px-4 text-lg font-bold text-ink shadow active:scale-95">
                Keep it ⏭️
              </button>
            )}
          </div>
          <motion.div key={shake} animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : {}} transition={{ duration: 0.4 }} className="flex w-full max-w-full justify-center overflow-x-auto px-2 pb-1 pt-4">
            <div className="flex -space-x-8 sm:-space-x-5">
              <AnimatePresence initial={false}>
                {mine.map((c) => {
                  const ok = canNow.has(c.id) && myTurn;
                  return (
                    <motion.div
                      key={c.id}
                      layout={!reduced}
                      initial={reduced ? false : { y: -220, opacity: 0, scale: 0.6, rotate: 20 }}
                      animate={{ y: ok ? -16 : 0, opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ y: -260, opacity: 0, scale: 0.7 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      whileHover={ok && !reduced ? { y: -26 } : undefined}
                    >
                      <UnoCard card={c} glow={ok} dim={myTurn && !ok} onClick={() => tapCard(c)} />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Wild colour picker */}
      <AnimatePresence>
        {picking !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-label="Choose a colour">
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 14 }} className="flex flex-col items-center gap-4 rounded-3xl bg-surface p-6 shadow-2xl">
              <p className="text-3xl font-extrabold">Pick a colour! 🌈</p>
              <div className="grid grid-cols-2 gap-4">
                {COLOURS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={c}
                    onClick={() => {
                      const id = picking;
                      setPicking(null);
                      apply(0, id, c);
                    }}
                    className="h-24 w-24 rounded-3xl border-4 border-white shadow-lg active:scale-90"
                    style={{ background: HEX[c] }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
