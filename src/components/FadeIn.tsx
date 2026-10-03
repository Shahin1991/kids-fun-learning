"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { fadeIn } from "@/lib/animations/variants";
import { useAppReducedMotion } from "./ReducedMotionProvider";

export function FadeIn({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useAppReducedMotion();
  return (
    <motion.div className={className} variants={fadeIn} initial={reduced ? "visible" : "hidden"} animate="visible">
      {children}
    </motion.div>
  );
}
