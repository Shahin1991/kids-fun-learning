import { getDb } from "@/lib/storage/db";
import { emitReward } from "./reward-events";

let persistAsked = false;
/** Ask once for persistent storage, so the browser (notably Safari) does not evict progress and the PIN. */
function askPersist() {
  if (persistAsked || typeof navigator === "undefined") return;
  persistAsked = true;
  navigator.storage?.persist?.().catch(() => {});
}

export async function awardStar(moduleId: string): Promise<number> {
  const db = getDb();
  // One transaction so two quick wins never read the same count and drop a star.
  const { count, total, modules } = await db.transaction("rw", db.stars, async () => {
    const row = await db.stars.get(moduleId);
    const next = (row?.count ?? 0) + 1;
    await db.stars.put({ moduleId, count: next });
    const all = await db.stars.toArray();
    return { count: next, total: all.reduce((sum, s) => sum + s.count, 0), modules: all.length };
  });
  emitReward({ type: "star", moduleId, total: count });
  askPersist();
  if (total === 1 && modules === 1) await unlockAchievement("first-star");
  if (total >= 10) await unlockAchievement("star-collector");
  return count;
}

export async function unlockAchievement(id: string): Promise<boolean> {
  const db = getDb();
  const added = await db.transaction("rw", db.achievements, async () => {
    if (await db.achievements.get(id)) return false;
    await db.achievements.put({ id, unlockedAt: Date.now() });
    return true;
  });
  if (!added) return false;
  emitReward({ type: "achievement", achievementId: id });
  return true;
}

export async function getStarCount(moduleId: string): Promise<number> {
  return (await getDb().stars.get(moduleId))?.count ?? 0;
}

export async function getAllStars(): Promise<Record<string, number>> {
  const rows = await getDb().stars.toArray();
  return Object.fromEntries(rows.map((r) => [r.moduleId, r.count]));
}
