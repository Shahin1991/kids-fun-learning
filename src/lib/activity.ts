import { recordActivityCompletion, type ActivityResult } from "@/lib/progress/progress";
import { awardStar } from "@/lib/rewards/RewardManager";

/** Save progress and award a star; storage failures must never break play. */
export async function finishActivity(moduleId: string, result: ActivityResult = {}): Promise<void> {
  try {
    await recordActivityCompletion(moduleId, result);
    await awardStar(moduleId);
  } catch {
    // IndexedDB can be unavailable (private mode); the game just carries on.
  }
}
