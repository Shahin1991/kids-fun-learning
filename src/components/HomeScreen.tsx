"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { AGE_GROUP_ORDER, getModulesByAgeGroup, type AgeGroup } from "@/data/modules";
import { readAgePref, saveAgePref, type AgeChoice } from "@/lib/age-pref";
import { AgePicker } from "./AgePicker";
import { getSettings } from "@/lib/storage/settings";
import { AgeGroupSection } from "./AgeGroupSection";
import { LogoLongPress } from "./LogoLongPress";
import { MusicToggle } from "./MusicToggle";
import { PageContainer } from "./PageContainer";
import { SoundToggle } from "./SoundToggle";
import { WelcomeBanner } from "./WelcomeBanner";
import { ThemeToggle } from "./ThemeToggle";

const AGE_LABEL: Record<AgeChoice, string> = { toddler: "Ages 2-3", "early-learning": "Ages 4-6", advanced: "Ages 7-8", others: "More games", all: "All ages" };
const expandFor = (c: AgeChoice) => new Set<AgeGroup>(c === "all" ? AGE_GROUP_ORDER : [c]);

export function HomeScreen() {
  const [disabled, setDisabled] = useState<string[]>([]);
  const [pref, setPref] = useState<AgeChoice | null>(null);
  const [open, setOpen] = useState<Set<AgeGroup>>(() => new Set(AGE_GROUP_ORDER));
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    getSettings().then((s) => setDisabled(s.disabledModules)).catch(() => {});
    // Read the saved age after mount so the server and first client render agree.
    const t = setTimeout(() => {
      const saved = readAgePref();
      setPref(saved);
      if (saved) setOpen(expandFor(saved));
      else setPicking(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const choose = (c: AgeChoice) => {
    saveAgePref(c);
    setPref(c);
    setOpen(expandFor(c));
    setPicking(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const toggle = (g: AgeGroup) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(g)) n.delete(g);
      else n.add(g);
      return n;
    });
  const jump = (g: AgeGroup) => {
    setOpen((s) => new Set([...s, g]));
    setTimeout(() => document.getElementById(`group-${g}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  return (
    <PageContainer>
      <header className="flex items-center justify-between gap-2">
        <LogoLongPress>
          <span className="text-2xl font-extrabold leading-tight text-toddler-dark sm:text-4xl">🌈 Kids Learning Hub</span>
        </LogoLongPress>
        <div className="flex shrink-0 gap-1.5 sm:gap-2">
          <ThemeToggle />
          <MusicToggle />
          <SoundToggle />
        </div>
      </header>
      <WelcomeBanner hidden={disabled} ageLabel={pref ? AGE_LABEL[pref] : "Pick your age"} onJump={jump} onChangeAge={() => setPicking(true)} />
      {AGE_GROUP_ORDER.map((g) => (
        <AgeGroupSection key={g} ageGroup={g} open={open.has(g)} onToggle={() => toggle(g)} modules={getModulesByAgeGroup(g).filter((m) => !disabled.includes(m.id))} />
      ))}
      <AnimatePresence>{picking && <AgePicker onPick={choose} onClose={pref ? () => setPicking(false) : undefined} />}</AnimatePresence>
    </PageContainer>
  );
}
