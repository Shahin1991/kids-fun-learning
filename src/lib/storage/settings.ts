import { getDb, type AppSettings } from "./db";
import { defaultPinCredentials } from "./pin";

/** Fired on window after every settings change, so guards (module gate, play timer) pick it up mid-game. */
export const SETTINGS_CHANGED = "kids-hub:settings";

const defaults = async (): Promise<AppSettings> => ({
  id: "app-settings",
  soundEnabled: true,
  musicEnabled: false,
  reducedMotion: null,
  pinIsDefault: true,
  disabledModules: [],
  timerMinutes: null,
  // Hashing is async WebCrypto, so it runs before (not inside) the IndexedDB transaction.
  ...(await defaultPinCredentials()),
});

export async function getSettings(): Promise<AppSettings> {
  const db = getDb();
  const existing = await db.settings.get("app-settings");
  if (existing) return existing;
  const fresh = await defaults();
  // Another caller may have created the row meanwhile; keep theirs.
  return db.transaction("rw", db.settings, async () => {
    const again = await db.settings.get("app-settings");
    if (again) return again;
    await db.settings.put(fresh);
    return fresh;
  });
}

/** Read-modify-write in one transaction so quick successive changes are never lost. */
export async function updateSettings(patch: Partial<Omit<AppSettings, "id">>): Promise<AppSettings> {
  const db = getDb();
  const base = await getSettings();
  const next = await db.transaction("rw", db.settings, async () => {
    const merged = { ...((await db.settings.get("app-settings")) ?? base), ...patch };
    await db.settings.put(merged);
    return merged;
  });
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SETTINGS_CHANGED));
  return next;
}
