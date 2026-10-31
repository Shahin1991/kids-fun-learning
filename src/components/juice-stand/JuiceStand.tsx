"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";
import { Burst } from "@/components/Burst";
import { CoinArt } from "@/components/CoinArt";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { ShakeOnWrong } from "@/components/ShakeOnWrong";
import { shuffled } from "@/components/games/PickRound";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import { CUSTOMERS, type Customer } from "@/lib/cake-bakery/recipe";
import { changeFor, COINS, CURRENCY_NAMES, currencyForLocale, formatMoney, sayMoney, total, type Coin, type Currency } from "@/lib/coin-shop/money";
import { addFruit, coinsFor, fruitById, fruitsFor, isChangeRound, juiceColor, makeOrder, orderText, priceOf, type Blender, type OrderLine } from "@/lib/juice-stand/juice";

const MODULE_ID = "juice-stand";
/** Shared with Coin Shop, so a family picks their money once. */
const CUR_KEY = "coin-shop-currency";
const STAR_EVERY = 3;
const BLEND_MS = 1800;

type Phase = "order" | "ready" | "blending" | "serve" | "pay" | "change" | "bye";

interface Visit {
  /** Which customer this is (0, 1, 2...), so the walk-in animation plays once per visit */
  id: number;
  customer: Customer;
  order: OrderLine[];
  /** Coins the customer hands over to count, or one big coin when the child works out change */
  coins: Coin[];
  change: { paid: Coin; change: number; choices: number[] } | null;
}

function newVisit(cur: Currency, served: number): Visit {
  const order = makeOrder(served);
  const price = priceOf(cur, order);
  const c = isChangeRound(served) ? changeFor(cur, price) : null;
  let change: Visit["change"] = null;
  if (c && c.change > 0) {
    const unit = COINS[cur][0].value;
    const wrong = shuffled([unit, 2 * unit, 4 * unit].flatMap((d) => [c.change + d, c.change - d]).filter((v) => v > 0 && v !== c.change));
    change = { ...c, choices: shuffled([c.change, ...wrong.slice(0, 2)]) };
  }
  return { id: served, customer: CUSTOMERS[served % CUSTOMERS.length], order, coins: change ? [change.paid] : coinsFor(cur, price), change };
}

/** "strawberry and banana", "two bananas and a kiwi" */
function wantText(order: OrderLine[]): string {
  const counting = order.some((l) => l.count > 1);
  const parts = order.map((l) => {
    const f = fruitById(l.fruit);
    return counting ? `${l.count === 1 ? "one" : l.count} ${l.count === 1 ? f.name : f.plural}` : f.name;
  });
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0];
}

function CustomerArt({ c, happy, reduced, size = 120 }: { c: Customer; happy: boolean; reduced: boolean; size?: number }) {
  const hair = (() => {
    switch (c.hairStyle) {
      case "long":
        return <path d="M28 52 C28 18 92 18 92 52 L96 96 L24 96 Z" fill={c.hair} />;
      case "puffs":
        return (
          <>
            <circle cx="30" cy="30" r="15" fill={c.hair} />
            <circle cx="90" cy="30" r="15" fill={c.hair} />
          </>
        );
      case "ponytail":
        return <ellipse cx="94" cy="50" rx="10" ry="22" fill={c.hair} transform="rotate(-20 94 50)" />;
      case "curly":
        return [36, 48, 60, 72, 84].map((x, i) => <circle key={x} cx={x} cy={i % 2 ? 24 : 28} r="11" fill={c.hair} />);
      default:
        return null;
    }
  })();
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 120 138" aria-hidden>
      {hair}
      <path d="M22 138 C22 104 98 104 98 138 Z" fill={c.outfit} />
      <rect x="52" y="84" width="16" height="16" rx="6" fill={c.skin} />
      <circle cx="60" cy="56" r="30" fill={c.skin} />
      <path d="M30 50 C30 22 90 22 90 50 C80 38 44 36 30 50 Z" fill={c.hair} />
      {[49, 71].map((x) => (
        <motion.circle
          key={x}
          cx={x}
          cy={58}
          r={4}
          fill="#3b2f4a"
          style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}
          animate={reduced ? undefined : { scaleY: [1, 1, 0.1, 1] }}
          transition={{ repeat: Infinity, duration: 3.4, times: [0, 0.93, 0.965, 1] }}
        />
      ))}
      <circle cx="42" cy="68" r="5" fill="#ff8fa3" opacity="0.5" />
      <circle cx="78" cy="68" r="5" fill="#ff8fa3" opacity="0.5" />
      {happy ? <path d="M48 70 Q60 84 72 70 Z" fill="#c2374f" /> : <path d="M50 72 Q60 79 70 72" fill="none" stroke="#3b2f4a" strokeWidth="3" strokeLinecap="round" />}
    </svg>
  );
}

