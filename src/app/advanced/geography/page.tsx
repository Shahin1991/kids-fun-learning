"use client";

import { FactModule } from "@/components/FactModule";
import { GEOGRAPHY } from "@/data/geography";

export default function Page() {
  return <FactModule moduleId="geography" title="Geography" categories={GEOGRAPHY} />;
}
