import { AGE_GROUP_LABELS, type AgeGroup, type LearningModule } from "@/data/modules";
import { ModuleCard } from "./ModuleCard";

export function AgeGroupSection({ ageGroup, modules }: { ageGroup: AgeGroup; modules: LearningModule[] }) {
  if (modules.length === 0) return null;
  const token = ageGroup === "early-learning" ? "early" : ageGroup;
  return (
    <section aria-labelledby={`group-${ageGroup}`} className="rounded-3xl p-4" style={{ background: `color-mix(in srgb, var(--color-${token}) var(--tint), var(--surface))` }}>
      <h2 id={`group-${ageGroup}`} className="mb-3 text-3xl font-extrabold" style={{ color: `var(--color-${token}-dark)` }}>
        {AGE_GROUP_LABELS[ageGroup]}
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {modules.map((m) => (
          <ModuleCard key={m.id} module={m} />
        ))}
      </div>
    </section>
  );
}
