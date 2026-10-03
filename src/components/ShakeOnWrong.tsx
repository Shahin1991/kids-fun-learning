"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { gentleWobble } from "@/lib/animations/variants";
import { useAppReducedMotion } from "./ReducedMotionProvider";

/** Wobbles gently each time `trigger` changes to a new non-zero value. */
export function ShakeOnWrong({ children, trigger, className }: { children: ReactNode; trigger: number; className?: string }) {
  const reduced = useAppReducedMotion();
  return (
    <motion.div key={trigger} className={className} variants={gentleWobble} initial="idle" animate={trigger > 0 && !reduced ? "wobble" : "idle"}>
      {children}
    </motion.div>
  );
}
