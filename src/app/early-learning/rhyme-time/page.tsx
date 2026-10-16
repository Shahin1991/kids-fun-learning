"use client";

import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import { PickRound, shuffled, type PickRoundData } from "@/components/games/PickRound";
import { RHYME_FAMILIES } from "@/data/rhymes";

/** Phonological awareness: hear a word, pick the picture whose name rhymes with it. Two choices first, then up to four. */
function makeRound(streak: number): PickRoundData {
  const fi = Math.floor(Math.random() * RHYME_FAMILIES.length);
  const [word, match] = shuffled(RHYME_FAMILIES[fi]);
  const count = Math.min(4, 2 + Math.floor(streak / 3));
  const others = shuffled(RHYME_FAMILIES.filter((_, i) => i !== fi))
    .slice(0, count - 1)
    .map((f) => f[Math.floor(Math.random() * f.length)]);
  return {
    say: `Which one rhymes with ${word.word}?`,
    prompt: (
      <span className="flex items-center gap-3">
        <span className="text-7xl">{word.emoji}</span>
        <span className="text-4xl">{word.word}</span>
      </span>
    ),
    answerId: match.word,
    choices: shuffled([match, ...others]).map((w) => ({ id: w.word, label: w.word, node: <span>{w.emoji}</span> })),
    wrongSay: (c) => `${c.label}, ${word.word}. Those end with different sounds. Listen: ${word.word}!`,
    praise: `${word.word}, ${match.word}! They rhyme!`,
  };
}

export default function RhymeTimePage() {
  return (
    <PageContainer>
      <ActivityHeader title="Rhyme Time" moduleId="rhyme-time" />
      <ClientOnly>
        <PickRound moduleId="rhyme-time" makeRound={makeRound} />
      </ClientOnly>
    </PageContainer>
  );
}
