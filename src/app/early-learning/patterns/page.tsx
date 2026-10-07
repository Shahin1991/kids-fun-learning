"use client";

import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import { PickRound, shuffled, type PickRoundData } from "@/components/games/PickRound";

const SYMBOLS = ["🔴", "🔵", "🟢", "🟡", "🟣", "🟠", "⭐", "❤️", "🔷", "🔺"];

/** Pattern cores get longer as the child succeeds: AB, then AAB/ABB, then ABC. */
const CORES = [[0, 1], [0, 0, 1], [0, 1, 1], [0, 1, 2], [0, 0, 1, 1], [0, 1, 2, 2]];

function makeRound(streak: number): PickRoundData {
  const level = Math.min(CORES.length - 1, Math.floor(streak / 2));
  const core = CORES[Math.floor(Math.random() * (level + 1))];
  const kinds = Math.max(...core) + 1;
  const picks = shuffled(SYMBOLS).slice(0, kinds + 2);
  const length = core.length * 2 + 1 + (core.length < 3 ? 1 : 0);
  const seq = Array.from({ length }, (_, i) => picks[core[i % core.length]]);
  const answer = seq[length - 1];
  const shown = seq.slice(0, -1);
  const choiceSymbols = shuffled([answer, ...picks.filter((p) => p !== answer)].slice(0, Math.min(4, 2 + Math.floor(streak / 3) + 1)));
  return {
    say: "What comes next in the pattern?",
    prompt: (
      <span className="flex flex-wrap items-center justify-center gap-2 text-5xl">
        {shown.map((s, i) => (
          <span key={i}>{s}</span>
        ))}
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-dashed border-kid-purple text-4xl">❓</span>
      </span>
    ),
    answerId: answer,
    choices: choiceSymbols.map((s) => ({ id: s, label: s, node: <span>{s}</span> })),
    wrongSay: () => "Not quite. Look at the pattern from the start. What repeats?",
    praise: "The pattern goes on!",
  };
}

export default function PatternsPage() {
  return (
    <PageContainer>
      <ActivityHeader title="Pattern Parade" moduleId="patterns" />
      <ClientOnly>
        <PickRound moduleId="patterns" makeRound={makeRound} />
      </ClientOnly>
    </PageContainer>
  );
}
