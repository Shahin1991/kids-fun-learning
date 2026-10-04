"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const CakeBakery = dynamic(() => import("@/components/cake-bakery/CakeBakery"), { ssr: false, loading: () => <LoadingSpinner /> });

export default function CakeBakeryPage() {
  return <CakeBakery />;
}
