"use client";

import { ActivityHeader } from "@/components/ActivityHeader";
import { ClientOnly } from "@/components/ClientOnly";
import { PageContainer } from "@/components/PageContainer";
import { PickRound, shuffled, type PickRoundData } from "@/components/games/PickRound";
import { ALPHABET } from "@/data/alphabet";

/** Phonics: hear the word, pick the letter it starts with. Easy (clearly different letters) first, then more choices. */
function makeRound(streak: number): PickRoundData {
  const target = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  const count = Math.min(4, 2 + Math.floor(streak / 3));
  const others = shuffled(ALPHABET.filter((a) => a.letter !== target.letter)).slice(0, count - 1);
  const word = target.word;
  return {
    say: `Which letter does ${word} start with?`,
    prompt: (
      <span className="flex items-center gap-3">
        <span className="text-7xl">{target.emoji}</span>
        <span className="text-3xl">{word}</span>
      </span>
    ),
    answerId: target.letter,
    choices: shuffled([target, ...others]).map((a) => ({ id: a.letter, label: a.letter, node: <span>{a.letter}</span> })),
    wrongSay: (c) => `That is the letter ${c.label}. ${word} starts with ${target.letter}. ${target.letter} for ${word}.`,
    praise: `${target.letter} for ${word}!`,
  };
}

export default function FirstSoundPage() {
  return (
    <PageContainer>
      <ActivityHeader title="First Sound" moduleId="first-sound" />
      <ClientOnly>
        <PickRound moduleId="first-sound" makeRound={makeRound} />
      </ClientOnly>
    </PageContainer>
  );
}
