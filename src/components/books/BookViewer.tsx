"use client";

import { animate, motion, motionValue, useTransform, type MotionValue } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";
import { ItemArt } from "@/components/ItemArt";
import type { BookDef, BookPage } from "@/data/books";
import { audioManager } from "@/lib/audio/AudioManager";
import { finishActivity } from "@/lib/activity";

export interface BookFrom {
  /** Offset of the shelf spine from the centre of the screen, and its size relative to the open book */
  x: number;
  y: number;
  scale: number;
}

const SPRING = { type: "spring", stiffness: 120, damping: 18, mass: 0.9 } as const;
const ZERO = motionValue(0);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function PageFace({ page, n, total }: { page: BookPage; n: number; total: number }) {
  const count = page.count ?? 1;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between px-4 pb-3 pt-5 text-ink" style={{ background: `linear-gradient(100deg, rgba(0,0,0,0.10) 0, rgba(0,0,0,0) 7%), ${page.bg}` }}>
      <p className="font-extrabold leading-none" style={{ color: page.fg, fontSize: "clamp(2.8rem, 15vw, 6rem)" }}>{page.big ?? " "}</p>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        {page.art ? (
          <ItemArt art={page.art} emoji={page.emoji ?? ""} label={page.caption} size={150} />
        ) : page.shapePath ? (
          <svg viewBox="0 0 100 100" className="w-[min(46vw,13rem)] drop-shadow-lg" aria-hidden>
            <path d={page.shapePath} fill={page.swatch} stroke="rgba(0,0,0,0.15)" strokeWidth={2} />
          </svg>
        ) : page.swatch ? (
          <span className="block aspect-square w-[min(44vw,12rem)] rounded-full shadow-xl" style={{ background: page.swatch }} aria-hidden />
        ) : (
          <span className={`flex flex-wrap items-center justify-center leading-none ${count <= 1 ? "text-[7rem]" : count <= 4 ? "text-6xl" : count <= 6 ? "text-5xl" : "text-4xl"}`} aria-hidden>
            {Array.from({ length: count }, (_, i) => (
              <span key={i}>{page.emoji}</span>
            ))}
          </span>
        )}
      </div>
      <p className="text-center font-extrabold leading-tight" style={{ color: page.fg, fontSize: "clamp(1.5rem, 7vw, 2.4rem)" }}>{page.caption}</p>
      <p className="mt-1 text-sm font-bold opacity-50">{n} / {total}</p>
    </div>
  );
}

function CoverFace({ book, hint }: { book: BookDef; hint: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between p-5 text-white" style={{ background: `linear-gradient(135deg, ${book.color}, ${book.dark})` }}>
      <span className="absolute inset-y-0 left-0 w-4 bg-black/25" aria-hidden />
      <span className="absolute inset-y-0 left-4 w-1 bg-white/25" aria-hidden />
      <span className="absolute inset-x-8 top-5 h-1 rounded bg-yellow-300/80" aria-hidden />
      <div className="mt-8 flex flex-1 flex-col items-center justify-center gap-3 pl-3">
        <span className="rounded-full bg-white/90 px-8 py-4 text-[5.5rem] leading-none shadow-lg" aria-hidden>{book.emoji}</span>
        <h2 className="text-center font-extrabold leading-tight drop-shadow" style={{ fontSize: "clamp(1.8rem, 8.5vw, 2.8rem)" }}>{book.title}</h2>
      </div>
      <span className="absolute inset-x-8 bottom-16 h-1 rounded bg-yellow-300/80" aria-hidden />
      {hint && (
        <motion.p className="pb-1 text-xl font-extrabold" animate={{ x: [0, -14, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}>
          👈 Swipe to open
        </motion.p>
      )}
    </div>
  );
}

const PaperBack = ({ children }: { children?: ReactNode }) => (
  <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-lg font-bold text-ink/40" style={{ background: "linear-gradient(260deg, rgba(0,0,0,0.12) 0, rgba(0,0,0,0) 8%), #fbf4e3" }}>
    {children}
  </div>
);

/** One sheet of the book: front and back faces that turn about the spine, with shading that follows the angle. */
function Leaf({ rot, prevRot, front, back, zIndex }: { rot: MotionValue<number>; prevRot: MotionValue<number>; front: ReactNode; back: ReactNode; zIndex: number }) {
  const frontShade = useTransform(rot, [-90, 0], [0.4, 0]);
  const backShade = useTransform(rot, [-180, -90], [0, 0.4]);
  // The sheet above casts a soft shadow on this one while it turns.
  const cast = useTransform(prevRot, [-180, -90, 0], [0, 0.35, 0]);
  return (
    <motion.div className="absolute inset-0" style={{ rotateY: rot, transformOrigin: "left center", transformStyle: "preserve-3d", zIndex }}>
      <div className="absolute inset-0 overflow-hidden rounded-l-sm rounded-r-2xl" style={{ backfaceVisibility: "hidden" }}>
        {front}
        <motion.div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: frontShade }} />
        <motion.div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black via-black/30 to-transparent" style={{ opacity: cast }} />
      </div>
      <div className="absolute inset-0 overflow-hidden rounded-r-sm rounded-l-2xl" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
        {back}
        <motion.div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: backShade }} />
      </div>
    </motion.div>
  );
}

