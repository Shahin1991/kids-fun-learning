"use client";

import { useEffect, useRef, useState } from "react";
import { ActivityHeader } from "@/components/ActivityHeader";
import { Button } from "@/components/Button";
import { PageContainer } from "@/components/PageContainer";
import { AU_ACHIEVEMENT_TARGET, AU_COUNTDOWN_SECONDS, AU_OBJECTS, AU_TYPING_SECONDS } from "@/data/alternate-uses";
import { finishActivity } from "@/lib/activity";
import { unlockAchievement } from "@/lib/rewards/RewardManager";

type Phase = "idle" | "countdown" | "typing" | "done";

export default function AlternateUsesPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [object, setObject] = useState(AU_OBJECTS[0]);
  const [seconds, setSeconds] = useState(0);
  const [uses, setUses] = useState<string[]>([]);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const start = () => {
    setObject(AU_OBJECTS[Math.floor(Math.random() * AU_OBJECTS.length)]);
    setUses([]);
    setText("");
    setSeconds(AU_COUNTDOWN_SECONDS);
    setPhase("countdown");
  };

  useEffect(() => {
    if (phase !== "countdown" && phase !== "typing") return;
    const timer = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (seconds > 0) return;
    if (phase === "countdown") {
      const t = setTimeout(() => {
        setSeconds(AU_TYPING_SECONDS);
        setPhase("typing");
        inputRef.current?.focus();
      }, 0);
      return () => clearTimeout(t);
    }
    if (phase === "typing") {
      const t = setTimeout(() => {
        setPhase("done");
        void finishActivity("alternate-uses", { score: uses.length });
        if (uses.length >= AU_ACHIEVEMENT_TARGET) void unlockAchievement("idea-machine");
      }, 0);
      return () => clearTimeout(t);
    }
  }, [seconds, phase, uses.length]);

  const add = () => {
    const v = text.trim();
    if (v && !uses.some((u) => u.toLowerCase() === v.toLowerCase())) setUses((u) => [...u, v]);
    setText("");
  };

  return (
    <PageContainer>
      <ActivityHeader title="Alternate Uses" moduleId="alternate-uses" />
      {phase === "idle" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-2xl">Think of as many uses as you can for a surprise object. You get 60 seconds!</p>
          <Button onClick={start}>Start</Button>
        </div>
      )}
      {phase === "countdown" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center" aria-live="polite">
          <p className="text-3xl">Your object is a…</p>
          <p className="text-6xl font-extrabold">{object}</p>
          <p className="text-8xl font-extrabold text-kid-blue">{seconds}</p>
        </div>
      )}
      {(phase === "typing" || phase === "done") && (
        <>
          <p className="text-center text-3xl font-bold">Uses for a {object} · {phase === "typing" ? `${seconds}s` : "Time's up!"}</p>
          {phase === "typing" && (
            <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex gap-2">
              <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} aria-label="A use" className="min-h-14 flex-1 rounded-2xl border-2 px-4 text-2xl" />
              <Button type="submit">Add</Button>
            </form>
          )}
          <p className="text-xl font-bold">{uses.length} {uses.length === 1 ? "idea" : "ideas"}</p>
          <ul className="flex flex-wrap gap-2">
            {uses.map((u) => <li key={u} className="rounded-full bg-surface px-4 py-2 text-xl shadow">{u}</li>)}
          </ul>
          {phase === "done" && <Button onClick={start}>Play again</Button>}
        </>
      )}
    </PageContainer>
  );
}
