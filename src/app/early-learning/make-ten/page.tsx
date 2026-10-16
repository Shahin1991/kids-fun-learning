"use client";

import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import { PickRound, type PickRoundData } from "@/components/games/PickRound";
import { makeTenRound } from "@/lib/make-ten/round";

/** A ten-frame (one row for "make 5"): filled counters plus dashed empty spaces to count. */
function TenFrame({ have, target }: { have: number; target: number }) {
  const cols = 5;
  const rows = target / cols;
  const cell = 44;
  return (
    <svg viewBox={`0 0 ${cols * cell + 8} ${rows * cell + 8}`} className="h-auto w-56 sm:w-72" role="img" aria-label={`${have} counters, ${target - have} empty spaces`}>
      <rect x="2" y="2" width={cols * cell + 4} height={rows * cell + 4} rx="10" fill="#fff" stroke="#3b2f4a" strokeWidth="4" />
      {Array.from({ length: target }, (_, i) => {
        const x = 4 + (i % cols) * cell + cell / 2;
        const y = 4 + Math.floor(i / cols) * cell + cell / 2;
        return (
          <g key={i}>
            {i % cols !== 0 && <line x1={x - cell / 2} y1={y - cell / 2} x2={x - cell / 2} y2={y + cell / 2} stroke="#3b2f4a" strokeWidth="2" />}
            {i < have ? <circle cx={x} cy={y} r="16" fill="#ff6b6b" stroke="#c0392b" strokeWidth="3" /> : <circle cx={x} cy={y} r="15" fill="none" stroke="#adb5bd" strokeWidth="3" strokeDasharray="5 5" />}
          </g>
        );
      })}
      {rows === 2 && <line x1="4" y1={4 + cell} x2={4 + cols * cell} y2={4 + cell} stroke="#3b2f4a" strokeWidth="2" />}
    </svg>
  );
}

/** Number bonds: count the empty spaces to find how many more make 5, then 10. */
function makeRound(streak: number): PickRoundData {
  const q = makeTenRound(streak);
  return {
    say: `How many more make ${q.target}?`,
    prompt: (
      <span className="flex flex-col items-center gap-2">
        <TenFrame have={q.have} target={q.target} />
        <span className="text-3xl">
          {q.have} + ? = {q.target}
        </span>
      </span>
    ),
    answerId: String(q.answer),
    choices: q.choices.map((n) => ({ id: String(n), label: String(n), node: <span>{n}</span> })),
    wrongSay: (c) => `${q.have} and ${c.label} make ${q.have + Number(c.label)}. Count the empty spaces to find ${q.target}!`,
    praise: `${q.have} and ${q.answer} make ${q.target}!`,
  };
}

export default function MakeTenPage() {
  return (
    <PageContainer>
      <ActivityHeader title="Make Ten" moduleId="make-ten" />
      <ClientOnly>
        <PickRound moduleId="make-ten" makeRound={makeRound} />
      </ClientOnly>
    </PageContainer>
  );
}
