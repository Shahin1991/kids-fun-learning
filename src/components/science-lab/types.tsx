"use client";

import { motion, type Transition } from "framer-motion";
import type { ReactNode } from "react";
import { useAppReducedMotion } from "@/components/ReducedMotionProvider";

/** Every lab scene is drawn in the same 400 x 300 box and told which step to show. */
export interface SceneProps {
  step: number;
  /** Jump to another step, for scenes where the child taps a part. */
  go: (step: number) => void;
}

export const VIEW = "0 0 400 300";

/** Endless-loop transition that freezes when the child (or the OS) wants less motion. */
export function useLoop() {
  const reduced = useAppReducedMotion();
  return (t: Transition = {}): Transition => (reduced ? { duration: 0 } : { repeat: Infinity, ease: "easeInOut", ...t });
}

export const SPRING: Transition = { type: "spring", stiffness: 140, damping: 14 };

/** Snappier spring that overshoots, for things popping into view. */
export const BOUNCE: Transition = { type: "spring", stiffness: 420, damping: 13 };

/**
 * Pops its children in from nothing around (x, y) with a little overshoot, and shrinks them away on exit
 * (inside an `AnimatePresence`). Still under reduced motion.
 */
export function Pop({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  const reduced = useAppReducedMotion();
  return (
    <motion.g
      initial={reduced ? false : { scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { scale: 0, opacity: 0, transition: { duration: 0.18 } }}
      transition={reduced ? { duration: 0 } : BOUNCE}
      style={pin(x, y)}
    >
      {children}
    </motion.g>
  );
}

/** Scale/rotate around a point of the 400 x 300 drawing (framer's own origin is relative to the element's box). */
export function pin(x: number, y: number) {
  return { transformBox: "view-box" as const, originX: `${x}px`, originY: `${y}px` };
}
