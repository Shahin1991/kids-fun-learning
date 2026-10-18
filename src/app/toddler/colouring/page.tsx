"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
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

/** A big toolbar button that opens a tray of options; `children` previews the current choice. */
function ToolButton({ label, open, onClick, disabled, children }: { label: string; open?: boolean; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={open}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-16 min-w-16 flex-col items-center justify-center rounded-2xl px-2 text-3xl shadow active:scale-90 disabled:opacity-40 ${open ? "bg-kid-yellow" : "bg-surface"}`}
    >
      {children}
    </button>
  );
}

/** Options slide up from the bottom over the picture; tapping outside, ✕ or Escape closes them. */
function Tray({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  const reduced = useAppReducedMotion();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="backdrop" className="fixed inset-0 z-40 bg-black/25" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-hidden />
          <motion.div
            key="tray"
            role="dialog"
            aria-label={title}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-2xl rounded-t-3xl bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl"
            initial={reduced ? false : { y: "100%" }}
            animate={{ y: 0 }}
            exit={reduced ? { opacity: 0 } : { y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xl font-bold">{title}</p>
              <button type="button" onClick={onClose} aria-label="Close" className="flex h-12 w-12 items-center justify-center rounded-full bg-background text-2xl shadow active:scale-90">
                ✕
              </button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** A filled circle showing the current colour (or the rainbow brush). */
const swatch = (c: string) => (
  <span className="block h-10 w-10 rounded-full border-4 border-white shadow" style={{ background: c === RAINBOW ? "conic-gradient(#ff4d4d, #ffd43b, #51cf66, #22b8cf, #9b5de5, #ff4d4d)" : c }} />
);

/** Tap a region of the picture to fill it with the chosen colour. */
function ColourIn() {
  const [pageIdx, setPageIdx] = useState(0);
  const [color, setColor] = useState(PALETTE[0]);
  const [fills, setFills] = useState<Record<string, FillState>>({});
  const [tray, setTray] = useState<"colours" | "pictures" | null>(null);
  const page = PAGES[pageIdx];
  const state = fills[page.id] ?? emptyFill();
  const finished = useRef(new Set<string>());
  const closeTray = useCallback(() => setTray(null), []);
  const toggleTray = (t: "colours" | "pictures") => {
    setTray((cur) => (cur === t ? null : t));
    audioManager.playPop(0);
  };

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
    <div className="flex flex-1 flex-col gap-3">
      <div className="relative min-h-[50dvh] flex-1">
        <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full touch-manipulation rounded-3xl bg-white shadow-lg" role="img" aria-label={`${page.title} colouring page`}>
          {page.regions.map((r) => (
            <path key={r.id} d={r.d} transform={r.transform} fill={state.fills[r.id] ?? "#ffffff"} stroke="#2b2b2b" strokeWidth={r.id === "bg" ? 0 : 2.5} strokeLinejoin="round" onClick={() => fill(r.id)} className="cursor-pointer" />
          ))}
          {page.lines?.map((d) => <path key={d} d={d} fill="none" stroke="#2b2b2b" strokeWidth={2.5} strokeLinecap="round" pointerEvents="none" />)}
        </svg>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3" role="toolbar" aria-label="Colouring tools">
        <ToolButton label="Pick a colour" open={tray === "colours"} onClick={() => toggleTray("colours")}>
          {swatch(color)}
        </ToolButton>
        <ToolButton label="Pick a picture" open={tray === "pictures"} onClick={() => toggleTray("pictures")}>
          {page.emoji}
        </ToolButton>
        <ToolButton label="Undo" disabled={!state.history.length} onClick={() => setFills((f) => ({ ...f, [page.id]: undoFill(state) }))}>
          ↩️
        </ToolButton>
        <ToolButton label="Start over" onClick={() => setFills((f) => ({ ...f, [page.id]: emptyFill() }))}>
          🧽
        </ToolButton>
      </div>
      <Tray title="Pick a colour" open={tray === "colours"} onClose={closeTray}>
        <Palette
          value={color}
          onPick={(c) => {
            setColor(c);
            closeTray();
          }}
        />
      </Tray>
      <Tray title="Pick a picture" open={tray === "pictures"} onClose={closeTray}>
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
                closeTray();
              }}
              className={`flex h-16 w-16 items-center justify-center rounded-2xl text-4xl shadow active:scale-90 ${i === pageIdx ? "bg-kid-yellow" : "bg-background"}`}
            >
              {p.emoji}
            </button>
          ))}
        </div>
      </Tray>
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
  const [tray, setTray] = useState<"colours" | "brushes" | "stamps" | null>(null);
  const closeTray = useCallback(() => setTray(null), []);
  const toggleTray = (t: "colours" | "brushes" | "stamps") => {
    setTray((cur) => (cur === t ? null : t));
    audioManager.playPop(0);
  };
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
    <div className="flex flex-1 flex-col gap-3">
      <div className="relative min-h-[50dvh] flex-1">
        <canvas
          ref={canvasRef}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          aria-label="Drawing paper"
          className="absolute inset-0 h-full w-full touch-none rounded-3xl bg-white shadow-lg"
        />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3" role="toolbar" aria-label="Drawing tools">
        <ToolButton label="Pick a colour" open={tray === "colours"} onClick={() => toggleTray("colours")}>
          {swatch(stamp ? "#ffffff" : color)}
        </ToolButton>
        <ToolButton label="Pick a brush" open={tray === "brushes"} onClick={() => toggleTray("brushes")}>
          <span className="rounded-full bg-foreground" style={{ width: size * 0.9, height: size * 0.9 }} />
        </ToolButton>
        <ToolButton label="Pick a stamp" open={tray === "stamps"} onClick={() => toggleTray("stamps")}>
          {stamp ?? "⭐"}
        </ToolButton>
        <button type="button" onClick={clear} className={`h-16 rounded-2xl px-4 text-lg font-bold shadow active:scale-95 ${confirmClear ? "animate-pulse bg-kid-red text-white" : "bg-surface"}`}>
          {confirmClear ? "Tap again" : "🧽 New"}
        </button>
      </div>
      <Tray title="Pick a colour" open={tray === "colours"} onClose={closeTray}>
        <Palette
          value={stamp ? "" : color}
          onPick={(c) => {
            setColor(c);
            setStamp(null);
            closeTray();
          }}
          rainbow
        />
      </Tray>
      <Tray title="Pick a brush" open={tray === "brushes"} onClose={closeTray}>
        <div className="flex justify-center gap-3" role="group" aria-label="Brush sizes">
          {SIZES.map((s) => (
            <button key={s} type="button" aria-label={`Brush size ${s}`} aria-pressed={size === s && !stamp} onClick={() => { setSize(s); setStamp(null); closeTray(); }} className={`flex h-20 w-20 items-center justify-center rounded-2xl shadow active:scale-90 ${size === s && !stamp ? "bg-kid-yellow" : "bg-background"}`}>
              <span className="rounded-full bg-foreground" style={{ width: s * 1.2, height: s * 1.2 }} />
            </button>
          ))}
        </div>
      </Tray>
      <Tray title="Pick a stamp" open={tray === "stamps"} onClose={closeTray}>
        <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Stamps">
          {STAMPS.map((s) => (
            <button key={s} type="button" aria-label={`Stamp ${s}`} aria-pressed={stamp === s} onClick={() => { setStamp(s); closeTray(); }} className={`flex h-16 w-16 items-center justify-center rounded-2xl text-4xl shadow active:scale-90 ${stamp === s ? "bg-kid-yellow" : "bg-background"}`}>
              {s}
            </button>
          ))}
        </div>
      </Tray>
    </div>
  );
}

export default function ColouringPage() {
  const [tab, setTab] = useState<"colour" | "draw">("colour");
  return (
    <PageContainer className="gap-3!">
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
