"use client";

import { FactModule } from "@/components/FactModule";
import { SCIENCE } from "@/data/science";

export default function Page() {
  return <FactModule moduleId="science" title="Science" categories={SCIENCE} />;
}
