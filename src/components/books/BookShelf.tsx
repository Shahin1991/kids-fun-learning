"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { BOOKS, type BookDef } from "@/data/books";
import { audioManager } from "@/lib/audio/AudioManager";
import { BookViewer, type BookFrom } from "./BookViewer";

const HEIGHTS = [190, 170, 200, 180, 188];
const PER_SHELF = 3;

function Spine({ book, i, hidden, onPick }: { book: BookDef; i: number; hidden: boolean; onPick: (b: BookDef, el: HTMLElement) => void }) {
  const h = HEIGHTS[i % HEIGHTS.length];
  return (
    <motion.button
      type="button"
      aria-label={`Open ${book.title}`}
      onClick={(e) => onPick(book, e.currentTarget)}
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: hidden ? 0 : 1 }}
      transition={{ delay: 0.15 + i * 0.1, type: "spring", stiffness: 160, damping: 14 }}
      whileHover={{ y: -12 }}
      whileTap={{ y: -22, scale: 1.03 }}
      className="relative flex w-[4.6rem] shrink-0 flex-col items-center justify-start gap-2 rounded-t-md rounded-b-sm px-1 pb-3 pt-3 text-white shadow-lg"
      style={{ height: h, background: `linear-gradient(90deg, ${book.dark} 0%, ${book.color} 30%, ${book.color} 70%, ${book.dark} 100%)`, transformOrigin: "bottom" }}
    >
      <span className="absolute inset-x-0 top-1.5 h-1 bg-yellow-300/80" aria-hidden />
      <span className="absolute inset-x-0 bottom-1.5 h-1 bg-yellow-300/80" aria-hidden />
      <span className="mt-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-3xl" aria-hidden>{book.emoji}</span>
      <span className="flex-1 text-lg font-extrabold leading-none drop-shadow" style={{ writingMode: "vertical-rl" }}>{book.title}</span>
    </motion.button>
  );
}

/** A wooden bookcase. Tap a book and it slides off the shelf, turns to face you and opens in front of you. */
export function BookShelf() {
  const [open, setOpen] = useState<{ book: BookDef; from: BookFrom } | null>(null);
  const [away, setAway] = useState<string | null>(null);

  const pick = (book: BookDef, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const bookH = Math.min(window.innerHeight * 0.64, 512);
    audioManager.playNote(4);
    setAway(book.id);
    setOpen({
      book,
      from: { x: r.left + r.width / 2 - window.innerWidth / 2, y: r.top + r.height / 2 - window.innerHeight / 2, scale: r.height / bookH },
    });
  };

  const rows: BookDef[][] = [];
  for (let i = 0; i < BOOKS.length; i += PER_SHELF) rows.push(BOOKS.slice(i, i + PER_SHELF));

  return (
    <div className="flex flex-1 flex-col items-center gap-3">
      <button type="button" onClick={() => audioManager.speak("Pick a book to read!")} className="flex items-center gap-2 rounded-3xl bg-surface px-4 py-2 text-2xl font-extrabold shadow-md active:scale-95" aria-label="Hear the instructions">
        <span className="animate-float text-4xl" aria-hidden>🦉</span>
        Pick a book! <span aria-hidden>🔊</span>
      </button>
      <div className="w-full max-w-md rounded-[2rem] border-[10px] border-amber-900 bg-gradient-to-b from-amber-300 to-amber-400 px-2 pb-2 pt-1 shadow-2xl">
        {rows.map((row, r) => (
          <div key={r} className="pt-4">
            <div className="flex items-end justify-center gap-2 px-1">
              {row.map((b, i) => (
                <Spine key={b.id} book={b} i={r * PER_SHELF + i} hidden={away === b.id} onPick={pick} />
              ))}
              {row.length < PER_SHELF && (
                <span className="flex flex-1 items-end justify-center gap-3 pb-1 text-5xl" aria-hidden>
                  <span className="animate-float">🪴</span>
                  <span>🧸</span>
                </span>
              )}
            </div>
            <div className="h-4 rounded-sm bg-gradient-to-b from-amber-800 to-amber-950 shadow-md" aria-hidden />
          </div>
        ))}
      </div>
      <AnimatePresence onExitComplete={() => setAway(null)}>
        {open && <BookViewer key={open.book.id} book={open.book} from={open.from} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </div>
  );
}
