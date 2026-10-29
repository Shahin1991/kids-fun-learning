"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import { buryBones, DINOS, FOUND_AT, uncovered, type BonePiece, type Buried } from "@/lib/dino-dig/dig";

const MODULE_ID = "dino-dig";
const W = 400;
const H = 260;
const LOW_W = 80;
const LOW_H = 52;
const BRUSH = 38;

/** A bone or skull drawn around (0, 0), as SVG. */
function BoneArt({ kind, len, fill = "#f6ecd6", stroke = "#b59a6a", dashed = false }: { kind: BonePiece["kind"]; len: number; fill?: string; stroke?: string; dashed?: boolean }) {
  const line = { stroke, strokeWidth: 3, strokeDasharray: dashed ? "6 5" : undefined };
  if (kind === "skull") {
    const s = len / 90;
    return (
      <g transform={`scale(${s})`}>
        <path d="M-45 -10 Q-40 -38 0 -38 Q38 -38 45 -8 L45 14 Q20 24 -20 22 L-45 10 Z" fill={fill} {...line} />
        <circle cx={14} cy={-14} r={8} fill={dashed ? "none" : "#7a6646"} {...(dashed ? line : {})} />
        {!dashed && [0, 1, 2, 3].map((i) => <path key={i} d={`M${-18 + i * 12} 20 l5 9 l5 -9`} fill="#fff" stroke={stroke} strokeWidth={1.5} />)}
      </g>
    );
  }
  const h = len / 2;
  return (
    <g>
      <rect x={-h + 8} y={-7} width={len - 16} height={14} rx={7} fill={fill} {...line} />
      {[-1, 1].map((side) => (
        <g key={side}>
          <circle cx={side * (h - 8)} cy={-8} r={10} fill={fill} {...line} />
          <circle cx={side * (h - 8)} cy={8} r={10} fill={fill} {...line} />
        </g>
      ))}
    </g>
  );
}

/** The same shapes on a canvas, for the low-res "where is this bone" masks. */
function drawBoneMask(g: CanvasRenderingContext2D, kind: BonePiece["kind"], len: number) {
  g.fillStyle = "#000";
  if (kind === "skull") {
    const s = len / 90;
    g.beginPath();
    g.ellipse(0, -6 * s, 45 * s, 30 * s, 0, 0, Math.PI * 2);
    g.fill();
    return;
  }
  const h = len / 2;
  g.fillRect(-h + 4, -10, len - 8, 20);
  for (const side of [-1, 1]) {
    g.beginPath();
    g.arc(side * (h - 8), 0, 16, 0, Math.PI * 2);
    g.fill();
  }
}

function boneMask(piece: BonePiece, at: Buried): Uint8Array {
  const c = Object.assign(document.createElement("canvas"), { width: LOW_W, height: LOW_H });
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.scale(LOW_W / W, LOW_H / H);
  g.translate(at.x, at.y);
  g.rotate((at.rot * Math.PI) / 180);
  drawBoneMask(g, piece.kind, piece.len * 0.8);
  const rgba = g.getImageData(0, 0, LOW_W, LOW_H).data;
  const out = new Uint8Array(LOW_W * LOW_H);
  for (let i = 0; i < out.length; i++) out[i] = rgba[i * 4 + 3];
  return out;
}

/** Sand with pebbles and darker streaks. */
function paintSand(g: CanvasRenderingContext2D, w: number, h: number) {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#e9c98f");
  grad.addColorStop(1, "#c99a5b");
  g.globalCompositeOperation = "source-over";
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 140; i++) {
    g.fillStyle = i % 3 ? "rgba(140,100,55,0.35)" : "rgba(255,240,210,0.45)";
    g.beginPath();
    g.arc(Math.random() * w, Math.random() * h, (1 + Math.random() * 4) * (w / W), 0, Math.PI * 2);
    g.fill();
  }
}

interface Dust {
  id: number;
  x: number;
  y: number;
}

