"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApexEngine, CameraMode, GameSummary, HudData, Phase } from "@/lib/apex-highway/engine";
import { PAINT_SWATCHES, VEHICLES } from "@/lib/apex-highway/vehicle-specs";

interface Prefs {
  vehicle: string;
  color: string;
  night: boolean;
  camera: CameraMode;
}

const PREFS_KEY = "apex-highway-prefs";
const BEST_KEY = "apex-highway-best";
const DEFAULT_PREFS: Prefs = { vehicle: "sedan", color: VEHICLES[0].defaultColor, night: false, camera: "follow" };

function readPrefs(): Prefs {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") };
  } catch {
    return DEFAULT_PREFS;
  }
}

function readBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

const GLASS = "bg-black/35 backdrop-blur-md border border-white/20 text-white rounded-2xl";
const ICON_BTN = `${GLASS} flex h-12 w-12 items-center justify-center text-xl active:scale-95`;

function Speedometer({ speed, max }: { speed: number; max: number }) {
  const frac = Math.min(1, speed / max);
  const r = 70;
  const arc = Math.PI * 1.5 * r;
  return (
    <svg viewBox="0 0 180 150" className="h-36 w-44" aria-hidden>
      <path d="M 35 125 A 70 70 0 1 1 145 125" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="12" strokeLinecap="round" />
      <path d="M 35 125 A 70 70 0 1 1 145 125" fill="none" stroke={frac > 0.85 ? "#ff7043" : "#4dd0e1"} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${arc * frac} ${arc}`} />
      <text x="90" y="85" textAnchor="middle" fill="#fff" fontSize="38" fontWeight="700">{speed}</text>
      <text x="90" y="105" textAnchor="middle" fill="#cfd8dc" fontSize="13">km/h</text>
    </svg>
  );
}

function Rating({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-12 opacity-80">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-white/20">
        <div className="h-full rounded-full bg-cyan-300" style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}

function TouchButton({ label, onChange, children }: { label: string; onChange: (down: boolean) => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`${GLASS} flex h-20 w-20 touch-none select-none items-center justify-center text-3xl`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onChange(true);
      }}
      onPointerUp={() => onChange(false)}
      onPointerCancel={() => onChange(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

export default function ApexHighwayGame({ onExit }: { onExit?: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ApexEngine | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const prefsRef = useRef(prefs);
  const [phase, setPhase] = useState<Phase>("garage");
  const [hud, setHud] = useState<HudData | null>(null);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState<(GameSummary & { newBest: boolean }) | null>(null);
  const [muted, setMuted] = useState(false);
  const [touch, setTouch] = useState(false);
  const [ready, setReady] = useState(false);
  const bestRef = useRef(0);

  useEffect(() => {
    prefsRef.current = prefs;
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // storage unavailable
    }
  }, [prefs]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    const mq = window.matchMedia("(pointer: coarse), (max-width: 700px)");
    const onMq = () => setTouch(mq.matches);
    const init = setTimeout(() => {
      const saved = readPrefs();
      setPrefs(saved);
      prefsRef.current = saved;
      bestRef.current = readBest();
      setBest(bestRef.current);
      onMq();
    }, 0);
    mq.addEventListener("change", onMq);

    import("@/lib/apex-highway/engine").then(({ ApexEngine }) => {
      if (cancelled) return;
      const engine = new ApexEngine(el, {
        onHud: setHud,
        onPhase: setPhase,
        onCamera: (camera) => setPrefs((p) => ({ ...p, camera })),
        onNight: (night) => setPrefs((p) => ({ ...p, night })),
        onMuted: setMuted,
        onGameOver: (s) => {
          const newBest = s.score > bestRef.current;
          if (newBest) {
            bestRef.current = s.score;
            setBest(s.score);
            try {
              localStorage.setItem(BEST_KEY, String(s.score));
            } catch {
              // storage unavailable
            }
          }
          setOver({ ...s, newBest });
        },
      });
      const p = prefsRef.current;
      engine.setVehicle(p.vehicle);
      engine.setPaint(p.color);
      engine.setNight(p.night);
      engine.setCameraMode(p.camera);
      engineRef.current = engine;
      ro = new ResizeObserver(() => {
        engine.resize();
        const panel = panelRef.current;
        if (panel) {
          const wide = el.clientWidth >= 768;
          engine.setViewShift(wide ? panel.offsetWidth / 2 : 0, wide ? 0 : panel.offsetHeight / 2);
        }
      });
      ro.observe(el);
      if (panelRef.current) ro.observe(panelRef.current);
      setReady(true);
    });

    return () => {
      cancelled = true;
      clearTimeout(init);
      mq.removeEventListener("change", onMq);
      ro?.disconnect();
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  const update = useCallback((patch: Partial<Prefs>) => setPrefs((p) => ({ ...p, ...patch })), []);

  const start = () => {
    setOver(null);
    setHud(null);
    engineRef.current?.start();
  };
  const playing = phase === "playing" || phase === "paused";
  const camLabels: Record<CameraMode, string> = { follow: "Follow", chase: "Chase", cockpit: "Cockpit" };

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-900 text-white" style={{ position: "relative", overflow: "hidden", touchAction: "none" }}>
      <div ref={mountRef} className="absolute inset-0" />
      {!ready && <p className="absolute inset-0 flex items-center justify-center text-xl">Loading garage…</p>}

      <button type="button" aria-label="Exit" onClick={onExit} className={`${ICON_BTN} absolute left-3 top-3`}>✕</button>

      {playing && hud && (
        <>
          <div className={`${GLASS} absolute left-1/2 top-3 flex -translate-x-1/2 gap-4 px-4 py-2 text-center`}>
            <div><div className="text-xs opacity-70">Score</div><div className="text-xl font-bold tabular-nums">{hud.score}</div></div>
            <div><div className="text-xs opacity-70">Distance</div><div className="text-xl font-bold tabular-nums">{(hud.distance / 1000).toFixed(2)} km</div></div>
            <div><div className="text-xs opacity-70">Best</div><div className="text-xl font-bold tabular-nums">{Math.max(best, hud.score)}</div></div>
            {hud.combo > 1 && <div className="text-xl font-bold text-amber-300">×{hud.combo}</div>}
          </div>
          <div className="absolute right-3 top-3 flex gap-2">
            <button type="button" aria-label="Change camera" className={ICON_BTN} onClick={() => update({ camera: prefs.camera === "follow" ? "chase" : prefs.camera === "chase" ? "cockpit" : "follow" })}>🎥</button>
            <button type="button" aria-label="Toggle day and night" className={ICON_BTN} onClick={() => update({ night: !prefs.night })}>{prefs.night ? "🌙" : "☀️"}</button>
            <button type="button" aria-label={muted ? "Unmute" : "Mute"} className={ICON_BTN} onClick={() => engineRef.current?.setMuted(!muted)}>{muted ? "🔇" : "🔊"}</button>
            <button type="button" aria-label={phase === "paused" ? "Resume" : "Pause"} className={ICON_BTN} onClick={() => engineRef.current?.pause(phase === "playing")}>{phase === "paused" ? "▶" : "⏸"}</button>
          </div>
          <div className={`${GLASS} pointer-events-none absolute left-3 top-[4.5rem] origin-top-left scale-75 px-3 pb-2 text-center md:scale-100`}>
            <Speedometer speed={hud.speedKmh} max={hud.maxKmh} />
            <div className="-mt-6 flex items-center justify-center gap-3 text-sm">
              <span className="font-bold">Gear {hud.gear === 0 ? "N" : hud.gear}</span>
              <div className="h-2 w-28 rounded-full bg-white/20"><div className="h-full rounded-full bg-amber-300" style={{ width: `${hud.rpm * 100}%` }} /></div>
            </div>
          </div>
          {touch && phase === "playing" && (
            <>
              <div className="absolute bottom-4 left-4 flex gap-3">
                <TouchButton label="Steer left" onChange={(down) => engineRef.current?.setInput("left", down)}>◀</TouchButton>
                <TouchButton label="Steer right" onChange={(down) => engineRef.current?.setInput("right", down)}>▶</TouchButton>
              </div>
              <div className="absolute bottom-4 right-4 flex gap-3">
                <TouchButton label="Brake" onChange={(down) => engineRef.current?.setInput("brake", down)}>🛑</TouchButton>
                <TouchButton label="Gas" onChange={(down) => engineRef.current?.setInput("gas", down)}>⛽</TouchButton>
              </div>
            </>
          )}
          {phase === "paused" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40">
              <p className="text-4xl font-bold">Paused</p>
              <button type="button" className={`${GLASS} px-6 py-3 text-xl`} onClick={() => engineRef.current?.pause(false)}>Resume</button>
            </div>
          )}
        </>
      )}

      {over && phase === "crashed" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-4">
          <div className={`${GLASS} w-full max-w-sm space-y-2 p-6 text-center`}>
            <p className="text-3xl font-bold">Crash!</p>
            {over.newBest && <p className="text-amber-300">New best score!</p>}
            <p>Score <b>{over.score}</b></p>
            <p>Distance <b>{(over.distance / 1000).toFixed(2)} km</b></p>
            <p>Close calls <b>{over.closeCalls}</b></p>
            <p className="opacity-70">Best {best}</p>
            <div className="flex justify-center gap-3 pt-2">
              <button type="button" className="rounded-xl bg-cyan-500 px-5 py-3 font-bold" onClick={start}>Drive again</button>
              <button type="button" className={`${GLASS} px-5 py-3`} onClick={() => { setOver(null); engineRef.current?.toGarage(); }}>Garage</button>
            </div>
          </div>
        </div>
      )}

      {phase === "garage" && (
        <div ref={panelRef} className={`${GLASS} absolute inset-x-0 bottom-0 max-h-[46dvh] space-y-3 overflow-y-auto rounded-b-none p-4 md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-96 md:rounded-none md:rounded-l-2xl`}>
          <h2 className="text-2xl font-bold">Garage</h2>
          <div className="grid grid-cols-2 gap-2">
            {VEHICLES.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={prefs.vehicle === v.id}
                onClick={() => {
                  update({ vehicle: v.id, color: v.defaultColor });
                  engineRef.current?.setVehicle(v.id);
                  engineRef.current?.setPaint(v.defaultColor);
                }}
                className={`space-y-1 rounded-xl border p-2 text-left ${prefs.vehicle === v.id ? "border-cyan-300 bg-white/15" : "border-white/20"}`}
              >
                <div className="font-bold">{v.name}</div>
                <Rating label="Speed" value={v.rating.speed} />
                <Rating label="Accel" value={v.rating.accel} />
                <Rating label="Brake" value={v.rating.brake} />
                <Rating label="Steer" value={v.rating.steer} />
              </button>
            ))}
          </div>
          <div>
            <p className="mb-1 text-sm opacity-80">Paint</p>
            <div className="flex flex-wrap items-center gap-2">
              {PAINT_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Paint ${c}`}
                  onClick={() => {
                    update({ color: c });
                    engineRef.current?.setPaint(c);
                  }}
                  className={`h-8 w-8 rounded-full border-2 ${prefs.color === c ? "border-white" : "border-transparent"}`}
                  style={{ background: c }}
                />
              ))}
              <input
                type="color"
                aria-label="Custom paint colour"
                value={/^#[0-9a-f]{6}$/i.test(prefs.color) ? prefs.color : "#3a6ee8"}
                onChange={(e) => {
                  update({ color: e.target.value });
                  engineRef.current?.setPaint(e.target.value);
                }}
                className="h-8 w-10 rounded bg-transparent"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="mb-1 opacity-80">Time of day</p>
              <div className="flex gap-1">
                {[false, true].map((n) => (
                  <button key={String(n)} type="button" aria-pressed={prefs.night === n} onClick={() => { update({ night: n }); engineRef.current?.setNight(n); }} className={`flex-1 rounded-lg border px-2 py-2 ${prefs.night === n ? "border-cyan-300 bg-white/15" : "border-white/20"}`}>
                    {n ? "🌙 Night" : "☀️ Day"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 opacity-80">Camera</p>
              <div className="flex gap-1">
                {(Object.keys(camLabels) as CameraMode[]).map((c) => (
                  <button key={c} type="button" aria-pressed={prefs.camera === c} onClick={() => { update({ camera: c }); engineRef.current?.setCameraMode(c); }} className={`flex-1 rounded-lg border px-1 py-2 ${prefs.camera === c ? "border-cyan-300 bg-white/15" : "border-white/20"}`}>
                    {camLabels[c]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs opacity-70">Challenge game: crashing ends the run. Keys: WASD/arrows, Space brake, C camera, N night, M mute, H horn, P pause.</p>
          <button type="button" disabled={!ready} onClick={start} className="sticky bottom-0 w-full rounded-xl bg-cyan-500 py-3 text-xl font-bold shadow-lg disabled:opacity-50">Start driving</button>
        </div>
      )}
    </div>
  );
}