/** A cup of juice. `level` (0..1) is how full it is, and the juice slides to it: pouring in, or being sipped away. */
function Cup({ color, size = 1, level = 1, from = level, reduced }: { color: string; size?: number; level?: number; from?: number; reduced: boolean }) {
  const clip = `cup-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const top = (l: number) => 89 - 51 * l;
  return (
    <svg width={70 * size} height={96 * size} viewBox="0 0 70 96" aria-hidden>
      <defs>
        <clipPath id={clip}>
          <motion.rect x={0} width={70} height={96} initial={{ y: top(reduced ? level : from) }} animate={{ y: top(level) }} transition={{ duration: reduced ? 0 : 1.6, ease: "easeInOut" }} />
        </clipPath>
      </defs>
      <motion.path d="M44 4 L40 30" stroke="#ff6fa5" strokeWidth="5" strokeLinecap="round" style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }} animate={reduced ? undefined : { rotate: [-6, 6, -6] }} transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }} />
      <path d="M8 26 L62 26 L56 92 L14 92 Z" fill="#ffffff" fillOpacity="0.55" stroke="#9aa3ad" strokeWidth="3" />
      <path d="M11 38 L59 38 L55 89 L15 89 Z" fill={color} clipPath={`url(#${clip})`} />
      <ellipse cx="24" cy="56" rx="4" ry="12" fill="#ffffff" opacity="0.45" />
    </svg>
  );
}

/** Bubbles rising through the juice in the blender. */
const BUBBLES = [
  { left: 18, size: 8, dur: 1.2, delay: 0 },
  { left: 42, size: 12, dur: 1.5, delay: 0.4 },
  { left: 64, size: 7, dur: 1.1, delay: 0.8 },
  { left: 80, size: 10, dur: 1.4, delay: 0.2 },
  { left: 30, size: 6, dur: 1, delay: 1 },
];

