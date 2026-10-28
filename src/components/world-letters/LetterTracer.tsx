"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { alphaOf, coverage, DONE_AT, GRID, hintCell } from "@/lib/world-letters/coverage";

interface Layers {
  /** The letter as solid ink, used to clip the paint and to measure coverage */
  letter: HTMLCanvasElement;
  /** The pale guide letter the child paints over */
  pale: HTMLCanvasElement;
  /** Raw finger strokes */
  paint: HTMLCanvasElement;
  /** Paint clipped to the letter */
  clipped: HTMLCanvasElement;
  low: HTMLCanvasElement;
  lowLetter: Uint8Array;
  brush: number;
}

const canvas = (w: number, h: number) => Object.assign(document.createElement("canvas"), { width: w, height: h });

/** Draws `char` as big as fits in 74% of the box, centred on its ink rather than its font box. */
function drawGlyph(g: CanvasRenderingContext2D, char: string, family: string, w: number, h: number) {
  g.font = `700 100px ${family}`;
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  const m = g.measureText(char);
  const bw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight || 60;
  const bh = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent || 80;
  const k = Math.min((w * 0.74) / bw, (h * 0.74) / bh);
  g.font = `700 ${100 * k}px ${family}`;
  g.fillText(char, w / 2 - ((m.actualBoundingBoxRight - m.actualBoundingBoxLeft) * k) / 2, h / 2 + ((m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) * k) / 2);
}

/**
 * Paint-the-letter tracing: the child paints over a pale letter with a rainbow finger, the paint only sticks
 * inside the letter, and the letter counts as traced once most of it is coloured in. Nothing can go wrong.
 */
