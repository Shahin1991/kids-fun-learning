"use client";

import { TapLearn } from "@/components/TapLearn";
import { COLORS } from "@/data/colors";

export default function Page() {
  return <TapLearn moduleId="colors" title="Colors" items={COLORS} />;
}
