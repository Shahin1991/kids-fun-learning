import Dexie, { type EntityTable } from "dexie";
import type { AgeGroup } from "@/data/modules";

export type { AgeGroup };

export interface AppSettings {
  id: "app-settings";
  soundEnabled: boolean;
  musicEnabled: boolean;
  /** null = follow the OS preference */
  reducedMotion: boolean | null;
  pinHash: string;
  pinSalt: string;
  pinIsDefault: boolean;
  /** Module ids that are switched off; empty means everything is on. */
  disabledModules: string[];
}

export interface ProgressRecord {
  id?: number;
  moduleId: string;
  score?: number;
  moves?: number;
  /** e.g. memory difficulty */
  variant?: string;
  completedAt: number;
}

export interface StarRecord {
  moduleId: string;
  count: number;
}

export interface AchievementRecord {
  id: string;
  unlockedAt: number;
}

class KidsDB extends Dexie {
  settings!: EntityTable<AppSettings, "id">;
  progress!: EntityTable<ProgressRecord, "id">;
  stars!: EntityTable<StarRecord, "moduleId">;
  achievements!: EntityTable<AchievementRecord, "id">;

  constructor() {
    super("kids-learning-hub");
    this.version(1).stores({
      settings: "id",
      progress: "++id, moduleId, completedAt",
      stars: "moduleId",
      achievements: "id",
    });
  }
}

let instance: KidsDB | null = null;

/** Lazily created so nothing touches IndexedDB during the static build. */
export function getDb(): KidsDB {
  if (!instance) instance = new KidsDB();
  return instance;
}
