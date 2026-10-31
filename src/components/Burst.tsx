"use client";

import { motion } from "framer-motion";
import { useAppReducedMotion } from "./ReducedMotionProvider";

/**
 * A ring of emoji that flies out from a point and falls away, for a success.
 * Place it in a `relative` parent; `className` (or `style`) sets where it starts (default: the centre).
 * It plays again each time `trigger` changes, and draws nothing while `trigger` is 0.
 */
export function Burst({
  trigger,
  items = ["⭐", "✨", "🌟"],
  count = 10,
  spread = 120,
  className = "left-1/2 top-1/2",
  size = "text-3xl",
  style,
}: {
  trigger: number;
  items?: string[];
  count?: number;
  spread?: number;
  className?: string;
  size?: string;
  /** For a start point worked out at runtime */
  style?: React.CSSProperties;
}) {
  const reduced = useAppReducedMotion();
  if (!trigger || reduced) return null;
  return (
    <span className={`pointer-events-none absolute z-20 ${className}`} style={style} aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + trigger;
        const d = spread * (0.75 + ((i * 7) % 5) / 10);
        return (
          <motion.span
            key={`${trigger}-${i}`}
            className={`absolute -translate-x-1/2 -translate-y-1/2 ${size}`}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
            // Out fast, then drift down a little as it fades: reads as a little bit of gravity
            animate={{ x: [0, Math.cos(a) * d, Math.cos(a) * d * 1.1],y: [0, Math.sin(a) * d * 0.7 - 16, Math.sin(a) * d * 0.7 + 36], scale: [0, 1.25, 0.7], opacity: [1, 1, 0], rotate: [0, i % 2 ? 90 : -90, i % 2 ? 140 : -140] }}
            transition={{ duration: 1.1, times: [0, 0.45, 1], ease: "easeOut" }}
          >
            {items[i % items.length]}
          </motion.span>
        );
      })}
    </span>
  );
}
