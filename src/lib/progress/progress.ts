import { getDb, type ProgressRecord } from "@/lib/storage/db";

export interface ActivityResult {
  score?: number;
  moves?: number;
  variant?: string;
}

export async function recordActivityCompletion(moduleId: string, result: ActivityResult = {}): Promise<void> {
  await getDb().progress.add({ moduleId, ...result, completedAt: Date.now() });
}

export async function getModuleProgress(moduleId: string): Promise<ProgressRecord[]> {
  return getDb().progress.where("moduleId").equals(moduleId).toArray();
}

export async function getAllProgress(): Promise<Record<string, ProgressRecord[]>> {
  const all = await getDb().progress.toArray();
  const byModule: Record<string, ProgressRecord[]> = {};
  for (const r of all) (byModule[r.moduleId] ??= []).push(r);
  return byModule;
}

/** Higher is better. */
export function bestScoreOf(records: ProgressRecord[]): number | null {
  const scores = records.flatMap((r) => (r.score === undefined ? [] : [r.score]));
  return scores.length ? Math.max(...scores) : null;
}

/** Lower is better. */
export function bestMovesOf(records: ProgressRecord[]): number | null {
  const moves = records.flatMap((r) => (r.moves === undefined ? [] : [r.moves]));
  return moves.length ? Math.min(...moves) : null;
}

export async function getBestScore(moduleId: string): Promise<number | null> {
  return bestScoreOf(await getModuleProgress(moduleId));
}

export async function getBestMoves(moduleId: string, variant?: string): Promise<number | null> {
  const records = await getModuleProgress(moduleId);
  return bestMovesOf(variant ? records.filter((r) => r.variant === variant) : records);
}
