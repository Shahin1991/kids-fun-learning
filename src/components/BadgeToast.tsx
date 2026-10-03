"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getAchievement, type Achievement } from "@/data/achievements";
import { subscribeRewards } from "@/lib/rewards/reward-events";

export function BadgeToast() {
  const [badge, setBadge] = useState<Achievement | null>(null);

  useEffect(() => {
    let hide: ReturnType<typeof setTimeout> | undefined;
    const off = subscribeRewards((e) => {
      if (e.type !== "achievement") return;
      setBadge(getAchievement(e.achievementId) ?? null);
      clearTimeout(hide);
      hide = setTimeout(() => setBadge(null), 3500);
    });
    return () => {
      off();
      clearTimeout(hide);
    };
  }, []);

  return (
    <AnimatePresence>
      {badge && (
        <motion.div
          role="status"
          className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-3xl bg-surface p-4 shadow-xl"
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
        >
          <span className="text-5xl" aria-hidden>{badge.icon}</span>
          <div>
            <p className="text-xl font-extrabold">{badge.title}</p>
            <p className="text-sm">{badge.description}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
