import { getDb, type AppSettings } from "./db";
import { defaultPinCredentials } from "./pin";

export async function getSettings(): Promise<AppSettings> {
  const db = getDb();
  const existing = await db.settings.get("app-settings");
  if (existing) return existing;
  const created: AppSettings = {
    id: "app-settings",
    soundEnabled: true,
    musicEnabled: false,
    reducedMotion: null,
    pinIsDefault: true,
    disabledModules: [],
    ...(await defaultPinCredentials()),
  };
  await db.settings.put(created);
  return created;
}

export async function updateSettings(patch: Partial<Omit<AppSettings, "id">>): Promise<AppSettings> {
  const next = { ...(await getSettings()), ...patch };
  await getDb().settings.put(next);
  return next;
}
