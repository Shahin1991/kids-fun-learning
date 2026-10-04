"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const MagnaTilesGame = dynamic(() => import("@/components/magna-tiles/MagnaTilesGame"), { ssr: false, loading: () => <LoadingSpinner /> });

export default function MagnaTilesPage() {
  return <MagnaTilesGame />;
}