const newDust = (id: number, x: number, y: number): Dust => ({ id, x: x + (Math.random() - 0.5) * 30, y: y + (Math.random() - 0.5) * 20 });

export default function DinoDig() {
  const reduced = useAppReducedMotion();
  const [dig, setDig] = useState(0);
  const dino = DINOS[dig % DINOS.length];
  const [buried, setBuried] = useState<Buried[]>(() => buryBones(DINOS[0]));
  const [found, setFound] = useState<string[]>([]);
  const [complete, setComplete] = useState(false);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [dust, setDust] = useState<Dust[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const sand = useRef<HTMLCanvasElement>(null);
  const masks = useRef<Record<string, Uint8Array>>({});
  const low = useRef<HTMLCanvasElement | null>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const moves = useRef(0);
  const dustId = useRef(0);
  const foundRef = useRef<string[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Fresh sand and bone masks for each dig
  useEffect(() => {
    const el = box.current;
    const c = sand.current;
    if (!el || !c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(el.clientWidth * dpr);
    c.height = Math.round((c.width * H) / W);
    paintSand(c.getContext("2d")!, c.width, c.height);
    masks.current = Object.fromEntries(dino.bones.map((b) => [b.id, boneMask(b, buried.find((x) => x.id === b.id)!)]));
    foundRef.current = [];
    const t = setTimeout(() => audioManager.speak(`Dinosaur bones are hiding in the sand! Brush the sand away to find ${dino.bones.length} bones.`), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one setup per dig
  }, [dig]);

  const sandAlpha = () => {
    low.current ??= Object.assign(document.createElement("canvas"), { width: LOW_W, height: LOW_H });
    const g = low.current.getContext("2d", { willReadFrequently: true })!;
    g.clearRect(0, 0, LOW_W, LOW_H);
    g.drawImage(sand.current!, 0, 0, LOW_W, LOW_H);
    const rgba = g.getImageData(0, 0, LOW_W, LOW_H).data;
    const a = new Uint8Array(LOW_W * LOW_H);
    for (let i = 0; i < a.length; i++) a[i] = rgba[i * 4 + 3];
    return a;
  };

  const check = () => {
    if (complete) return;
    const a = sandAlpha();
    const newly = dino.bones.filter((b) => !foundRef.current.includes(b.id) && uncovered(masks.current[b.id], a) >= FOUND_AT);
    if (!newly.length) return;
    const next = [...foundRef.current, ...newly.map((b) => b.id)];
    foundRef.current = next;
    setFound(next);
    audioManager.play("success");
    if (next.length < dino.bones.length) {
      audioManager.speak(`You found a ${newly[0].name}! ${dino.bones.length - next.length} more to find.`);
      return;
    }
    setComplete(true);
    timers.current.push(
      setTimeout(() => {
        audioManager.speak(`Roar! It's a ${dino.name}! ${dino.fact}`);
      }, 700),
    );
    void finishActivity(MODULE_ID, { score: dig + 1 });
    timers.current.push(
      setTimeout(() => {
        const d = dig + 1;
        setBuried(buryBones(DINOS[d % DINOS.length]));
        setFound([]);
        setComplete(false);
        setDig(d);
      }, 6500),
    );
  };

  const brush = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    setPointer({ x: px, y: py });
    if (!last.current || complete) return;
    const k = sand.current!.width / r.width;
    const g = sand.current!.getContext("2d")!;
    g.globalCompositeOperation = "destination-out";
    g.lineWidth = BRUSH * (r.width / W) * k;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(last.current.x * k, last.current.y * k);
    g.lineTo(px * k + 0.01, py * k);
    g.stroke();
    last.current = { x: px, y: py };
    if (++moves.current % 3 === 0 && !reduced) {
      const id = ++dustId.current;
      setDust((d) => [...d.slice(-10), newDust(id, px, py)]);
    }
    if (moves.current % 10 === 0) audioManager.playSfx("whoosh", 0.2);
    if (moves.current % 6 === 0) check();
  };

  const boneById = (id: string) => dino.bones.find((b) => b.id === id)!;

  return (
    <div className="flex flex-1 flex-col items-center gap-4">
      <div
        ref={box}
        className="relative aspect-[400/260] w-full max-w-2xl touch-none select-none overflow-hidden rounded-3xl bg-[#a87a45] shadow-inner"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const r = e.currentTarget.getBoundingClientRect();
          last.current = { x: e.clientX - r.left, y: e.clientY - r.top };
          brush(e);
        }}
        onPointerMove={brush}
        onPointerUp={() => {
          last.current = null;
          check();
        }}
        onPointerLeave={() => setPointer(null)}
        role="img"
        aria-label={`A dig site. ${found.length} of ${dino.bones.length} bones found.`}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden>
          {buried.map((at) => {
            const b = boneById(at.id);
            const isFound = found.includes(b.id);
            return (
              <g key={`${dig}-${at.id}`} transform={`translate(${at.x} ${at.y}) rotate(${at.rot}) scale(0.8)`}>
                {isFound && (
                  <motion.circle r={b.len * 0.62} fill="#ffe066" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.7, 0.35] }} transition={{ duration: 0.8 }} />
                )}
                <BoneArt kind={b.kind} len={b.len} />
              </g>
            );
          })}
        </svg>
        <canvas ref={sand} className="pointer-events-none absolute inset-0 h-full w-full" />
        <AnimatePresence>
          {dust.map((d) => (
            <motion.span
              key={d.id}
              className="pointer-events-none absolute h-2 w-2 rounded-full bg-[#d9b47a]"
              style={{ left: d.x, top: d.y }}
              initial={{ opacity: 1, y: 0, x: 0 }}
              animate={{ opacity: 0, y: -30, x: (d.id % 2 ? 1 : -1) * 20 }}
              transition={{ duration: 0.6 }}
              onAnimationComplete={() => setDust((all) => all.filter((x) => x.id !== d.id))}
            />
          ))}
        </AnimatePresence>
        {pointer && !complete && (
          <span className="pointer-events-none absolute -translate-x-1/4 -translate-y-3/4 text-5xl drop-shadow" style={{ left: pointer.x, top: pointer.y }} aria-hidden>
            🖌️
          </span>
        )}
        {!pointer && found.length === 0 && (
          <motion.span className="pointer-events-none absolute left-1/2 top-1/2 text-6xl" animate={reduced ? undefined : { x: [-50, 50, -50], rotate: [-10, 10, -10] }} transition={{ repeat: Infinity, duration: 1.8 }} aria-hidden>
            🖌️
          </motion.span>
        )}
      </div>

      {/* The skeleton fills in as bones are found */}
      <div className="relative aspect-[400/240] w-full max-w-md rounded-3xl bg-surface shadow-md">
        <svg viewBox="0 0 400 240" className="absolute inset-0 h-full w-full" aria-label={`${dino.name} skeleton, ${found.length} of ${dino.bones.length} bones`}>
          {dino.bones.map((b) => (
            <g key={`${dig}-${b.id}`} transform={`translate(${b.x} ${b.y}) rotate(${b.rot})`}>
              {found.includes(b.id) ? (
                <motion.g initial={reduced ? false : { scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 12 }}>
                  <BoneArt kind={b.kind} len={b.len} />
                </motion.g>
              ) : (
                <BoneArt kind={b.kind} len={b.len} fill="none" stroke="#9a8f7a" dashed />
              )}
            </g>
          ))}
        </svg>
        <AnimatePresence>
          {complete && (
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-surface/85"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.6 }}
            >
              <motion.span className="text-8xl" initial={reduced ? false : { scale: 0 }} animate={reduced ? { scale: 1 } : { scale: [0, 1.3, 1], rotate: [0, -8, 8, 0] }} transition={{ delay: 0.7, duration: 0.8 }} aria-hidden>
                {dino.emoji}
              </motion.span>
              <span className="text-2xl font-extrabold">ROAR! {dino.name}</span>
              <span className="px-4 text-center text-lg font-semibold opacity-80">{dino.fact}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
