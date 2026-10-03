"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { slideIn } from "@/lib/animations/variants";
import { useAppReducedMotion } from "./ReducedMotionProvider";

export function SlideIn({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useAppReducedMotion();
  return (
    <motion.div className={className} variants={slideIn} initial={reduced ? "visible" : "hidden"} animate="visible">
      {children}
    </motion.div>
  );
}
