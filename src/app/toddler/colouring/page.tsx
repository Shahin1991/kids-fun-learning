"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import { emptyFill, fillRegion, undoFill, type FillState } from "@/lib/colouring/fill";
import { PAGES, PALETTE } from "@/lib/colouring/pages";

const RAINBOW = "rainbow";
const STAMPS = ["⭐", "❤️", "🌸", "🐞", "🦋", "🌈"];
const SIZES = [8, 18, 34];

function Palette({ value, onPick, rainbow }: { value: string; onPick: (c: string) => void; rainbow?: boolean }) {
  return (
    <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Colours">
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Colour ${c}`}
          aria-pressed={value === c}
          onClick={() => {
            onPick(c);
            audioManager.playPop(1);
          }}
          className={`h-14 w-14 rounded-full border-4 shadow active:scale-90 ${value === c ? "scale-110 border-foreground" : "border-white"}`}
          style={{ background: c }}
        />
      ))}
      {rainbow && (
        <button
          type="button"
          aria-label="Rainbow"
          aria-pressed={value === RAINBOW}
          onClick={() => onPick(RAINBOW)}
          className={`h-14 w-14 rounded-full border-4 shadow active:scale-90 ${value === RAINBOW ? "scale-110 border-foreground" : "border-white"}`}
          style={{ background: "conic-gradient(#ff4d4d, #ffd43b, #51cf66, #22b8cf, #9b5de5, #ff4d4d)" }}
        />
      )}
    </div>
  );
}

/** Tap a region of the picture to fill it with the chosen colour. */
function ColourIn() {
  const [pageIdx, setPageIdx] = useState(0);
  const [color, setColor] = useState(PALETTE[0]);
  const [fills, setFills] = useState<Record<string, FillState>>({});
  const page = PAGES[pageIdx];
  const state = fills[page.id] ?? emptyFill();
  const finished = useRef(new Set<string>());

  const coloured = (s: FillState) => page.regions.filter((r) => s.fills[r.id]).length;

  const fill = (id: string) => {
    const next = fillRegion(state, id, color);
    if (next === state) return;
    setFills((f) => ({ ...f, [page.id]: next }));
    audioManager.playPop(coloured(next));
    // A star the first time most of a picture has been coloured in.
    if (!finished.current.has(page.id) && coloured(next) >= Math.ceil(page.regions.length * 0.7)) {
      finished.current.add(page.id);
      audioManager.speak(`What a beautiful ${page.title.toLowerCase()}!`);
      void finishActivity("colouring", { variant: page.id });
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center gap-4">
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Pictures">
        {PAGES.map((p, i) => (
          <button
            key={p.id}
            type="button"
            aria-label={p.title}
            aria-pressed={i === pageIdx}
            onClick={() => {
              setPageIdx(i);
              audioManager.speak(p.title);
            }}
            className={`flex h-16 w-16 items-center justify-center rounded-2xl text-4xl shadow active:scale-90 ${i === pageIdx ? "bg-kid-yellow" : "bg-surface"}`}
          >
            {p.emoji}
          </button>
        ))}
      </div>
      <svg viewBox="0 0 200 200" className="aspect-square w-full max-w-md touch-manipulation rounded-3xl bg-white shadow-lg" role="img" aria-label={`${page.title} colouring page`}>
        {page.regions.map((r) => (
          <path key={r.id} d={r.d} transform={r.transform} fill={state.fills[r.id] ?? "#ffffff"} stroke="#2b2b2b" strokeWidth={r.id === "bg" ? 0 : 2.5} strokeLinejoin="round" onClick={() => fill(r.id)} className="cursor-pointer" />
        ))}
        {page.lines?.map((d) => <path key={d} d={d} fill="none" stroke="#2b2b2b" strokeWidth={2.5} strokeLinecap="round" pointerEvents="none" />)}
      </svg>
      <Palette value={color} onPick={setColor} />
      <div className="flex gap-3">
        <button type="button" onClick={() => setFills((f) => ({ ...f, [page.id]: undoFill(state) }))} disabled={!state.history.length} className="min-h-touch rounded-3xl bg-surface px-6 text-xl font-bold shadow active:scale-95 disabled:opacity-40">
          ↩️ Undo
        </button>
        <button type="button" onClick={() => setFills((f) => ({ ...f, [page.id]: emptyFill() }))} className="min-h-touch rounded-3xl bg-surface px-6 text-xl font-bold shadow active:scale-95">
          🧽 Start over
        </button>
      </div>
    </div>
  );
}

/** Finger painting on a canvas: chunky brushes, a rainbow brush and stamps. */
function Draw() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState(PALETTE[5]);
  const [size, setSize] = useState(SIZES[1]);
  const [stamp, setStamp] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const hue = useRef(0);
  const strokes = useRef(0);

  // Keep the canvas sharp and sized to its box; copy the drawing across when it resizes.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(c.clientWidth * dpr);
      const h = Math.round(c.clientHeight * dpr);
      if (c.width === w && c.height === h) return;
      const copy = document.createElement("canvas");
      copy.width = c.width;
      copy.height = c.height;
      copy.getContext("2d")?.drawImage(c, 0, 0);
      c.width = w;
      c.height = h;
      const g = c.getContext("2d")!;
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, w, h);
      if (copy.width && copy.height) g.drawImage(copy, 0, 0, w, h);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height, scale: c.width / r.width };
  };

  const ink = () => {
    if (color !== RAINBOW) return color;
    hue.current = (hue.current + 4) % 360;
    return `hsl(${hue.current} 90% 55%)`;
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = point(e);
    const g = e.currentTarget.getContext("2d")!;
    if (stamp) {
      g.font = `${Math.round(size * 2.4 * p.scale)}px sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(stamp, p.x, p.y);
      audioManager.playPop(2);
      return;
    }
    g.fillStyle = ink();
    g.beginPath();
    g.arc(p.x, p.y, (size * p.scale) / 2, 0, Math.PI * 2);
    g.fill();
    last.current = p;
    audioManager.playNote(Math.min(9, Math.floor(size / 4)));
    strokes.current += 1;
    if (strokes.current === 25) void finishActivity("colouring", { variant: "draw" });
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!last.current || stamp) return;
    const p = point(e);
    const g = e.currentTarget.getContext("2d")!;
    g.strokeStyle = ink();
    g.lineWidth = size * p.scale;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(last.current.x, last.current.y);
    g.lineTo(p.x, p.y);
    g.stroke();
    last.current = p;
  };

  const up = () => {
    last.current = null;
  };

  const clear = useCallback(() => {
    if (!confirmClear) {
      setConfirmClear(true);
      audioManager.speak("Tap again to start a new picture");
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    const c = canvasRef.current;
    const g = c?.getContext("2d");
    if (c && g) {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, c.width, c.height);
    }
    setConfirmClear(false);
    audioManager.playPaper(true);
  }, [confirmClear]);

  return (
    <div className="flex flex-1 flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        aria-label="Drawing paper"
        className="aspect-[4/3] w-full max-w-2xl touch-none rounded-3xl bg-white shadow-lg"
        style={{ maxHeight: "55dvh" }}
      />
      <Palette
        value={stamp ? "" : color}
        onPick={(c) => {
          setColor(c);
          setStamp(null);
        }}
        rainbow
      />
      <div className="flex flex-wrap items-center justify-center gap-2">
        {SIZES.map((s) => (
          <button key={s} type="button" aria-label={`Brush size ${s}`} aria-pressed={size === s && !stamp} onClick={() => { setSize(s); setStamp(null); }} className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow active:scale-90 ${size === s && !stamp ? "bg-kid-yellow" : "bg-surface"}`}>
            <span className="rounded-full bg-foreground" style={{ width: s * 0.9, height: s * 0.9 }} />
          </button>
        ))}
        {STAMPS.map((s) => (
          <button key={s} type="button" aria-label={`Stamp ${s}`} aria-pressed={stamp === s} onClick={() => setStamp(s)} className={`flex h-14 w-14 items-center justify-center rounded-2xl text-3xl shadow active:scale-90 ${stamp === s ? "bg-kid-yellow" : "bg-surface"}`}>
            {s}
          </button>
        ))}
        <button type="button" onClick={clear} className={`min-h-14 rounded-2xl px-4 text-lg font-bold shadow active:scale-95 ${confirmClear ? "animate-pulse bg-kid-red text-white" : "bg-surface"}`}>
          {confirmClear ? "Tap again" : "🧽 New"}
        </button>
      </div>
    </div>
  );
}

export default function ColouringPage() {
  const [tab, setTab] = useState<"colour" | "draw">("colour");
  return (
    <PageContainer>
      <ActivityHeader title="Colouring" moduleId="colouring" />
      <div className="flex justify-center gap-2" role="tablist">
        {([["colour", "🖍️ Colour in"], ["draw", "🎨 Draw"]] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`min-h-touch rounded-3xl px-6 text-xl font-bold shadow active:scale-95 ${tab === id ? "bg-kid-orange text-white" : "bg-surface"}`}>
            {label}
          </button>
        ))}
      </div>
      <ClientOnly>{tab === "colour" ? <ColourIn /> : <Draw />}</ClientOnly>
    </PageContainer>
  );
}
