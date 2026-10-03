"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HomeButton } from "@/components/HomeButton";
import { PageContainer } from "@/components/PageContainer";
import { ShakeOnWrong } from "@/components/ShakeOnWrong";
import { getSettings } from "@/lib/storage/settings";
import { verifyPin } from "@/lib/storage/pin";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✓"];

export default function UnlockPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [wobble, setWobble] = useState(0);

  const submit = async (value: string) => {
    const s = await getSettings();
    if (await verifyPin(value, s.pinSalt, s.pinHash)) {
      sessionStorage.setItem("parent-unlocked", "1");
      router.push("/parent");
    } else {
      setWobble((n) => n + 1);
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
      <p>Enter your PIN</p>
      <ShakeOnWrong trigger={wobble}>
        <div aria-live="polite" className="flex h-16 min-w-48 items-center justify-center rounded-2xl bg-surface text-4xl tracking-widest shadow">
          {"•".repeat(pin.length) || " "}
        </div>
      </ShakeOnWrong>
      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((k) => (
          <button key={k} type="button" onClick={() => press(k)} className="min-h-touch min-w-touch rounded-2xl bg-surface text-3xl font-bold shadow active:scale-95">
            {k}
          </button>
        ))}
      </div>
    </PageContainer>
  );
}
