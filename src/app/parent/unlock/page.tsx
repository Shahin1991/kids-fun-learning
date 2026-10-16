"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HomeButton } from "@/components/HomeButton";
import { PageContainer } from "@/components/PageContainer";
import { ShakeOnWrong } from "@/components/ShakeOnWrong";
import { getSettings } from "@/lib/storage/settings";
import { verifyPin } from "@/lib/storage/pin";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✓"];
const KEY_LABELS: Record<string, string> = { "⌫": "Delete", "✓": "Unlock" };
const FAILS_KEY = "parent-pin-fails";

/** Wait after the nth wrong guess: 1s, 2s, 4s … up to 30s, so a persistent child cannot just try every PIN. */
const lockoutMs = (fails: number) => (fails <= 0 ? 0 : Math.min(30_000, 1000 * 2 ** (fails - 1)));

const readFails = () => {
  try {
    return JSON.parse(sessionStorage.getItem(FAILS_KEY) ?? "null") as { n: number; at: number } | null;
  } catch {
    return null;
  }
};

function recordFail(): number {
  const n = (readFails()?.n ?? 0) + 1;
  sessionStorage.setItem(FAILS_KEY, JSON.stringify({ n, at: Date.now() }));
  return n;
}

export default function UnlockPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [wobble, setWobble] = useState(0);
  const [waitS, setWaitS] = useState(0);
  const [error, setError] = useState("");

  // Count down any lockout left from earlier guesses (also survives a reload).
  useEffect(() => {
    const tick = () => {
      const f = readFails();
      const left = f ? Math.ceil((f.at + lockoutMs(f.n) - Date.now()) / 1000) : 0;
      setWaitS(Math.max(0, left));
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, []);

  const submit = async (value: string) => {
    if (waitS > 0 || !value) return;
    let ok = false;
    try {
      const s = await getSettings();
      ok = await verifyPin(value, s.pinSalt, s.pinHash);
      setError("");
    } catch {
      setError("Could not check the PIN. Private browsing can block saved settings.");
    }
    if (ok) {
      sessionStorage.removeItem(FAILS_KEY);
      sessionStorage.setItem("parent-unlocked", "1");
      router.replace("/parent");
    } else {
      const n = recordFail();
      setWaitS(Math.ceil(lockoutMs(n) / 1000));
      setWobble((w) => w + 1);
      setPin("");
    }
  };

  const press = (k: string) => {
    if (k === "⌫") setPin((p) => p.slice(0, -1));
    else if (k === "✓") void submit(pin);
    else if (pin.length < 8) setPin((p) => p + k);
  };

  return (
    <PageContainer className="items-center">
      <div className="self-start"><HomeButton /></div>
      <h1 className="text-3xl font-extrabold">Parent area</h1>
      <p>{waitS > 0 ? `Please wait ${waitS}s before trying again` : "Enter your PIN"}</p>
      <ShakeOnWrong trigger={wobble}>
        <div aria-live="polite" className="flex h-16 min-w-48 items-center justify-center rounded-2xl bg-surface text-4xl tracking-widest shadow">
          <span aria-hidden>{"•".repeat(pin.length) || " "}</span>
          <span className="sr-only">{pin.length} digits entered</span>
        </div>
      </ShakeOnWrong>
      {error && <p role="alert" className="text-center">{error}</p>}
      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            aria-label={KEY_LABELS[k] ?? k}
            disabled={k === "✓" && waitS > 0}
            onClick={() => press(k)}
            className="min-h-touch min-w-touch rounded-2xl bg-surface text-3xl font-bold shadow active:scale-95 disabled:opacity-40"
          >
            {k}
          </button>
        ))}
      </div>
    </PageContainer>
  );
}
