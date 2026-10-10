"use client";

import { useMemo, useRef, useState } from "react";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import ToyGame from "@/components/toy3d/ToyGame";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import type { BakeryEngine, BakeryState } from "@/lib/cake-bakery/BakeryEngine";
import { FLAVORS, FROSTINGS, PIPES, TOPPINGS, makeOrder, reaction, type Order } from "@/lib/cake-bakery/recipe";
import { loadProgress, newlyUnlocked, saveProgress, unlockedFor, type Progress } from "@/lib/cake-bakery/unlocks";

const STEPS = [
  { icon: "🫙", label: "Pantry", say: "Add the ingredients!" },
  { icon: "🥄", label: "Mix", say: "Stir the batter!" },
  { icon: "🔥", label: "Bake", say: "Pour and bake!" },
  { icon: "🧁", label: "Frost", say: "Frost your cake!" },
  { icon: "🍓", label: "Decorate", say: "Make it pretty!" },
  { icon: "🎉", label: "Serve", say: "Ta da!" },
];

const INITIAL: BakeryState = {
  station: 0,
  flavor: FLAVORS[0].id,
  tiers: 1,
  zoom: 1,
  jars: 0,
  mix: 0,
  pour: 0,
  baking: -1,
  baked: false,
  cover: 0,
  decor: 0,
  grade: null,
  cake: { flavor: FLAVORS[0].id, tiers: 1, frosting: null, toppings: [] },
};

const chip = "flex min-h-14 min-w-14 items-center justify-center rounded-2xl px-3 text-lg font-extrabold shadow transition-transform active:scale-95";
const primary = "min-h-14 rounded-2xl bg-pink-500 px-6 text-xl font-extrabold text-white shadow-lg transition-transform active:scale-95 disabled:opacity-40";

