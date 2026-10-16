"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { ShakeOnWrong } from "@/components/ShakeOnWrong";
import { shuffled } from "@/components/games/PickRound";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import {
  changeFor,
  COINS,
  CURRENCY_NAMES,
  currencyForLocale,
  formatMoney,
  makePrice,
  sayMoney,
  SHOP_ITEMS,
  total,
  type Coin,
  type Currency,
} from "@/lib/coin-shop/money";

const CUR_KEY = "coin-shop-currency";
const STAR_EVERY = 3;
const METAL = {
  copper: ["#f0a868", "#b8692e"],
  silver: ["#eef1f4", "#9aa3ad"],
  gold: ["#ffe066", "#d4a017"],
} as const;

function CoinArt({ coin, size = 76 }: { coin: Coin; size?: number }) {
  const [light, dark] = METAL[coin.metal];
  const big = coin.value >= 100;
  const s = big ? size * 1.12 : size;
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" aria-hidden>
      <defs>
        <radialGradient id={`g-${coin.metal}`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor={light} />
          <stop offset="100%" stopColor={dark} />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill={`url(#g-${coin.metal})`} stroke={dark} strokeWidth="4" />
      <circle cx="50" cy="50" r="38" fill="none" stroke={light} strokeOpacity="0.7" strokeWidth="2" />
      <text x="50" y="58" textAnchor="middle" fontSize={coin.label.length > 4 ? 18 : 26} fontWeight="800" fill="#3b2f4a">
        {coin.label}
      </text>
    </svg>
  );
}

interface Round {
  item: string;
  price: number;
  /** "pay": tap coins to pay exactly. "change": pick how much change comes back. */
  kind: "pay" | "change";
  changeChoices?: number[];
}

function newRound(cur: Currency, solved: number): Round {
  const item = SHOP_ITEMS[Math.floor(Math.random() * SHOP_ITEMS.length)];
  // After a few exact payments, every third round is a "how much change?" question.
  if (solved >= 6 && solved % 3 === 2) {
    for (let tries = 0; tries < 20; tries++) {
      const price = makePrice(cur, 1);
      const c = changeFor(cur, price);
      if (!c || c.change === 0) continue;
      const unit = COINS[cur][0].value;
      const wrong = shuffled([unit, 2 * unit, 5 * unit, 10 * unit].flatMap((d) => [c.change + d, c.change - d]).filter((v) => v > 0 && v !== c.change));
      return { item, price, kind: "change", changeChoices: shuffled([c.change, ...wrong.slice(0, 2)]) };
    }
  }
  return { item, price: makePrice(cur, solved < 3 ? 0 : solved < 9 ? 1 : 2), kind: "pay" };
}