function Stand({ cur }: { cur: Currency }) {
  const reduced = useAppReducedMotion();
  const [served, setServed] = useState(0);
  const [visit, setVisit] = useState<Visit>(() => newVisit(cur, 0));
  const [blender, setBlender] = useState<Blender>({});
  const [phase, setPhase] = useState<Phase>("order");
  const [wobble, setWobble] = useState<Record<string, number>>({});
  const [counted, setCounted] = useState(0);
  const [changeWobble, setChangeWobble] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const { customer, order } = visit;
  const price = priceOf(cur, order);
  const color = juiceColor(blender);
  const inJar = Object.entries(blender).flatMap(([id, n]) => Array.from({ length: n }, (_, i) => `${id}-${i}`));

  const greet = (v: Visit) => audioManager.speak(`Hi! I'm ${v.customer.name}. ${orderText(v.order)}`);

  useEffect(() => {
    const t = setTimeout(() => greet(visit), 500);
    return () => clearTimeout(t);
    // Only the first customer; later ones are greeted as they arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tapFruit = (id: string) => {
    if (phase !== "order") return;
    const f = fruitById(id);
    const { result, blender: next } = addFruit(order, blender, id);
    if (result === "not-wanted" || result === "enough") {
      setWobble((w) => ({ ...w, [id]: (w[id] ?? 0) + 1 }));
      audioManager.play("failure");
      audioManager.speak(result === "enough" ? `That's enough ${f.plural}! ${customer.name} wants ${wantText(order)}.` : `That's a ${f.name}. ${customer.name} wants ${wantText(order)}.`);
      return;
    }
    setBlender(next);
    const n = Object.values(next).reduce((a, b) => a + b, 0);
    audioManager.playPop(n);
    audioManager.playNote(Math.min(9, n * 2));
    if (result === "complete") {
      setPhase("ready");
      later(() => {
        audioManager.play("success");
        audioManager.speak("All in! Press the big button to blend!");
      }, 350);
    } else if (order.some((l) => l.count > 1)) audioManager.speak(`${next[id]} ${next[id] === 1 ? f.name : f.plural}`);
  };

  const blend = () => {
    if (phase !== "ready") return;
    setPhase("blending");
    for (let i = 0; i < 5; i++) later(() => audioManager.playSfx("whoosh", 0.6), i * 340);
    later(() => {
      setPhase("serve");
      audioManager.play("success");
      audioManager.speak(`Juice is ready! Tap the cup to give it to ${customer.name}.`);
    }, reduced ? 600 : BLEND_MS);
  };

  const serve = () => {
    if (phase !== "serve") return;
    if (visit.change) {
      setPhase("change");
      audioManager.speak(`Yum! Thank you! It costs ${sayMoney(cur, price)}. Here is ${visit.change.paid.say}. How much change do I get?`);
    } else {
      setPhase("pay");
      setCounted(0);
      audioManager.speak(`Yum! Thank you! That's ${sayMoney(cur, price)}. Tap each coin to put it in the till.`);
    }
  };

  const goodbye = (line: string) => {
    setPhase("bye");
    audioManager.play("success");
    audioManager.speak(line);
    const n = served + 1;
    setServed(n);
    if (n % STAR_EVERY === 0) void finishActivity(MODULE_ID, { score: n });
    later(() => {
      const v = newVisit(cur, n);
      setVisit(v);
      setBlender({});
      setCounted(0);
      setPhase("order");
      greet(v);
    }, 2600);
  };

  const countCoin = () => {
    if (phase !== "pay" || counted >= visit.coins.length) return;
    const k = counted + 1;
    setCounted(k);
    const sum = total(visit.coins.slice(0, k).map((c) => c.value));
    audioManager.playNote(Math.min(9, k * 2));
    if (k === visit.coins.length) goodbye(`${sayMoney(cur, sum)}. That's right! Bye bye!`);
    else audioManager.speak(sayMoney(cur, sum));
  };

  const pickChange = (v: number) => {
    const c = visit.change;
    if (phase !== "change" || !c) return;
    if (v === c.change) goodbye(`Yes! ${sayMoney(cur, c.paid.value)} take away ${sayMoney(cur, price)} is ${sayMoney(cur, v)}. Bye bye!`);
    else {
      setChangeWobble((w) => w + 1);
      audioManager.play("failure");
      audioManager.speak(`Let's check: ${sayMoney(cur, price)} and ${sayMoney(cur, v)} make ${sayMoney(cur, price + v)}. I gave you ${sayMoney(cur, c.paid.value)}.`);
    }
  };

  const happy = phase === "pay" || phase === "change" || phase === "bye";

  return (
    <div className="flex flex-1 flex-col items-center gap-3 pb-4">
      {/* customer and their order */}
      <AnimatePresence mode="wait">
        <motion.div
          key={visit.id}
          className="flex items-end gap-2"
          initial={reduced ? false : { x: 260, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { x: -260, opacity: 0 }}
          transition={{ type: "spring", stiffness: 160, damping: 18 }}
        >
          {/* Hops in on arrival (once per visit), then breathes; jumps for joy on the way out */}
          <motion.div className="relative" animate={reduced ? undefined : { y: [0, -14, 0, -14, 0, -6, 0] }} transition={{ duration: 0.9, ease: "easeOut" }}>
            <motion.div
              style={{ transformOrigin: "50% 100%" }}
              animate={reduced ? undefined : phase === "bye" ? { y: [0, -22, 0], rotate: [0, -6, 6, 0], scaleY: [1, 1.05, 0.92, 1] } : { y: [0, -4, 0], rotate: 0, scaleY: [1, 1.02, 1] }}
              transition={{ repeat: Infinity, duration: phase === "bye" ? 0.6 : 2.4 }}
            >
              <CustomerArt c={customer} happy={happy} reduced={reduced} />
            </motion.div>
            {happy && (
              // The customer sips the juice while they pay
              <motion.span className="absolute -right-3 bottom-2" initial={reduced ? false : { scale: 0, y: -40 }} animate={{ scale: 1, y: 0, rotate: reduced ? 0 : [0, -14, 0] }} transition={{ type: "spring", stiffness: 300, damping: 14, rotate: { repeat: Infinity, duration: 0.8, repeatDelay: 0.6 } }}>
                <Cup color={color} size={0.55} from={1} level={phase === "bye" ? 0.1 : 0.45} reduced={reduced} />
              </motion.span>
            )}
          </motion.div>
          <button type="button" onClick={() => greet(visit)} aria-label={`Hear ${customer.name}'s order again`} className="relative mb-12 rounded-3xl bg-surface px-4 py-3 shadow-md active:scale-95">
            <span className="absolute -left-2 bottom-4 h-4 w-4 rotate-45 bg-surface" aria-hidden />
            <span className="block text-sm font-bold opacity-60">🔊 {customer.name} wants</span>
            <span className="flex flex-wrap gap-2">
              {order.map((l) => {
                const have = blender[l.fruit] ?? 0;
                return (
                  <span key={l.fruit} className="flex items-center">
                    {Array.from({ length: l.count }, (_, i) => (
                      <span key={i} className={`text-4xl transition-opacity ${i < have ? "opacity-35" : ""}`}>
                        {fruitById(l.fruit).emoji}
                      </span>
                    ))}
                    {have >= l.count && <span className="text-2xl text-kid-green">✓</span>}
                  </span>
                );
              })}
            </span>
          </button>
        </motion.div>
      </AnimatePresence>

      {/* blender and cup */}
      <div className="flex items-end justify-center gap-6">
        <motion.div
          className="relative h-56 w-40"
          animate={phase === "blending" && !reduced ? { rotate: [-2.5, 2.5], x: [-2, 2] } : { rotate: 0, x: 0 }}
          transition={phase === "blending" ? { repeat: Infinity, repeatType: "mirror", duration: 0.08 } : { duration: 0.2 }}
        >
          <motion.div className="absolute inset-x-5 top-0 h-5 rounded-t-2xl bg-kid-purple" animate={phase === "blending" && !reduced ? { y: [0, -5, 0] } : { y: 0 }} transition={phase === "blending" ? { repeat: Infinity, duration: 0.18 } : { duration: 0.2 }} />
          <Burst trigger={phase === "order" || phase === "ready" ? inJar.length : 0} items={["💦", "✨"]} count={6} spread={55} className="left-1/2 top-6" size="text-xl" />
          <div className="absolute inset-x-3 top-4 bottom-14 overflow-hidden rounded-b-[2rem] rounded-t-md border-4 border-white/90 bg-sky-100/70 dark:bg-sky-200/30">
            <motion.div
              className="absolute inset-x-0 bottom-0"
              style={{ backgroundColor: color }}
              initial={false}
              animate={{ height: phase === "blending" || phase === "serve" ? "78%" : "0%" }}
              transition={{ duration: reduced ? 0 : BLEND_MS / 1000 }}
            >
              {!reduced && (phase === "blending" || phase === "serve") && (
                <>
                  {/* A wavy surface that sloshes (fast while blending) */}
                  <motion.svg viewBox="0 0 200 20" preserveAspectRatio="none" className="absolute -top-2.5 left-0 h-3 w-[200%]" animate={{ x: ["0%", "-50%"] }} transition={{ repeat: Infinity, duration: phase === "blending" ? 0.4 : 2.2, ease: "linear" }} aria-hidden>
                    <path d="M0 10 Q25 0 50 10 T100 10 T150 10 T200 10 V20 H0 Z" fill={color} />
                  </motion.svg>
                  {BUBBLES.map((b, i) => (
                    <motion.span
                      key={i}
                      className="absolute bottom-0 rounded-full bg-white/60"
                      style={{ left: `${b.left}%`, width: b.size, height: b.size }}
                      animate={{ y: [0, -110], opacity: [0, 0.9, 0] }}
                      transition={{ repeat: Infinity, duration: phase === "blending" ? b.dur * 0.5 : b.dur * 1.6, delay: b.delay, ease: "easeOut" }}
                      aria-hidden
                    />
                  ))}
                </>
              )}
            </motion.div>
            {phase === "blending" && !reduced && (
              // The fruit whirls round and shrinks away into juice
              <motion.div className="absolute inset-0" animate={{ rotate: 720, scale: [1, 0.8, 0] }} transition={{ duration: BLEND_MS / 1000, ease: "easeIn" }} aria-hidden>
                {inJar.map((k, i) => {
                  const a = (i / inJar.length) * Math.PI * 2;
                  return (
                    <span key={k} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl" style={{ marginLeft: Math.cos(a) * 34, marginTop: Math.sin(a) * 34 + 20 }}>
                      {fruitById(k.split("-")[0]).emoji}
                    </span>
                  );
                })}
              </motion.div>
            )}
            <div className="absolute inset-x-1 bottom-1 flex flex-wrap-reverse justify-center">
              <AnimatePresence>
                {(phase === "order" || phase === "ready") &&
                  inJar.map((k) => (
                    <motion.span key={k} className="text-4xl" initial={reduced ? false : { y: -160, scale: 1.3, rotate: -60 }} animate={{ y: 0, scale: [1.3, 0.8, 1], rotate: 0 }} exit={{ scale: 0, opacity: 0 }} transition={{ y: { type: "spring", stiffness: 300, damping: 16 }, scale: { duration: 0.45 }, rotate: { duration: 0.45 } }}>
                      {fruitById(k.split("-")[0]).emoji}
                    </motion.span>
                  ))}
              </AnimatePresence>
            </div>
            <span className="absolute left-2 top-3 h-20 w-2 rounded-full bg-white/60" aria-hidden />
          </div>
          <div className="absolute inset-x-0 bottom-0 flex h-14 items-center justify-center rounded-2xl bg-slate-600 shadow-lg">
            <motion.button
              type="button"
              onClick={blend}
              disabled={phase !== "ready"}
              aria-label="Blend"
              className="h-12 w-12 rounded-full border-4 border-white bg-kid-red text-xl shadow disabled:bg-slate-400"
              animate={phase === "ready" && !reduced ? { scale: [1, 1.25, 1] } : { scale: 1 }}
              transition={{ repeat: phase === "ready" ? Infinity : 0, duration: 0.8 }}
            >
              <span aria-hidden>⚡</span>
            </motion.button>
          </div>
        </motion.div>

        <div className="flex h-56 w-24 items-end justify-center">
          <AnimatePresence>
            {(phase === "serve" || happy) && (
              <motion.button
                key={`cup-${visit.id}`}
                type="button"
                onClick={serve}
                aria-label={`Give the juice to ${customer.name}`}
                disabled={phase !== "serve"}
                initial={reduced ? false : { scale: 0, y: 30 }}
                animate={phase === "serve" ? { scale: [1, 1.08, 1], y: 0 } : { scale: 0.5, y: [0, -190, -150], x: -90, rotate: -25, opacity: [1, 1, 0] }}
                transition={phase === "serve" ? { scale: { repeat: Infinity, duration: 1 }, y: { type: "spring", stiffness: 300, damping: 14 } } : { duration: 0.6, ease: "easeOut" }}
                whileTap={reduced ? undefined : { scale: 0.9 }}
                className="rounded-2xl p-1"
              >
                <Cup color={color} from={0} level={1} reduced={reduced} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* what the child does next */}
      {(phase === "order" || phase === "ready") && (
        <div className="flex flex-wrap justify-center gap-3" aria-label="Fruit">
          {fruitsFor(served).map((f, i) => (
            <ShakeOnWrong key={f.id} trigger={wobble[f.id] ?? 0}>
              <motion.button
                type="button"
                onClick={() => tapFruit(f.id)}
                aria-label={f.name}
                className="flex min-h-touch min-w-touch flex-col items-center justify-center rounded-3xl bg-amber-200 px-2 shadow-md ring-4 ring-amber-700/40 dark:bg-amber-300"
                whileTap={reduced ? { scale: 0.9 } : { scaleX: 1.15, scaleY: 0.8 }}
                transition={{ type: "spring", stiffness: 600, damping: 15 }}
              >
                {/* Each fruit bobs on its own beat, so the stand looks fresh and juicy */}
                <motion.span className="text-5xl leading-none" animate={reduced ? undefined : { y: [0, -5, 0], rotate: [-4, 4, -4] }} transition={{ repeat: Infinity, duration: 1.8 + (i % 3) * 0.3, delay: i * 0.22, ease: "easeInOut" }}>
                  {f.emoji}
                </motion.span>
              </motion.button>
            </ShakeOnWrong>
          ))}
        </div>
      )}

      {phase === "pay" && (
        <>
          <p className="text-2xl font-extrabold" role="status">
            {formatMoney(cur, total(visit.coins.slice(0, counted).map((c) => c.value)))} <span className="opacity-50">/ {formatMoney(cur, price)}</span>
          </p>
          <div className="flex flex-wrap justify-center gap-3" aria-label="Coins to count">
            {visit.coins.map((c, i) => (
              <motion.button
                key={i}
                type="button"
                onClick={countCoin}
                disabled={i !== counted}
                aria-label={i === counted ? `Count ${c.say}` : c.say}
                animate={i < counted ? (reduced ? { opacity: 0.25 } : { y: [0, -40, 90], scale: [1, 1.1, 0.4], rotate: 200, opacity: [1, 1, 0] }) : i === counted && !reduced ? { y: [0, -8, 0] } : {}}
                transition={i === counted ? { repeat: Infinity, duration: 0.9 } : { duration: 0.5, ease: "easeIn" }}
                className="rounded-full"
              >
                <CoinArt coin={c} />
              </motion.button>
            ))}
          </div>
          <span className="relative">
            <motion.span key={counted} className="block text-5xl" style={{ transformOrigin: "50% 100%" }} animate={counted && !reduced ? { scaleY: [1, 0.8, 1.15, 1], scaleX: [1, 1.15, 0.92, 1] } : {}} transition={{ duration: 0.4, delay: 0.35 }} aria-hidden>
              🗃️
            </motion.span>
            <Burst trigger={counted} items={["✨", "⭐"]} count={5} spread={45} className="left-1/2 top-0" size="text-xl" />
          </span>
        </>
      )}

      {phase === "change" && visit.change && (
        <>
          <p className="flex items-center gap-3 text-2xl font-bold">
            Costs {formatMoney(cur, price)} · paid <CoinArt coin={visit.change.paid} size={56} />
          </p>
          <p className="text-2xl font-bold">How much change?</p>
          <ShakeOnWrong trigger={changeWobble}>
            <div className="flex flex-wrap justify-center gap-4">
              {visit.change.choices.map((v) => (
                <button key={v} type="button" onClick={() => pickChange(v)} className="min-h-touch min-w-36 rounded-3xl bg-surface px-5 text-4xl font-extrabold shadow-md active:scale-90">
                  {formatMoney(cur, v)}
                </button>
              ))}
            </div>
          </ShakeOnWrong>
        </>
      )}

      {phase === "bye" && (
        <motion.p className="relative text-5xl" initial={reduced ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 12 }} aria-hidden>
          <motion.span className="inline-block" style={{ transformOrigin: "70% 90%" }} animate={reduced ? undefined : { rotate: [0, 20, -10, 20, 0] }} transition={{ repeat: Infinity, duration: 1 }}>
            👋
          </motion.span>{" "}
          🎉
          <Burst trigger={served} items={["🎉", "⭐", "🍓", "🍊", "✨"]} count={12} spread={140} />
        </motion.p>
      )}
    </div>
  );
}

export default function JuiceStand() {
  const [cur, setCur] = useState<Currency>(() => {
    try {
      const saved = localStorage.getItem(CUR_KEY);
      if (saved === "USD" || saved === "GBP" || saved === "AED") return saved;
    } catch {
      // storage unavailable
    }
    return currencyForLocale(navigator.language || "en-US");
  });
  const choose = (c: Currency) => {
    setCur(c);
    try {
      localStorage.setItem(CUR_KEY, c);
    } catch {
      // storage unavailable
    }
  };
  return (
    <>
      <div className="flex justify-center gap-2" role="group" aria-label="Money">
        {(Object.keys(CURRENCY_NAMES) as Currency[]).map((c) => (
          <button key={c} type="button" aria-pressed={cur === c} onClick={() => choose(c)} className={`min-h-12 rounded-full px-4 text-lg font-bold shadow active:scale-95 ${cur === c ? "bg-kid-blue text-white" : "bg-surface"}`}>
            {CURRENCY_NAMES[c]}
          </button>
        ))}
      </div>
      <Stand key={cur} cur={cur} />
    </>
  );
}
