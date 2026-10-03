"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSetMotionOverride } from "@/components/ReducedMotionProvider";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { HomeButton } from "@/components/HomeButton";
import { PageContainer } from "@/components/PageContainer";
import { MODULES } from "@/data/modules";
import { bestMovesOf, bestScoreOf, getAllProgress } from "@/lib/progress/progress";
import { getAllStars } from "@/lib/rewards/RewardManager";
import type { AppSettings, ProgressRecord } from "@/lib/storage/db";
import { hashPin, newSalt } from "@/lib/storage/pin";
import { getSettings, updateSettings } from "@/lib/storage/settings";

export default function ParentDashboard() {
  const router = useRouter();
  const setMotionOverride = useSetMotionOverride();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [progress, setProgress] = useState<Record<string, ProgressRecord[]>>({});
  const [stars, setStars] = useState<Record<string, number>>({});
  const [newPin, setNewPin] = useState("");
  const [pinMsg, setPinMsg] = useState("");

  useEffect(() => {
    // Not real security: this flag is trivially editable in devtools.
    if (sessionStorage.getItem("parent-unlocked") !== "1") {
      router.replace("/parent/unlock");
      return;
    }
    Promise.all([getSettings(), getAllProgress(), getAllStars()]).then(([s, p, st]) => {
      setSettings(s);
      setProgress(p);
      setStars(st);
    });
  }, [router]);

  if (!settings) return <PageContainer><p>Loading…</p></PageContainer>;

  const toggleModule = async (id: string) => {
    const disabledModules = settings.disabledModules.includes(id)
      ? settings.disabledModules.filter((m) => m !== id)
      : [...settings.disabledModules, id];
    setSettings(await updateSettings({ disabledModules }));
  };

  const setMotion = async (value: boolean | null) => {
    setSettings(await updateSettings({ reducedMotion: value }));
    setMotionOverride(value);
  };

  const changePin = async () => {
    if (!/^\d{4,8}$/.test(newPin)) {
      setPinMsg("Use 4 to 8 digits.");
      return;
    }
    const pinSalt = newSalt();
    setSettings(await updateSettings({ pinSalt, pinHash: await hashPin(newPin, pinSalt), pinIsDefault: false }));
    setNewPin("");
    setPinMsg("PIN changed.");
  };

  return (
    <PageContainer>
      <header className="flex items-center gap-3">
        <HomeButton />
        <h1 className="text-3xl font-extrabold">Parent dashboard</h1>
      </header>

      {settings.pinIsDefault && <Card className="bg-kid-yellow/40">You are still using the default PIN (1234). Please change it below.</Card>}

      <Card>
        <h2 className="mb-2 text-2xl font-bold">Modules</h2>
        <ul className="flex flex-col gap-2">
          {MODULES.map((m) => {
            const recs = progress[m.id] ?? [];
            const score = bestScoreOf(recs);
            const moves = bestMovesOf(recs);
            return (
              <li key={m.id} className="flex items-center gap-3">
                <label className="flex min-h-12 flex-1 items-center gap-3">
                  <input type="checkbox" className="h-6 w-6" checked={!settings.disabledModules.includes(m.id)} onChange={() => toggleModule(m.id)} />
                  <span>{m.icon} {m.title}</span>
                </label>
                <span className="text-sm">
                  ⭐ {stars[m.id] ?? 0} · played {recs.length}
                  {score !== null && ` · best ${score}`}
                  {moves !== null && ` · fewest moves ${moves}`}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-2 text-2xl font-bold">Motion</h2>
        <div className="flex flex-wrap gap-2">
          {([[null, "Follow device"], [true, "Reduce motion"], [false, "Full motion"]] as const).map(([v, label]) => (
            <Button key={label} variant={settings.reducedMotion === v ? "primary" : "ghost"} onClick={() => setMotion(v)}>{label}</Button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 text-2xl font-bold">Change PIN</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            inputMode="numeric"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            aria-label="New PIN"
            className="min-h-14 rounded-2xl border-2 px-4 text-2xl"
          />
          <Button onClick={changePin}>Save</Button>
          <span role="status">{pinMsg}</span>
        </div>
      </Card>

      <p className="text-center text-sm opacity-60">
        Artwork: <a className="underline" href="https://github.com/jdecked/twemoji">Twemoji</a>, CC-BY 4.0
      </p>

      <Button
        variant="secondary"
        onClick={() => {
          sessionStorage.removeItem("parent-unlocked");
          router.push("/");
        }}
      >
        Lock and leave
      </Button>
    </PageContainer>
  );
}
