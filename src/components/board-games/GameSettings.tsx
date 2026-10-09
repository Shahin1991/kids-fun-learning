"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** ⚙️ button that opens a small sheet of options, so the play screen stays uncluttered on a phone. */
export function GameSettings({ children, title = "Settings" }: { children: (close: () => void) => ReactNode; title?: string }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <button type="button" aria-label={title} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-3xl text-foreground shadow-md active:scale-90">
        ⚙️
      </button>
      {createPortal(
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-auto fixed inset-0 z-[60] flex items-end justify-center bg-black/35 p-3 sm:items-center" onClick={close} role="dialog" aria-label={title}>
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 22 }} onClick={(e) => e.stopPropagation()} className="flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-surface p-5 text-foreground shadow-2xl">
              <div className="flex items-center justify-between">
                <p className="text-2xl font-extrabold">{title}</p>
                <button type="button" onClick={close} aria-label="Close" className="flex h-12 w-12 items-center justify-center rounded-full bg-kid-yellow text-2xl text-ink active:scale-90">✖️</button>
              </div>
              {children(close)}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
      )}
    </>
  );
}

/** A labelled row of big choice chips inside the settings sheet. */
export function ChipRow<T extends string | number>({ label, value, options, onPick }: { label: string; value: T; options: { id: T; text: string; aria?: string }[]; onPick: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-lg font-bold opacity-80">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={String(o.id)} type="button" aria-pressed={value === o.id} aria-label={o.aria} onClick={() => onPick(o.id)} className={`min-h-14 flex-1 rounded-2xl px-3 text-xl font-bold shadow-md active:scale-95 ${value === o.id ? "bg-kid-blue text-white ring-4 ring-kid-blue/40" : "bg-background text-foreground"}`}>
            {o.text}
          </button>
        ))}
      </div>
    </div>
  );
}
