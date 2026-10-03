"use client";

import { motion } from "framer-motion";
import { useAppReducedMotion } from "./ReducedMotionProvider";

const RAYS = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2);

export function StarBurst() {
  const reduced = useAppReducedMotion();
  return (
    <div className="pointer-events-none relative flex h-40 w-40 items-center justify-center" aria-hidden>
      <motion.span className="text-8xl" initial={{ scale: reduced ? 1 : 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 12 }}>
        ⭐
      </motion.span>
      {!reduced &&
        RAYS.map((a, i) => (
          <motion.span
            key={i}
            className="absolute text-3xl"
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{ x: Math.cos(a) * 90, y: Math.sin(a) * 90, opacity: 0 }}
            transition={{ duration: 0.9 }}
          >
            ✨
          </motion.span>
        ))}
    </div>
  );
}
