export type RewardEvent =
  | { type: "star"; moduleId: string; total: number }
  | { type: "achievement"; achievementId: string };

type Listener = (event: RewardEvent) => void;

const listeners = new Set<Listener>();

export function subscribeRewards(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitReward(event: RewardEvent): void {
  listeners.forEach((l) => l(event));
}