/** A book in front of you: swipe the pages left and right (or use the arrows) to turn them. */
export function BookViewer({ book, from, onClose }: { book: BookDef; from: BookFrom; onClose: () => void }) {
  const reduced = useAppReducedMotion();
  const total = book.pages.length;
  const leaves = total + 1; // the cover, then the pages
  const rots = useMemo(() => Array.from({ length: leaves }, () => motionValue(0)), [leaves]);
  const [idx, setIdx] = useState(0); // how many sheets are turned
  const [turning, setTurning] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const idxRef = useRef(0);
  const bookRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x0: number; t0: number; leaf: number; dir: 1 | -1 | 0 } | null>(null);
  const finished = useRef(false);
  const [shift, setShift] = useState(0);

  // Once open, slide the book so the two-page spread sits in the middle (only if the screen is wider than the book).
  useEffect(() => {
    const measure = () => {
      const w = bookRef.current?.offsetWidth ?? 0;
      setShift(Math.max(0, Math.min(w / 2, (window.innerWidth - w) / 2)));
    };
    const t = setTimeout(measure, 0);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, []);

  const settle = useCallback(
    (leaf: number, turned: boolean) => {
      setTurning(leaf);
      animate(rots[leaf], turned ? -180 : 0, reduced ? { duration: 0.01 } : SPRING).then(() => setTurning((t) => (t === leaf ? null : t)));
    },
    [rots, reduced],
  );

  const go = useCallback(
    (dir: 1 | -1) => {
      const i = idxRef.current;
      if (dir === 1 && i < leaves - 1) {
        audioManager.playPaper(true);
        settle(i, true);
        idxRef.current = i + 1;
        setIdx(i + 1);
      } else if (dir === -1 && i > 0) {
        audioManager.playPaper(false);
        settle(i - 1, false);
        idxRef.current = i - 1;
        setIdx(i - 1);
      }
    },
    [leaves, settle],
  );

  // Read each page aloud as it opens.
  useEffect(() => {
    const t = setTimeout(() => audioManager.speak(idx === 0 ? book.title : book.pages[idx - 1].say), 380);
    return () => clearTimeout(t);
  }, [idx, book]);

  useEffect(() => {
    if (idx === leaves - 1 && !finished.current) {
      finished.current = true;
      void finishActivity("books", { score: total, variant: book.id });
      const t = setTimeout(() => setDone(true), 0);
      return () => clearTimeout(t);
    }
  }, [idx, leaves, total, book.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  const progress = (dx: number, dir: 1 | -1) => {
    const w = bookRef.current?.offsetWidth ?? 300;
    return clamp01((dir === 1 ? -dx : dx) / (w * 0.85));
  };

  const down = (e: React.PointerEvent) => {
    bookRef.current?.setPointerCapture(e.pointerId);
    drag.current = { x0: e.clientX, t0: performance.now(), leaf: -1, dir: 0 };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x0;
    if (d.dir === 0 && Math.abs(dx) > 8) {
      d.dir = dx < 0 ? 1 : -1;
      const i = idxRef.current;
      d.leaf = d.dir === 1 ? (i < leaves - 1 ? i : -2) : i > 0 ? i - 1 : -2;
      if (d.leaf >= 0) setTurning(d.leaf);
    }
    if (d.leaf >= 0 && d.dir !== 0) {
      const p = progress(dx, d.dir);
      rots[d.leaf].set(d.dir === 1 ? -180 * p : -180 + 180 * p);
    }
  };
  const up = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const dx = e.clientX - d.x0;
    if (d.dir === 0) {
      // A tap: open the cover, or hear the page again.
      if (idxRef.current === 0) go(1);
      else audioManager.speak(book.pages[idxRef.current - 1].say);
      return;
    }
    if (d.leaf < 0) return;
    const v = dx / Math.max(1, performance.now() - d.t0);
    const p = progress(dx, d.dir);
    const flick = d.dir === 1 ? v < -0.45 : v > 0.45;
    if (p > 0.3 || flick) {
      audioManager.playPaper(d.dir === 1);
      settle(d.leaf, d.dir === 1);
      idxRef.current += d.dir === 1 ? 1 : -1;
      setIdx(idxRef.current);
    } else {
      settle(d.leaf, d.dir === -1);
    }
  };

  const canPrev = idx > 0;
  const canNext = idx < leaves - 1;
  return (
    <motion.div className="fixed inset-0 z-[80] flex flex-col overflow-hidden" style={{ background: "radial-gradient(circle at 50% 35%, #7a4a22 0%, #3b2210 70%, #1f1208 100%)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { delay: 0.25 } }} role="dialog" aria-label={book.title}>
      <div className="flex items-center justify-between gap-2 p-3">
        <button type="button" onClick={onClose} aria-label="Back to the shelf" className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-3xl text-ink shadow-lg active:scale-90">
          📚
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-xl font-extrabold text-white drop-shadow sm:text-3xl">{book.title}</p>
        <span className="h-14 w-14" aria-hidden />
      </div>

      <div className="flex flex-1 items-center justify-center" style={{ perspective: 1400 }}>
        <motion.div
          initial={reduced ? false : { x: from.x, y: from.y, scale: from.scale, rotateY: -75 }}
          animate={{ x: 0, y: 0, scale: 1, rotateY: 0 }}
          exit={reduced ? undefined : { x: from.x, y: from.y, scale: from.scale, rotateY: -75, transition: { duration: 0.45, ease: "easeIn" } }}
          transition={{ type: "spring", stiffness: 90, damping: 15 }}
        >
          <motion.div animate={{ x: idx > 0 ? shift : 0 }} transition={{ type: "spring", stiffness: 70, damping: 16 }}>
          <div
            ref={bookRef}
            className="relative select-none"
            style={{ height: "min(64dvh, 32rem)", aspectRatio: "3 / 4", perspective: 1800, touchAction: "none", boxShadow: "0 24px 40px -8px rgba(0,0,0,0.65), 4px 0 0 #efe6cf, 8px 0 0 #dcd0b3, 11px 0 0 #c9bc9a" }}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            aria-roledescription="book"
          >
            {rots.map((rot, k) => (
              <Leaf
                key={k}
                rot={rot}
                prevRot={k > 0 ? rots[k - 1] : ZERO}
                zIndex={turning === k ? 1000 : k < idx ? k : leaves - k}
                front={k === 0 ? <CoverFace book={book} hint={idx === 0} /> : <PageFace page={book.pages[k - 1]} n={k} total={total} />}
                back={k === 0 ? <PaperBack>This book belongs to a reader like you 📖</PaperBack> : <PaperBack />}
              />
            ))}
          </div>
          </motion.div>
        </motion.div>
      </div>

      <div className="flex items-center justify-center gap-4 p-3 pb-5">
        <button type="button" onClick={() => go(-1)} disabled={!canPrev} aria-label="Previous page" className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-4xl text-ink shadow-lg active:scale-90 disabled:opacity-30">
          ◀️
        </button>
        <p className="min-w-24 rounded-full bg-black/35 px-4 py-2 text-center text-lg font-extrabold text-white" aria-live="polite">{idx === 0 ? "Cover" : `Page ${idx} / ${total}`}</p>
        <button type="button" onClick={() => go(1)} disabled={!canNext} aria-label="Next page" className={`flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-4xl text-ink shadow-lg active:scale-90 disabled:opacity-30 ${idx === 0 && !reduced ? "animate-pulse" : ""}`}>
          ▶️
        </button>
      </div>

      {done && !reduced && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {["🎉", "⭐", "✨", "🎊", "💖", "🌈"].flatMap((e, i) => [0, 1].map((j) => (
            <motion.span key={`${i}-${j}`} className="absolute -top-10 text-4xl" style={{ left: `${(i * 2 + j) * 8 + 4}%` }} initial={{ y: -40, rotate: 0 }} animate={{ y: "110vh", rotate: 200 + i * 40 }} transition={{ duration: 2.6 + (i % 3) * 0.5, delay: j * 0.5 + i * 0.12, ease: "easeIn" }}>
              {e}
            </motion.span>
          )))}
        </div>
      )}
    </motion.div>
  );
}
