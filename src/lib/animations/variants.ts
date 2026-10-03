import type { Variants } from "framer-motion";

export const tapBounce: Variants = {
  rest: { scale: 1 },
  tap: { scale: 0.88, transition: { type: "spring", stiffness: 500, damping: 12 } },
};

export const gentleWobble: Variants = {
  idle: { x: 0, rotate: 0 },
  wobble: { x: [0, -8, 8, -5, 5, 0], rotate: [0, -4, 4, -2, 2, 0], transition: { duration: 0.5 } },
};

export const successPop: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: { scale: [0, 1.3, 1], opacity: 1, transition: { duration: 0.45 } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.35 } },
};

export const slideIn: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 20 } },
};
