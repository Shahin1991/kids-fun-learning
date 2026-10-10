"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AGE_GROUP_LABELS, type AgeGroup, type LearningModule } from "@/data/modules";
import { ModuleCard } from "./ModuleCard";
import { GROUP_ICONS } from "./WelcomeBanner";

/** One age band. Collapsed it is a single big button; open it shows the games. */
export function AgeGroupSection({ ageGroup, modules, open, onToggle }: { ageGroup: AgeGroup; modules: LearningModule[]; open: boolean; onToggle: () => void }) {
  if (modules.length === 0) return null;
  const token = ageGroup === "early-learning" ? "early" : ageGroup;
  return (
    <section aria-labelledby={`group-${ageGroup}`} className="scroll-mt-4 rounded-3xl p-3 sm:p-4" style={{ background: `color-mix(in srgb, var(--color-${token}) var(--tint), var(--surface))` }}>
      <h2 id={`group-${ageGroup}`} className="text-2xl font-extrabold sm:text-3xl" style={{ color: `var(--color-${token}-dark)` }}>
        <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-h-14 w-full items-center gap-2 text-left active:scale-[0.99]">
          <span aria-hidden>{GROUP_ICONS[ageGroup]}</span>
          <span className="flex-1">{AGE_GROUP_LABELS[ageGroup]}</span>
          {!open && <span className="rounded-full bg-surface px-3 py-1 text-base font-bold text-foreground shadow">{modules.length} games</span>}
          <motion.span aria-hidden animate={{ rotate: open ? 180 : 0 }} className="text-2xl">▾</motion.span>
        </button>
      </h2>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <div className="grid grid-cols-2 gap-3 pt-3 sm:grid-cols-3 sm:gap-4">
              {modules.map((m) => (
                <ModuleCard key={m.id} module={m} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
