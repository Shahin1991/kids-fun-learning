"use client";

import { geoAzimuthalEqualArea, geoPath } from "d3-geo";
import { useMemo } from "react";
import type { Country } from "@/lib/world/world";
import { CONTINENT_COLOURS } from "./Globe";

/**
 * A country's outline on its own, centred and scaled to fit. An equal-area projection around the country keeps its
 * true shape (no Mercator stretching, so Canada and Russia look as they do on the globe).
 */
export function CountryShape({ country, size = 240 }: { country: Country; size?: number }) {
  const d = useMemo(() => {
    const projection = geoAzimuthalEqualArea()
      .rotate([-country.centre[0], -country.centre[1]])
      .fitExtent(
        [
          [10, 10],
          [size - 10, size - 10],
        ],
        country.mainland,
      );
    return geoPath(projection)(country.mainland) ?? "";
  }, [country, size]);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-56 w-56 sm:h-72 sm:w-72" role="img" aria-label="A country's shape">
      <path d={d} fill={CONTINENT_COLOURS[country.info.continent] ?? "#ffa94d"} stroke="#3b2f4a" strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}
