"use client";

import { FactModule } from "@/components/FactModule";
import { VEHICLES } from "@/data/vehicles";

export default function Page() {
  return <FactModule moduleId="vehicles" title="Vehicle World" categories={VEHICLES} />;
}
