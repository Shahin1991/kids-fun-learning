"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

function pointOf(e: MouseEvent | TouchEvent | PointerEvent): { x: number; y: number } {
  if ("changedTouches" in e && e.changedTouches.length) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  const m = e as MouseEvent;
  return { x: m.clientX, y: m.clientY };
}

/**
 * Draggable piece that always glides back to where it started on release.
 * A correct drop is handled by the parent removing the piece from its tray.
 * Drop targets are any elements with a `data-slot` attribute.
 */
export function DragPiece({ children, onDrop, label }: { children: ReactNode; onDrop: (slot: string | null) => void; label: string }) {
  return (
    <motion.div
      role="img"
      aria-label={label}
      drag
      dragSnapToOrigin
      dragMomentum={false}
      whileDrag={{ scale: 1.15, zIndex: 40 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      onDragEnd={(e) => {
        const { x, y } = pointOf(e);
        const slot = document.elementsFromPoint(x, y).find((el) => el instanceof HTMLElement && el.dataset.slot);
        onDrop(slot instanceof HTMLElement ? (slot.dataset.slot ?? null) : null);
      }}
      className="cursor-grab touch-none select-none"
    >
      {children}
    </motion.div>
  );
}
