"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AGE_GROUP_LABELS, AGE_GROUP_ORDER, MODULES, type AgeGroup, type LearningModule } from "@/data/modules";
import { audioManager } from "@/lib/audio/AudioManager";
import { getAllProgress } from "@/lib/progress/progress";
import { getAllStars } from "@/lib/rewards/RewardManager";
import { TapBounce } from "./TapBounce";

export const GROUP_ICONS: Record<AgeGroup, string> = { toddler: "🧸", "early-learning": "🎨", advanced: "🚀", others: "🎮" };

/** Friendly top of the home screen: greeting you can hear, star total, quick jumps, and "keep playing". */
export function WelcomeBanner({ hidden }: { hidden: string[] }) {
  const [stars, setStars] = useState(0);
  const [recent, setRecent] = useState<LearningModule[]>([]);

  useEffect(() => {
    getAllStars().then((s) => setStars(Object.values(s).reduce((a, b) => a + b, 0))).catch(() => {});
    getAllProgress()
      .then((all) => {
        const last = Object.entries(all)
          .map(([id, recs]) => [id, Math.max(...recs.map((r) => r.completedAt))] as const)
          .sort((a, b) => b[1] - a[1])
          .map(([id]) => MODULES.find((m) => m.id === id))
          .filter((m): m is LearningModule => Boolean(m) && !hidden.includes(m!.id))
          .slice(0, 4);
        setRecent(last);
      })
      .catch(() => {});
  }, [hidden]);

  const greet = () => audioManager.speak("Hi! Tap a picture to play. Have fun!");

  return (
    <section className="flex flex-col gap-4" aria-label="Welcome">
      <div className="flex items-center gap-4 rounded-3xl bg-surface p-4 shadow-md">
        <button type="button" onClick={greet} aria-label="Hear the welcome" className="animate-float text-7xl active:scale-90">🦉</button>
        <div className="flex-1">
          <p className="text-3xl font-extrabold">Hi! What shall we play? 👋</p>
          <p className="text-xl opacity-70">Tap a picture to start</p>
        </div>
        <div className="flex flex-col items-center rounded-2xl bg-kid-yellow/40 px-4 py-2 text-ink" aria-label={`${stars} stars collected`}>
          <span className="text-4xl">⭐</span>
          <span className="text-2xl font-extrabold">{stars}</span>
        </div>
      </div>
      <nav aria-label="Jump to a group" className="grid grid-cols-4 gap-2">
        {AGE_GROUP_ORDER.map((g) => (
          <a key={g} href={`#group-${g}`} aria-label={AGE_GROUP_LABELS[g]} className="flex min-h-touch flex-col items-center justify-center rounded-2xl bg-surface text-4xl shadow active:scale-95">
            <span aria-hidden>{GROUP_ICONS[g]}</span>
            <span className="text-sm font-bold">{AGE_GROUP_LABELS[g]}</span>
          </a>
        ))}
      </nav>
      {recent.length > 0 && (
        <div>
          <h2 className="mb-2 text-2xl font-extrabold">▶️ Keep playing</h2>
          <div className="grid grid-cols-4 gap-3">
            {recent.map((m) => (
              <TapBounce key={m.id}>
                <Link href={m.route} className="flex min-h-touch flex-col items-center gap-1 rounded-2xl bg-surface p-2 text-center shadow" style={{ borderBottom: `6px solid var(--color-${m.colorToken})` }}>
                  <span className="text-5xl" aria-hidden>{m.icon}</span>
                  <span className="text-sm font-bold leading-tight">{m.title}</span>
                </Link>
              </TapBounce>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
