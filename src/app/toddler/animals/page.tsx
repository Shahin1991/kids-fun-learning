"use client";

import { TapLearn } from "@/components/TapLearn";
import { ANIMALS } from "@/data/animals";

export default function Page() {
  return <TapLearn moduleId="animals" title="Animals" items={ANIMALS} />;
}
