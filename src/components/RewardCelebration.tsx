"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { subscribeRewards } from "@/lib/rewards/reward-events";
import { StarBurst } from "./StarBurst";

export function RewardCelebration() {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let hide: ReturnType<typeof setTimeout> | undefined;
    const off = subscribeRewards((e) => {
      if (e.type !== "star") return;
      audioManager.play("reward");
      setShown((n) => n + 1);
      clearTimeout(hide);
      hide = setTimeout(() => setShown(0), 1600);
    });
    return () => {
      off();
      clearTimeout(hide);
    };
  }, []);

  return (
    <AnimatePresence>
      {shown > 0 && (
        <motion.div key="celebrate" className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <StarBurst />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
