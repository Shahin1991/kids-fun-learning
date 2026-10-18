"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PageContainer } from "@/components/PageContainer";
import { PickRound, type PickRoundData } from "@/components/games/PickRound";
import { CountryShape } from "@/components/world/CountryShape";
import { Globe } from "@/components/world/Globe";
import { finishActivity } from "@/lib/activity";
import { audioManager } from "@/lib/audio/AudioManager";
import { quizzable, shapeRound } from "@/lib/world/quiz";
import { loadWorld, type Country, type World } from "@/lib/world/world";

const MODULE = "world-globe";

function describe(c: Country): string {
  const { name, capital, continent } = c.info;
  if (continent === "Antarctica") return "Antarctica. The frozen continent at the South Pole. Only scientists live here.";
  return `${name}. ${capital ? `Its capital is ${capital}. ` : ""}${name} is in ${continent}.`;
}

/** Spin the globe and tap any country to hear its name, capital and continent. */
function Explore({ world }: { world: World }) {
  const [selected, setSelected] = useState<Country | null>(null);
  const seen = useRef(new Set<string>());

  const choose = useCallback((c: Country | null) => {
    setSelected(c);
    if (!c) return;
    audioManager.playPop(1);
    audioManager.speak(describe(c));
    seen.current.add(c.key);
    if (seen.current.size === 10) void finishActivity(MODULE, { variant: "explore" });
  }, []);

  const surprise = () => {
    const pool = quizzable(world.countries).filter((c) => c.key !== selected?.key);
    choose(pool[Math.floor(Math.random() * pool.length)]);
  };

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="relative min-h-[55dvh] flex-1">
        <Globe world={world} selected={selected} onSelect={choose} />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {selected ? (
          <button type="button" onClick={() => audioManager.speak(describe(selected))} className="flex min-h-16 flex-1 items-center gap-3 rounded-3xl bg-surface px-4 py-2 text-left shadow-md active:scale-95 sm:max-w-md" aria-label={`Hear about ${selected.info.name}`}>
            <span className="text-5xl" aria-hidden>
              {selected.info.flag || "🏳️"}
            </span>
            <span className="flex flex-col">
              <span className="text-2xl font-extrabold">{selected.info.name}</span>
              <span className="text-base opacity-80">
                {selected.info.capital && <>Capital: {selected.info.capital} · </>}
                {selected.info.continent}
              </span>
            </span>
            <span className="ml-auto text-3xl" aria-hidden>
              🔊
            </span>
          </button>
        ) : (
          <p className="flex-1 text-center text-xl font-bold sm:max-w-md">Spin the globe and tap a country!</p>
        )}
        <button type="button" onClick={surprise} className="h-16 rounded-3xl bg-kid-blue px-5 text-xl font-extrabold text-white shadow-md active:scale-95">
          🎲 Surprise me
        </button>
      </div>
    </div>
  );
}

/** Which country has this shape? */
function ShapeQuiz({ world }: { world: World }) {
  const recent = useRef<string[]>([]);
  const makeRound = useCallback(
    (streak: number): PickRoundData => {
      const q = shapeRound(streak, world.countries, new Set(recent.current));
      recent.current = [...recent.current, q.answer.key].slice(-12);
      const byName = new Map(q.choices.map((c) => [c.info.name, c]));
      return {
        say: "Which country has this shape?",
        prompt: <CountryShape country={q.answer} />,
        answerId: q.answer.key,
        choices: q.choices.map((c) => ({
          id: c.key,
          label: c.info.name,
          node: (
            <span className="flex flex-col items-center gap-1 text-2xl leading-tight sm:text-3xl">
              <span className="text-5xl" aria-hidden>
                {c.info.flag}
              </span>
              {c.info.name}
            </span>
          ),
        })),
        wrongSay: (c) => `Not ${c.label}. ${c.label} is in ${byName.get(c.label)?.info.continent}. Look at the shape again!`,
        praise: `Yes! That's ${q.answer.info.name}, in ${q.answer.info.continent}.`,
      };
    },
    [world],
  );
  return <PickRound moduleId={MODULE} makeRound={makeRound} />;
}

const TABS = [
  ["explore", "🌍 Explore"],
  ["quiz", "🧩 Shape quiz"],
] as const;

export default function WorldGlobePage() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("explore");
  const [world, setWorld] = useState<World | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadWorld()
      .then(setWorld)
      .catch(() => setFailed(true));
  }, []);

  return (
    <PageContainer className="gap-3!">
      <ActivityHeader title="World Globe" moduleId={MODULE} />
      <div className="flex justify-center gap-2" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`min-h-touch rounded-3xl px-5 text-xl font-bold shadow active:scale-95 ${tab === id ? "bg-kid-blue text-white" : "bg-surface"}`}>
            {label}
          </button>
        ))}
      </div>
      <ClientOnly>
        {failed ? (
          <p className="text-center text-xl">The map could not load. Check the internet connection and try again.</p>
        ) : !world ? (
          <LoadingSpinner label="Loading the world" />
        ) : tab === "explore" ? (
          <Explore world={world} />
        ) : (
          <ShapeQuiz world={world} />
        )}
      </ClientOnly>
    </PageContainer>
  );
}
