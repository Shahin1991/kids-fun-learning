"use client";

import Link from "next/link";
import type { LearningModule } from "@/data/modules";
import { ProgressStars } from "./ProgressStars";
import { TapBounce } from "./TapBounce";

export function ModuleCard({ module: m }: { module: LearningModule }) {
  return (
    <TapBounce>
      <Link
        href={m.route}
        className="flex min-h-touch flex-col items-center gap-1 rounded-3xl bg-surface p-4 text-center shadow-md"
        style={{ borderBottom: `8px solid var(--color-${m.colorToken})` }}
      >
        <span className="text-6xl" aria-hidden>{m.icon}</span>
        <span className="text-2xl font-bold">{m.title}</span>
        {m.placeholder ? <span className="text-sm opacity-60">Coming soon</span> : <ProgressStars moduleId={m.id} hideZero />}
      </Link>
    </TapBounce>
  );
}
