"use client";

import { useEffect, useState } from "react";
import { getStarCount } from "@/lib/rewards/RewardManager";
import { subscribeRewards } from "@/lib/rewards/reward-events";

export function ProgressStars({ moduleId, hideZero = false }: { moduleId: string; hideZero?: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    getStarCount(moduleId).then((c) => alive && setCount(c)).catch(() => {});
    const off = subscribeRewards((e) => {
      if (e.type === "star" && e.moduleId === moduleId) setCount(e.total);
    });
    return () => {
      alive = false;
      off();
    };
  }, [moduleId]);

  if (hideZero && count === 0) return null;
  return (
    <span aria-label={`${count} stars`} className="flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-xl font-bold shadow">
      ⭐ {count}
    </span>
  );
}
