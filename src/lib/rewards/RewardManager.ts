import { getDb } from "@/lib/storage/db";
import { emitReward } from "./reward-events";

export async function awardStar(moduleId: string): Promise<number> {
  const db = getDb();
  const row = await db.stars.get(moduleId);
  const count = (row?.count ?? 0) + 1;
  await db.stars.put({ moduleId, count });
  emitReward({ type: "star", moduleId, total: count });
  if (count === 1 && (await db.stars.count()) === 1) await unlockAchievement("first-star");
  const all = await db.stars.toArray();
  if (all.reduce((sum, s) => sum + s.count, 0) >= 10) await unlockAchievement("star-collector");
  return count;
}

export async function unlockAchievement(id: string): Promise<boolean> {
  const db = getDb();
  if (await db.achievements.get(id)) return false;
  await db.achievements.put({ id, unlockedAt: Date.now() });
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
