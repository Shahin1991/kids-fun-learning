"use client";

import { TapLearn } from "@/components/TapLearn";
import { EMOTIONS } from "@/data/emotions";

export default function Page() {
  return <TapLearn moduleId="emotions" title="Feelings" items={EMOTIONS} />;
}
