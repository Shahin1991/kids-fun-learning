"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { tapBounce } from "@/lib/animations/variants";
import { useAppReducedMotion } from "./ReducedMotionProvider";

export function TapBounce({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useAppReducedMotion();
  return (
    <motion.div className={className} variants={tapBounce} initial="rest" whileTap={reduced ? undefined : "tap"}>
      {children}
    </motion.div>
  );
}