function Shop({ cur }: { cur: Currency }) {
  const reduced = useAppReducedMotion();
  const [solved, setSolved] = useState(0);
  const [round, setRound] = useState<Round>(() => newRound(cur, 0));
  const [paid, setPaid] = useState<Coin[]>([]);
  const [done, setDone] = useState(false);
  const [wobble, setWobble] = useState(0);
  const sum = total(paid.map((c) => c.value));
  const change = round.kind === "change" ? changeFor(cur, round.price) : null;

  const ask = (r: Round) => {
    if (r.kind === "change") {
      const c = changeFor(cur, r.price)!;
      audioManager.speak(`It costs ${sayMoney(cur, r.price)}. You pay with ${c.paid.say}. How much change do you get?`);
    } else audioManager.speak(`It costs ${sayMoney(cur, r.price)}. Tap the coins to pay.`);
  };

  useEffect(() => {
    const t = setTimeout(() => ask(round), 500);
    return () => clearTimeout(t);
    // Only the first round; later rounds are asked as they appear.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const win = (say: string) => {
    setDone(true);
    const n = solved + 1;
    setSolved(n);
    audioManager.play("success");
    audioManager.speak(say);
    if (n % STAR_EVERY === 0) void finishActivity("coin-shop", { score: n });
    setTimeout(() => {
      const r = newRound(cur, n);
      setRound(r);
      setPaid([]);
      setDone(false);
      ask(r);
    }, 2600);
  };

  const addCoin = (c: Coin) => {
    if (done || round.kind !== "pay") return;
    const next = [...paid, c];
    const s = total(next.map((x) => x.value));
    setPaid(next);
    audioManager.playNote(Math.min(9, next.length));
    if (s === round.price) win(`Exactly ${sayMoney(cur, s)}! Thank you!`);
    else if (s > round.price) {
      setWobble((w) => w + 1);
      audioManager.speak(`That's ${sayMoney(cur, s)}. That's too much! Tap a coin on the counter to take it back.`);
    } else audioManager.speak(sayMoney(cur, s));
  };

  const removeCoin = (i: number) => {
    if (done) return;
    const next = paid.filter((_, k) => k !== i);
    setPaid(next);
    audioManager.playNote(0);
    audioManager.speak(sayMoney(cur, total(next.map((x) => x.value))));
  };

  const pickChange = (v: number) => {
    if (done || !change) return;
    if (v === change.change) win(`Yes! ${sayMoney(cur, change.paid.value)} take away ${sayMoney(cur, round.price)} is ${sayMoney(cur, v)}.`);
    else {
      setWobble((w) => w + 1);
      audioManager.play("failure");
      audioManager.speak(`Let's check: ${sayMoney(cur, round.price)} and ${sayMoney(cur, v)} make ${sayMoney(cur, round.price + v)}. We need ${sayMoney(cur, change.paid.value)}.`);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center gap-5">
      <button type="button" onClick={() => ask(round)} aria-label="Hear the price again" className="flex items-center gap-4 rounded-3xl bg-surface px-6 py-4 shadow-md active:scale-95">
        <motion.span key={round.item + round.price} initial={reduced ? false : { scale: 0.5 }} animate={{ scale: 1 }} className="text-8xl" aria-hidden>
          {round.item}
        </motion.span>
        <span className="flex flex-col items-start">
          <span className="text-sm font-bold opacity-60">🔊 Price</span>
          <span className="rounded-xl bg-kid-yellow px-3 text-4xl font-extrabold text-ink">{formatMoney(cur, round.price)}</span>
        </span>
      </button>

      {round.kind === "pay" ? (
        <>
          <ShakeOnWrong trigger={wobble}>
            <div className={`flex min-h-28 w-full max-w-lg flex-wrap items-center justify-center gap-2 rounded-3xl border-4 border-dashed p-3 ${done ? "border-kid-green bg-kid-green/20" : "border-foreground/20"}`} aria-label="Counter">
              {paid.length === 0 && <span className="text-lg opacity-60">Tap coins below to put them here</span>}
              <AnimatePresence>
                {paid.map((c, i) => (
                  <motion.button key={`${i}-${c.value}`} type="button" initial={reduced ? false : { y: 40, scale: 0.5 }} animate={{ y: 0, scale: 1 }} exit={{ scale: 0 }} onClick={() => removeCoin(i)} aria-label={`Take back ${c.say}`} className="rounded-full active:scale-90">
                    <CoinArt coin={c} size={56} />
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </ShakeOnWrong>
          <p className="text-3xl font-extrabold" role="status">
            {done ? "🎉 " : ""}Paid: {formatMoney(cur, sum)}
          </p>
          <div className="flex flex-wrap justify-center gap-3" aria-label="Your coins">
            {COINS[cur].map((c) => (
              <button key={c.value} type="button" onClick={() => addCoin(c)} aria-label={c.say} className="rounded-full p-1 transition-transform active:scale-90">
                <CoinArt coin={c} />
              </button>
            ))}
          </div>
        </>
      ) : (
        change && (
          <>
            <p className="flex items-center gap-3 text-2xl font-bold">
              You pay with <CoinArt coin={change.paid} size={64} />
            </p>
            <p className="text-2xl font-bold">How much change?</p>
            <ShakeOnWrong trigger={wobble}>
              <div className="flex flex-wrap justify-center gap-4">
                {round.changeChoices!.map((v) => (
                  <button key={v} type="button" onClick={() => pickChange(v)} className={`min-h-28 min-w-36 rounded-3xl bg-surface px-5 text-4xl font-extrabold shadow-md active:scale-90 ${done && v === change.change ? "ring-8 ring-kid-green" : ""}`}>
                    {formatMoney(cur, v)}
                  </button>
                ))}
              </div>
            </ShakeOnWrong>
          </>
        )
      )}
    </div>
  );
}

function CoinShop() {
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
      <Shop key={cur} cur={cur} />
    </>
  );
}

export default function CoinShopPage() {
  return (
    <PageContainer>
      <ActivityHeader title="Coin Shop" moduleId="coin-shop" />
      <ClientOnly>
        <CoinShop />
      </ClientOnly>
    </PageContainer>
  );
}
