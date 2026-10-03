"use client";

import { useEffect, useState } from "react";
import { AGE_GROUP_ORDER, getModulesByAgeGroup } from "@/data/modules";
import { getSettings } from "@/lib/storage/settings";
import { AgeGroupSection } from "./AgeGroupSection";
import { LogoLongPress } from "./LogoLongPress";
import { MusicToggle } from "./MusicToggle";
import { PageContainer } from "./PageContainer";
import { SoundToggle } from "./SoundToggle";

export function HomeScreen() {
  const [disabled, setDisabled] = useState<string[]>([]);

  useEffect(() => {
    getSettings().then((s) => setDisabled(s.disabledModules)).catch(() => {});
  }, []);

  return (
    <PageContainer>
      <header className="flex items-center justify-between gap-3">
        <LogoLongPress>
          <span className="text-4xl font-extrabold text-toddler-dark">🌈 Kids Learning Hub</span>
        </LogoLongPress>
        <div className="flex gap-2">
          <MusicToggle />
          <SoundToggle />
        </div>
      </header>
      {AGE_GROUP_ORDER.map((g) => (
        <AgeGroupSection key={g} ageGroup={g} modules={getModulesByAgeGroup(g).filter((m) => !disabled.includes(m.id))} />
      ))}
    </PageContainer>
  );
}
