"use client";

import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import { PickRound, shuffled, type PickRoundData } from "@/components/games/PickRound";

function Clock({ h, m }: { h: number; m: number }) {
  const minuteAngle = m * 6;
  const hourAngle = (h % 12) * 30 + m * 0.5;
  return (
    <svg viewBox="-100 -100 200 200" width={200} height={200} role="img" aria-label="Analog clock">
      <circle r={96} fill="#fff" stroke="#4d96ff" strokeWidth={8} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = ((i + 1) * 30 * Math.PI) / 180;
        return (
          <text key={i} x={Math.sin(a) * 74} y={-Math.cos(a) * 74 + 7} textAnchor="middle" fontSize={20} fontWeight={800} fill="#3b2f4a">
            {i + 1}
          </text>
        );
      })}
      <line x1={0} y1={0} x2={0} y2={-46} stroke="#ff6b6b" strokeWidth={9} strokeLinecap="round" transform={`rotate(${hourAngle})`} />
      <line x1={0} y1={0} x2={0} y2={-70} stroke="#4d96ff" strokeWidth={5} strokeLinecap="round" transform={`rotate(${minuteAngle})`} />
      <circle r={6} fill="#3b2f4a" />
    </svg>
  );
}

const fmt = (h: number, m: number) => `${h}:${String(m).padStart(2, "0")}`;
const spoken = (h: number, m: number) => (m === 0 ? `${h} o'clock` : m === 30 ? `half past ${h}` : m === 15 ? `quarter past ${h}` : `quarter to ${h === 12 ? 1 : h + 1}`);

/** o'clock first, then half past, then quarter past and quarter to. */
function makeRound(streak: number): PickRoundData {
  const minutes = [[0], [0, 30], [0, 30, 15, 45]][Math.min(2, Math.floor(streak / 3))];
  const h = 1 + Math.floor(Math.random() * 12);
  const m = minutes[Math.floor(Math.random() * minutes.length)];
  const wrongs = new Map<string, [number, number]>();
  while (wrongs.size < 2 + (streak > 4 ? 1 : 0)) {
    const wh = Math.random() < 0.5 ? h : 1 + Math.floor(Math.random() * 12);
    const wm = minutes[Math.floor(Math.random() * minutes.length)];
    if (fmt(wh, wm) !== fmt(h, m)) wrongs.set(fmt(wh, wm), [wh, wm]);
  }
  const all: [number, number][] = shuffled([[h, m], ...wrongs.values()] as [number, number][]);
  return {
    say: "What time does the clock show?",
    prompt: <Clock h={h} m={m} />,
    answerId: fmt(h, m),
    choices: all.map(([ch, cm]) => ({ id: fmt(ch, cm), label: fmt(ch, cm), node: <span className="text-5xl">{fmt(ch, cm)}</span> })),
    wrongSay: () => `The short red hand points to ${h}. The long blue hand shows the minutes. Try again!`,
    praise: `It is ${spoken(h, m)}!`,
  };
}

export default function ClockPage() {
  return (
    <PageContainer>
      <ActivityHeader title="Clock Time" moduleId="clock" />
      <ClientOnly>
        <PickRound moduleId="clock" makeRound={makeRound} />
      </ClientOnly>
    </PageContainer>
  );
}
