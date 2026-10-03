"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { successPop } from "@/lib/animations/variants";
import { useAppReducedMotion } from "./ReducedMotionProvider";

export function SuccessPop({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useAppReducedMotion();
  return (
    <motion.div className={className} variants={successPop} initial={reduced ? "visible" : "hidden"} animate="visible">
      {children}
    </motion.div>
  );
}