export function LetterTracer({ char, family, onProgress, onDone }: { char: string; family: string; onProgress: (f: number) => void; onDone: () => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const view = useRef<HTMLCanvasElement>(null);
  const layers = useRef<Layers | null>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const moves = useRef(0);
  const hue = useRef(0);
  const done = useRef(false);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hint, setHint] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState(0);
  const cb = useRef({ onProgress, onDone });
  useEffect(() => {
    cb.current = { onProgress, onDone };
  });

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize(Math.floor(Math.min(el.clientWidth, el.clientHeight))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const render = () => {
    const L = layers.current;
    const c = view.current;
    if (!L || !c) return;
    const cg = L.clipped.getContext("2d")!;
    cg.globalCompositeOperation = "source-over";
    cg.clearRect(0, 0, L.clipped.width, L.clipped.height);
    cg.drawImage(L.letter, 0, 0);
    cg.globalCompositeOperation = "source-in";
    cg.drawImage(L.paint, 0, 0);
    cg.globalCompositeOperation = "source-over";
    const g = c.getContext("2d")!;
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(L.pale, 0, 0);
    g.drawImage(L.clipped, 0, 0);
  };

  const measure = () => {
    const L = layers.current;
    if (!L) return 0;
    const g = L.low.getContext("2d", { willReadFrequently: true })!;
    g.clearRect(0, 0, GRID, GRID);
    g.drawImage(L.clipped, 0, 0, GRID, GRID);
    return coverage(L.lowLetter, alphaOf(g.getImageData(0, 0, GRID, GRID).data));
  };

  const showHintSoon = (ms = 4000) => {
    if (idle.current) clearTimeout(idle.current);
    idle.current = setTimeout(() => {
      const L = layers.current;
      if (!L || done.current) return;
      const g = L.low.getContext("2d", { willReadFrequently: true })!;
      g.clearRect(0, 0, GRID, GRID);
      g.drawImage(L.clipped, 0, 0, GRID, GRID);
      const cell = hintCell(L.lowLetter, alphaOf(g.getImageData(0, 0, GRID, GRID).data));
      setHint(cell && { x: ((cell.x + 0.5) / GRID) * 100, y: ((cell.y + 0.5) / GRID) * 100 });
    }, ms);
  };

  // Build the layers for this letter and size; on a resize, keep the paint so far.
  useEffect(() => {
    if (!size) return;
    let cancelled = false;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const px = Math.round(size * dpr);
    const fontReady = document.fonts?.load(`700 100px ${family}`, char).catch(() => undefined) ?? Promise.resolve();
    void fontReady.then(() => {
      if (cancelled || !view.current) return;
      const old = layers.current;
      const letter = canvas(px, px);
      drawGlyph(letter.getContext("2d")!, char, family, px, px);
      const pale = canvas(px, px);
      const pg = pale.getContext("2d")!;
      pg.shadowColor = "rgba(59,47,74,0.25)";
      pg.shadowBlur = px * 0.012;
      pg.shadowOffsetY = px * 0.008;
      pg.drawImage(letter, 0, 0);
      pg.globalCompositeOperation = "source-in";
      pg.fillStyle = "#cdbfea";
      pg.fillRect(0, 0, px, px);
      const paint = canvas(px, px);
      if (old && old.paint.dataset.char === char) paint.getContext("2d")!.drawImage(old.paint, 0, 0, px, px);
      paint.dataset.char = char;
      const low = canvas(GRID, GRID);
      const lg = low.getContext("2d", { willReadFrequently: true })!;
      lg.drawImage(letter, 0, 0, GRID, GRID);
      layers.current = { letter, pale, paint, clipped: canvas(px, px), low, lowLetter: alphaOf(lg.getImageData(0, 0, GRID, GRID).data), brush: px * 0.11 };
      view.current.width = px;
      view.current.height = px;
      render();
      if (!old || old.paint.dataset.char !== char) {
        done.current = false;
        setHint(null);
        showHintSoon(1500);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [char, family, size]);

  useEffect(
    () => () => {
      if (idle.current) clearTimeout(idle.current);
    },
    [],
  );

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };

  const stroke = (to: { x: number; y: number }) => {
    const L = layers.current;
    if (!L) return;
    const g = L.paint.getContext("2d")!;
    hue.current = (hue.current + 3) % 360;
    g.strokeStyle = g.fillStyle = `hsl(${hue.current} 85% 58%)`;
    g.lineWidth = L.brush;
    g.lineCap = "round";
    g.lineJoin = "round";
    const from = last.current ?? to;
    g.beginPath();
    g.moveTo(from.x, from.y);
    g.lineTo(to.x + 0.01, to.y);
    g.stroke();
    last.current = to;
    render();
  };

  const check = () => {
    if (done.current) return;
    const f = measure();
    cb.current.onProgress(f);
    if (f < DONE_AT) return;
    done.current = true;
    // Fill in the last gaps so the finished letter looks complete
    const L = layers.current!;
    const g = L.paint.getContext("2d")!;
    const grad = g.createLinearGradient(0, 0, L.paint.width, L.paint.height);
    grad.addColorStop(0, `hsl(${hue.current} 85% 58%)`);
    grad.addColorStop(1, `hsl(${(hue.current + 90) % 360} 85% 58%)`);
    g.globalCompositeOperation = "destination-over";
    g.fillStyle = grad;
    g.fillRect(0, 0, L.paint.width, L.paint.height);
    g.globalCompositeOperation = "source-over";
    render();
    setHint(null);
    cb.current.onDone();
  };

  return (
    <div ref={wrap} className="relative flex h-full w-full items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <canvas
          ref={view}
          aria-label={`Paint over the letter ${char}`}
          className="h-full w-full touch-none rounded-3xl bg-white shadow-inner"
          onPointerDown={(e) => {
            if (done.current) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            setHint(null);
            if (idle.current) clearTimeout(idle.current);
            last.current = null;
            stroke(point(e));
          }}
          onPointerMove={(e) => {
            if (!last.current || done.current) return;
            stroke(point(e));
            if (++moves.current % 6 === 0) check();
          }}
          onPointerUp={() => {
            last.current = null;
            check();
            if (!done.current) showHintSoon();
          }}
          onPointerCancel={() => (last.current = null)}
        />
        {hint && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-kid-orange bg-kid-yellow/50"
            style={{ left: `${hint.x}%`, top: `${hint.y}%` }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [0.8, 1.15, 0.8], opacity: 1 }}
            transition={{ scale: { repeat: Infinity, duration: 1.1 }, opacity: { duration: 0.3 } }}
          />
        )}
      </div>
    </div>
  );
}
