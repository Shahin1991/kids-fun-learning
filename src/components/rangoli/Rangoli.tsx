"use client";

import { useEffect, useRef, useState } from "react";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import { guideDots, RANGOLI_COLORS, symmetricPoints, SYMMETRY, type Pt } from "@/lib/rangoli/symmetry";

const MODULE_ID = "rangoli";
/** A star for every this many strokes. */
const STAR_EVERY = 15;
const SIZES = [6, 14, 26];
const FLOOR = "#4a2c22";

type Tool = "line" | "petal";

/** A petal pointing away from the centre at p. */
function petal(g: CanvasRenderingContext2D, p: Pt, c: Pt, len: number) {
  const a = Math.atan2(p.y - c.y, p.x - c.x);
  g.save();
  g.translate(p.x, p.y);
  g.rotate(a);
  g.beginPath();
  g.ellipse(0, 0, len, len * 0.45, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

export default function Rangoli() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const dotsLayer = useRef<HTMLCanvasElement>(null);
  const last = useRef<Pt | null>(null);
  const strokes = useRef(0);
  const notes = useRef(0);
  const [color, setColor] = useState(RANGOLI_COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [parts, setParts] = useState<(typeof SYMMETRY)[number]>(8);
  const [tool, setTool] = useState<Tool>("line");
  const [dots, setDots] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);
  const [side, setSide] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => audioManager.speak("Draw in one place and watch it repeat all the way round! That's called symmetry."), 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSide(Math.floor(Math.max(240, Math.min(el.clientWidth, window.innerHeight * 0.62, window.innerHeight - 330)))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Size the canvas, keeping the drawing so far
  useEffect(() => {
    const c = canvas.current;
    const d = dotsLayer.current;
    if (!c || !d || !side) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const px = Math.round(side * dpr);
    const copy = document.createElement("canvas");
    copy.width = c.width;
    copy.height = c.height;
    if (c.width && c.height) copy.getContext("2d")!.drawImage(c, 0, 0);
    c.width = c.height = d.width = d.height = px;
    const g = c.getContext("2d")!;
    g.fillStyle = FLOOR;
    g.fillRect(0, 0, px, px);
    if (copy.width && copy.height) g.drawImage(copy, 0, 0, px, px);
    const dg = d.getContext("2d")!;
    dg.clearRect(0, 0, px, px);
    dg.fillStyle = "rgba(255,255,255,0.55)";
    for (const p of guideDots(px, 5)) {
      dg.beginPath();
      dg.arc(p.x, p.y, px * 0.006, 0, Math.PI * 2);
      dg.fill();
    }
  }, [side]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const c = e.currentTarget;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };

  const scale = () => (canvas.current ? canvas.current.width / Math.max(1, side) : 1);

  const draw = (from: Pt, to: Pt) => {
    const c = canvas.current!;
    const g = c.getContext("2d")!;
    const centre = { x: c.width / 2, y: c.height / 2 };
    const a = symmetricPoints(from, centre, parts, true);
    const b = symmetricPoints(to, centre, parts, true);
    g.strokeStyle = g.fillStyle = color;
    g.shadowColor = color;
    g.shadowBlur = size * scale() * 0.6;
    g.lineWidth = size * scale();
    g.lineCap = "round";
    g.lineJoin = "round";
    for (let i = 0; i < a.length; i++) {
      g.beginPath();
      g.moveTo(a[i].x, a[i].y);
      g.lineTo(b[i].x + 0.01, b[i].y);
      g.stroke();
    }
    g.shadowBlur = 0;
    // The note follows how far from the centre the child is drawing
    if (++notes.current % 5 === 0) audioManager.playNote(Math.min(9, Math.floor((Math.hypot(to.x - centre.x, to.y - centre.y) / (c.width / 2)) * 10)));
  };

  const stamp = (p: Pt) => {
    const c = canvas.current!;
    const g = c.getContext("2d")!;
    const centre = { x: c.width / 2, y: c.height / 2 };
    g.fillStyle = color;
    g.shadowColor = color;
    g.shadowBlur = size * scale() * 0.5;
    for (const q of symmetricPoints(p, centre, parts, false)) petal(g, q, centre, (size + 10) * scale() * 1.3);
    g.shadowBlur = 0;
    audioManager.playBell(523.25 + parts * 30);
  };

  const finishStroke = () => {
    strokes.current++;
    if (strokes.current % STAR_EVERY === 0) {
      void finishActivity(MODULE_ID, { score: strokes.current });
      audioManager.speak(`What a beautiful rangoli! It has ${parts * (tool === "line" ? 2 : 1)} matching parts.`);
    }
  };

  const clear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      audioManager.speak("Tap again to start a new rangoli");
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    const c = canvas.current;
    if (c) {
      const g = c.getContext("2d")!;
      g.fillStyle = FLOOR;
      g.fillRect(0, 0, c.width, c.height);
    }
    setConfirmClear(false);
    audioManager.playPop(0);
  };

  const chip = (on: boolean) => `min-h-14 min-w-14 rounded-full px-3 text-lg font-bold shadow active:scale-95 ${on ? "bg-kid-orange text-white" : "bg-surface"}`;

  return (
    <div className="flex flex-1 flex-col items-center gap-3 pb-4">
      <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Matching parts">
        {SYMMETRY.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={parts === n}
            onClick={() => {
              setParts(n);
              audioManager.speak(`${n * 2} matching parts`);
            }}
            className={chip(parts === n)}
          >
            ✳️ {n * 2}
          </button>
        ))}
        <span className="mx-1 h-8 w-px bg-foreground/20" aria-hidden />
        <button type="button" aria-pressed={tool === "line"} onClick={() => setTool("line")} className={chip(tool === "line")}>
          〰️ Draw
        </button>
        <button type="button" aria-pressed={tool === "petal"} onClick={() => setTool("petal")} className={chip(tool === "petal")}>
          🌸 Petals
        </button>
        <button type="button" aria-pressed={dots} onClick={() => setDots((d) => !d)} className={chip(dots)} aria-label="Guide dots">
          ⁘
        </button>
        <button type="button" onClick={clear} className={`min-h-14 rounded-full px-4 text-lg font-bold shadow active:scale-95 ${confirmClear ? "bg-kid-red text-white" : "bg-surface"}`}>
          {confirmClear ? "Tap again" : "🧽 New"}
        </button>
      </div>

      <div ref={wrap} className="flex w-full max-w-2xl justify-center">
        <div className="relative" style={{ width: side, height: side }}>
          <canvas
            ref={canvas}
            aria-label="Rangoli floor: draw to make a pattern"
            className="h-full w-full touch-none rounded-full shadow-lg"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              const p = point(e);
              if (tool === "petal") {
                stamp(p);
                finishStroke();
                return;
              }
              last.current = p;
              draw(p, p);
            }}
            onPointerMove={(e) => {
              if (!last.current) return;
              const p = point(e);
              draw(last.current, p);
              last.current = p;
            }}
            onPointerUp={() => {
              if (last.current) finishStroke();
              last.current = null;
            }}
            onPointerCancel={() => (last.current = null)}
          />
          <canvas ref={dotsLayer} className={`pointer-events-none absolute inset-0 h-full w-full rounded-full transition-opacity ${dots ? "opacity-100" : "opacity-0"}`} aria-hidden />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Colours and sizes">
        {RANGOLI_COLORS.map((c) => (
          <button key={c} type="button" aria-label={`Colour ${c}`} aria-pressed={color === c} onClick={() => setColor(c)} className={`h-14 w-14 rounded-full border-4 shadow active:scale-90 ${color === c ? "border-kid-orange scale-110" : "border-white/70"}`} style={{ background: c }} />
        ))}
        <span className="mx-1 h-8 w-px bg-foreground/20" aria-hidden />
        {SIZES.map((s) => (
          <button key={s} type="button" aria-label={`Brush size ${s}`} aria-pressed={size === s} onClick={() => setSize(s)} className={`flex h-14 w-14 items-center justify-center rounded-full shadow active:scale-90 ${size === s ? "bg-kid-orange" : "bg-surface"}`}>
            <span className="rounded-full" style={{ width: s, height: s, background: color }} />
          </button>
        ))}
      </div>
    </div>
  );
}