function Bar({ value, label }: { value: number; label: string }) {
  return (
    <div className="h-4 w-full max-w-xs overflow-hidden rounded-full bg-black/15" role="progressbar" aria-label={label} aria-valuenow={Math.round(value * 100)}>
      <div className="h-full rounded-full bg-pink-500 transition-all" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

function orderChips(o: Order): string[] {
  const f = FLAVORS.find((x) => x.id === o.flavor);
  const out = [`${f?.emoji ?? ""} ${f?.name ?? ""}`];
  if (o.tiers) out.push(`${o.tiers} ${o.tiers === 1 ? "layer" : "layers"}`);
  if (o.frosting) out.push(`${FROSTINGS.find((x) => x.id === o.frosting)?.name} frosting`);
  for (const t of o.toppings) {
    const tp = TOPPINGS.find((x) => x.id === t);
    out.push(`${tp?.emoji} ${tp?.name}`);
  }
  return out;
}

export default function CakeBakery() {
  const reduced = useAppReducedMotion();
  const engine = useRef<BakeryEngine | null>(null);
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const progressRef = useRef(progress);
  const unlocked = useMemo(() => unlockedFor(progress.coins), [progress.coins]);
  const [order, setOrder] = useState<Order | null>(() => makeOrder(progress.served, unlockedFor(progress.coins).toppings));
  const orderRef = useRef(order);
  const [s, setS] = useState<BakeryState>(INITIAL);
  const lastStation = useRef(0);
  const [mode, setMode] = useState<"topping" | "pipe">("topping");
  const [topping, setTopping] = useState("strawberry");
  const [pipe, setPipe] = useState<"dot" | "star" | "swirl">("dot");
  const [pipeColor, setPipeColor] = useState(FROSTINGS[0].id);
  const [frost, setFrost] = useState(FROSTINGS[1].id);
  const [layer, setLayer] = useState(-1);
  const [gift, setGift] = useState<string | null>(null);

  const give = (p: Progress) => {
    progressRef.current = p;
    setProgress(p);
    saveProgress(p);
  };

  const pickOrder = (free: boolean) => (free ? null : makeOrder(progressRef.current.served, unlockedFor(progressRef.current.coins).toppings));

  /** Next customer: new order and a fresh kitchen. */
  const newOrder = (free: boolean) => {
    const o = pickOrder(free);
    orderRef.current = o;
    setOrder(o);
    setGift(null);
    setLayer(-1);
    engine.current?.setFrostLayer(-1);
    engine.current?.reset(o);
  };

  /** Switch between an order and free baking without losing the cake in progress. */
  const swapOrder = (free: boolean) => {
    const o = pickOrder(free);
    orderRef.current = o;
    setOrder(o);
    engine.current?.setOrder(o);
  };

  const step = STEPS[s.station];
  const tell = (text: string) => audioManager.speak(text);

  return (
    <ToyGame
      title="Cake Bakery"
      moduleId="cake-bakery"
      items={[{ id: "back", label: "Previous step" }, { id: "next", label: "Next step" }]}
      create={async (container) => {
        const { BakeryEngine } = await import("@/lib/cake-bakery/BakeryEngine");
        const e = new BakeryEngine(container, {
          reducedMotion: reduced,
          onState: (st) => {
            setS(st);
            if (st.station !== lastStation.current) {
              lastStation.current = st.station;
              tell(STEPS[st.station].say);
            }
          },
          onSfx: (kind, n = 0) => {
            if (kind === "note") audioManager.playNote(n % 10);
            else if (kind === "ding") audioManager.play("success");
            else audioManager.playPop(kind === "splash" ? 1 : n);
          },
          onServed: (grade) => {
            const before = progressRef.current;
            const next = { coins: before.coins + grade.coins, served: before.served + 1 };
            give(next);
            const fresh = newlyUnlocked(before.coins, next.coins);
            if (fresh.length) setGift(fresh.map((u) => u.id).join(", "));
            void finishActivity("cake-bakery", { score: grade.stars });
            tell(reaction(grade.stars, orderRef.current?.customer.name ?? "Your friend"));
          },
        });
        e.setOrder(orderRef.current);
        engine.current = e;
        return e;
      }}
    >
      {() => (
        <>
          {/* step ribbon */}
          <div className="absolute inset-x-0 top-[4.4rem] flex justify-center gap-1.5 px-2" role="tablist" aria-label="Steps">
            {STEPS.map((st, i) => (
              <button
                key={st.label}
                type="button"
                role="tab"
                aria-selected={i === s.station}
                aria-label={st.label}
                onClick={() => engine.current?.goStation(i)}
                className={`flex h-12 min-w-12 items-center justify-center gap-1 rounded-full px-3 text-xl font-bold shadow ${i === s.station ? "bg-pink-500 text-white" : i < s.station ? "bg-pink-200 text-slate-800" : "bg-surface/90 text-foreground"}`}
              >
                <span>{st.icon}</span>
                {i === s.station && <span className="hidden text-sm sm:inline">{st.label}</span>}
              </button>
            ))}
          </div>

          {/* the customer's order */}
          <div className="absolute left-2 top-[7.6rem] max-w-[min(18rem,62%)] rounded-2xl bg-surface/95 p-2 shadow-lg">
            {order ? (
              <>
                <p className="text-sm font-extrabold">{order.customer.name} wants:</p>
                <ul className="mt-1 flex flex-wrap gap-1">
                  {orderChips(order).map((c) => (
                    <li key={c} className="rounded-full bg-pink-100 px-2 py-0.5 text-sm font-bold text-slate-800">{c}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm font-extrabold">🎨 Free bake: make anything!</p>
            )}
            <button type="button" className="mt-1 rounded-xl bg-black/10 px-2 py-1 text-xs font-bold" onClick={() => swapOrder(Boolean(order))}>
              {order ? "Free bake" : "Take an order"}
            </button>
          </div>
          <div className="absolute right-3 top-[7.6rem] rounded-full bg-surface/95 px-3 py-1 text-lg font-extrabold shadow">🪙 {progress.coins}</div>

          {/* bottom panel */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 rounded-t-3xl bg-surface/95 p-3 shadow-[0_-6px_20px_rgba(0,0,0,0.15)]">
            <p className="text-center text-lg font-extrabold">{step.icon} {step.say}</p>

            {(s.station === 3 || s.station === 4) && (
              <div className="absolute -top-14 right-3 flex gap-2" role="group" aria-label="Zoom">
                <button type="button" aria-label="Zoom out" disabled={s.zoom >= 1.5} onClick={() => engine.current?.nudgeZoom(1)} className={`${chip} bg-surface/95 text-foreground disabled:opacity-40`}>➖🔍</button>
                <button type="button" aria-label="Zoom in" disabled={s.zoom <= 0.8} onClick={() => engine.current?.nudgeZoom(-1)} className={`${chip} bg-surface/95 text-foreground disabled:opacity-40`}>➕🔍</button>
              </div>
            )}

            {s.station === 0 && (
              <>
                <p className="text-sm font-bold">Tap the jars ({s.jars}/4) and pick a flavor</p>
                <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Flavor">
                  {FLAVORS.map((f) => (
                    <button key={f.id} type="button" aria-label={f.name} aria-pressed={s.flavor === f.id} onClick={() => { engine.current?.setFlavor(f.id); audioManager.playNote(2); tell(f.name); }} className={`${chip} ${s.flavor === f.id ? "ring-4 ring-pink-500" : ""}`} style={{ background: f.sponge }}>
                      {f.emoji}
                    </button>
                  ))}
                </div>
              </>
            )}

            {s.station === 1 && (
              <>
                <p className="text-sm font-bold">Drag around the bowl in circles</p>
                <Bar value={s.mix} label="Mixing" />
              </>
            )}

            {s.station === 2 && (
              <>
                <div className="flex items-center gap-2" role="group" aria-label="Layers">
                  <span className="text-sm font-bold">Layers</span>
                  {[1, 2, 3].map((n) => (
                    <button key={n} type="button" aria-pressed={s.tiers === n} onClick={() => engine.current?.setTiers(n)} className={`${chip} ${s.tiers === n ? "bg-pink-500 text-white" : "bg-tint text-foreground"}`}>
                      {n}🍰
                    </button>
                  ))}
                </div>
                {s.baked ? (
                  <p className="text-lg font-extrabold">Ding! 🔔 Your cake is baked!</p>
                ) : s.baking >= 0 ? (
                  <>
                    <p className="text-sm font-bold">Baking… tap to hurry</p>
                    <Bar value={s.baking} label="Baking" />
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold">Press and hold a pan to pour batter</p>
                    <Bar value={s.pour} label="Poured" />
                  </>
                )}
              </>
            )}

            {s.station === 3 && (
              <>
                <p className="text-sm font-bold">Drag over the cake to spread frosting, or turn it by dragging the background</p>
                {s.tiers > 1 && (
                  <div className="flex items-center gap-2" role="group" aria-label="Which layer">
                    <span className="text-sm font-bold">Color</span>
                    {[-1, ...Array.from({ length: s.tiers }, (_, i) => i)].map((i) => (
                      <button key={i} type="button" aria-pressed={layer === i} onClick={() => { setLayer(i); engine.current?.setFrostLayer(i); audioManager.playNote(1); }} className={`${chip} ${layer === i ? "bg-pink-500 text-white" : "bg-tint text-foreground"}`}>
                        {i < 0 ? "All" : `Layer ${i + 1}`}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Frosting color">
                  {FROSTINGS.filter((f) => unlocked.frostings.includes(f.id)).map((f) => (
                    <button key={f.id} type="button" aria-label={f.name} aria-pressed={frost === f.id} onClick={() => { setFrost(f.id); engine.current?.setFrosting(f.id); audioManager.playNote(3); }} className={`h-14 w-14 rounded-full border-4 shadow ${frost === f.id ? "border-foreground" : "border-white"}`} style={{ background: f.color }} />
                  ))}
                  <button type="button" className={`${chip} bg-tint text-foreground`} onClick={() => engine.current?.coverAll()}>🪣 Cover all</button>
                </div>
                <Bar value={Math.min(1, s.cover / 0.8)} label="Frosting" />
              </>
            )}

            {s.station === 4 && (
              <>
                <div className="flex gap-2" role="tablist" aria-label="Decorating tools">
                  {(["topping", "pipe"] as const).map((m) => (
                    <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); engine.current?.setDecor({ mode: m }); }} className={`${chip} ${mode === m ? "bg-pink-500 text-white" : "bg-tint text-foreground"}`}>
                      {m === "topping" ? "🍓 Toppings" : "🧁 Piping"}
                    </button>
                  ))}
                  <button type="button" className={`${chip} bg-tint text-foreground disabled:opacity-40`} disabled={!s.decor} onClick={() => engine.current?.undoDecor()}>↩ Undo</button>
                </div>
                {mode === "topping" ? (
                  <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Toppings">
                    {TOPPINGS.map((t) => {
                      const ok = unlocked.toppings.includes(t.id);
                      return (
                        <button key={t.id} type="button" aria-label={ok ? t.name : `${t.name} (locked)`} aria-pressed={topping === t.id} disabled={!ok} onClick={() => { setTopping(t.id); engine.current?.setDecor({ topping: t.id, mode: "topping" }); audioManager.playNote(4); }} className={`${chip} text-2xl ${topping === t.id ? "bg-pink-200 ring-4 ring-pink-500 text-slate-900" : "bg-tint"} ${ok ? "" : "opacity-40"}`}>
                          {ok ? t.emoji : "🔒"}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {PIPES.map((p) => {
                      const ok = unlocked.pipes.includes(p.id);
                      return (
                        <button key={p.id} type="button" aria-label={ok ? p.name : `${p.name} (locked)`} aria-pressed={pipe === p.id} disabled={!ok} onClick={() => { setPipe(p.id); engine.current?.setDecor({ pipe: p.id, mode: "pipe" }); }} className={`${chip} text-2xl ${pipe === p.id ? "bg-pink-200 ring-4 ring-pink-500 text-slate-900" : "bg-tint"} ${ok ? "" : "opacity-40"}`}>
                          {ok ? p.emoji : "🔒"}
                        </button>
                      );
                    })}
                    {FROSTINGS.filter((f) => unlocked.frostings.includes(f.id)).map((f) => (
                      <button key={f.id} type="button" aria-label={f.name} aria-pressed={pipeColor === f.id} onClick={() => { setPipeColor(f.id); engine.current?.setDecor({ pipeColor: f.color, mode: "pipe" }); }} className={`h-12 w-12 rounded-full border-4 shadow ${pipeColor === f.id ? "border-foreground" : "border-white"}`} style={{ background: f.color }} />
                    ))}
                  </div>
                )}
              </>
            )}

            {s.station === 5 && s.grade && (
              <>
                <p className="text-4xl" aria-label={`${s.grade.stars} stars`}>{"⭐".repeat(s.grade.stars)}<span className="opacity-25">{"⭐".repeat(3 - s.grade.stars)}</span></p>
                {s.grade.checks.length > 0 && (
                  <ul className="flex flex-wrap justify-center gap-1">
                    {s.grade.checks.map((c) => (
                      <li key={c.label} className={`rounded-full px-2 py-0.5 text-sm font-bold ${c.ok ? "bg-green-200 text-green-900" : "bg-black/10"}`}>{c.ok ? "✓" : "•"} {c.label}</li>
                    ))}
                  </ul>
                )}
                <p className="text-lg font-extrabold">+{s.grade.coins} 🪙</p>
                {gift && <p className="rounded-xl bg-yellow-200 px-3 py-1 text-sm font-extrabold text-slate-900">🎁 New unlocked: {gift}!</p>}
              </>
            )}

            <div className="flex flex-wrap justify-center gap-2">
              {s.station > 0 && s.station < 5 && <button type="button" className={`${chip} bg-tint text-foreground`} onClick={() => engine.current?.goStation(s.station - 1)}>◀ Back</button>}
              {s.station === 2 && !s.baked && s.baking < 0 && <button type="button" className={primary} onClick={() => engine.current?.startBake()}>🔥 Bake!</button>}
              {s.station < 4 && <button type="button" className={primary} onClick={() => engine.current?.goStation(s.station + 1)}>Next ▶</button>}
              {s.station === 4 && <button type="button" className={primary} onClick={() => engine.current?.goStation(5)}>Serve! 🎉</button>}
              {s.station === 5 && (
                <>
                  <button type="button" className={`${chip} bg-tint text-foreground`} onClick={() => engine.current?.goStation(4)}>◀ Decorate more</button>
                  <button type="button" className={primary} onClick={() => newOrder(!order)}>Next customer ▶</button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </ToyGame>
  );
}
