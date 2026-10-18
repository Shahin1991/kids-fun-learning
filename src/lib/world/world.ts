import { geoArea, geoCentroid, geoContains, geoDistance } from "d3-geo";
import type { Feature, LineString, MultiLineString, MultiPolygon, Position } from "geojson";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, GeometryObject, Topology } from "topojson-specification";
import INFO from "@/data/world-countries.json";

export interface CountryInfo {
  name: string;
  capital: string;
  continent: string;
  flag: string;
  /** km² */
  area: number;
  /** A United Nations member state (the quiz only asks about these) */
  un: boolean;
}

export interface Country {
  key: string;
  info: CountryInfo;
  /** Every part of the country at full detail */
  shape: Feature<MultiPolygon>;
  /** The main landmass and nearby islands, without far-flung parts (Alaska, French Guiana): for the quiz and for flying to it */
  mainland: Feature<MultiPolygon>;
  /** Centre of the mainland, [longitude, latitude] */
  centre: [number, number];
  /** Angular radius of the mainland around `centre`, in degrees */
  size: number;
  /** A circle that holds every part, so countries out of view can be skipped when drawing */
  cap: { centre: [number, number]; radius: number };
}

/** A short stretch of border or coast, with a circle around it so it can be skipped when out of view. */
export interface Line {
  line: LineString;
  cap: Country["cap"];
}

/** One resolution of the map: a filled shape per country, the borders between countries and the coastlines. */
export interface Layer {
  shapes: { key: string; shape: Feature<MultiPolygon>; cap: Country["cap"] }[];
  borders: Line[];
  coast: Line[];
}

export interface World {
  countries: Country[];
  byKey: Map<string, Country>;
  /** Natural Earth 1:50m, drawn when the globe is still or zoomed in */
  detail: Layer;
  /** Natural Earth 1:110m, drawn while it spins */
  coarse: Layer;
}

const DEG = 180 / Math.PI;

/** Shapes in the map without an ISO number. Somaliland and Northern Cyprus are shown as part of the UN member they belong to. */
const NO_ID: Record<string, string> = {
  Somaliland: "706",
  "N. Cyprus": "196",
  Kosovo: "XK",
  "Indian Ocean Ter.": "IOT",
  "Siachen Glacier": "SIA",
};

const keyOf = (g: { id?: string | number; properties?: { name: string } | null }) => (g.id != null ? String(g.id) : NO_ID[g.properties?.name ?? ""]);

const polygonsOf = (f: Feature): Position[][][] => (f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : f.geometry.type === "Polygon" ? [f.geometry.coordinates] : []);

const multi = (key: string, polys: Position[][][]): Feature<MultiPolygon> => ({ type: "Feature", id: key, properties: {}, geometry: { type: "MultiPolygon", coordinates: polys } });

/** Furthest outer-ring point from `centre`, in degrees. */
function reach(centre: [number, number], polys: Position[][][]): number {
  let max = 0;
  for (const p of polys) for (const pt of p[0]) max = Math.max(max, geoDistance(centre, pt as [number, number]));
  return max * DEG;
}

/** Keeps the biggest landmass and any parts close to it, so a shape is recognisable and not shrunk by distant islands. */
/** Gap in degrees (about 550 km) that still counts as "nearby" when chaining islands to the mainland. */
const ISLAND_GAP = 5;

/**
 * Keeps the biggest landmass and every part reachable from it in small hops (so archipelagos like Indonesia and
 * Japan stay whole), dropping far-flung parts such as Alaska, Hawaii and French Guiana.
 */
export function mainlandOf(key: string, polys: Position[][][]): Feature<MultiPolygon> {
  const parts = polys.map((p) => {
    const c = geoCentroid({ type: "Polygon", coordinates: p }) as [number, number];
    return { p, area: geoArea({ type: "Polygon", coordinates: p }), c, r: reach(c, [p]) };
  });
  const biggest = parts.reduce((a, b) => (b.area > a.area ? b : a));
  const kept = [biggest];
  let rest = parts.filter((x) => x !== biggest);
  for (let grew = true; grew; ) {
    grew = false;
    rest = rest.filter((x) => {
      const near = kept.some((k) => geoDistance(x.c, k.c) * DEG - x.r - k.r <= ISLAND_GAP);
      if (near) {
        kept.push(x);
        grew = true;
      }
      return !near;
    });
  }
  return multi(
    key,
    kept.map((x) => x.p),
  );
}

/** Splits long lines into short stretches, each with its own bounding circle. */
function chunks(m: MultiLineString, size = 120): Line[] {
  const out: Line[] = [];
  for (const coords of m.coordinates) {
    for (let i = 0; i < coords.length - 1; i += size) {
      const part = coords.slice(i, i + size + 1);
      const line: LineString = { type: "LineString", coordinates: part };
      const centre = geoCentroid(line) as [number, number];
      let radius = 0;
      for (const pt of part) radius = Math.max(radius, geoDistance(centre, pt as [number, number]) * DEG);
      out.push({ line, cap: { centre, radius } });
    }
  }
  return out;
}

function layer(topo: Topology): Layer {
  const obj = topo.objects.countries as GeometryCollection<{ name: string }>;
  const grouped = new Map<string, Position[][][]>();
  for (const f of feature(topo, obj).features) {
    const key = keyOf(f as { id?: string; properties: { name: string } });
    grouped.set(key, [...(grouped.get(key) ?? []), ...polygonsOf(f)]);
  }
  const shapes = [...grouped].map(([key, polys]) => {
    const shape = multi(key, polys);
    const centre = geoCentroid(shape) as [number, number];
    return { key, shape, cap: { centre, radius: reach(centre, polys) } };
  });
  const k = (g: GeometryObject) => keyOf(g as { id?: string; properties?: { name: string } });
  return {
    shapes,
    borders: chunks(mesh(topo, obj, (a, b) => a !== b && k(a) !== k(b))),
    coast: chunks(mesh(topo, obj, (a, b) => a === b)),
  };
}

export function buildWorld(detailTopo: Topology, coarseTopo: Topology): World {
  const detail = layer(detailTopo);
  const info = INFO as Record<string, CountryInfo>;
  const countries = detail.shapes.map(({ key, shape, cap }) => {
    const mainland = mainlandOf(key, polygonsOf(shape));
    const centre = geoCentroid(mainland) as [number, number];
    return { key, info: info[key], shape, mainland, centre, size: reach(centre, polygonsOf(mainland)), cap };
  });
  return { countries, byKey: new Map(countries.map((c) => [c.key, c])), detail, coarse: layer(coarseTopo) };
}

let loading: Promise<World> | null = null;

/** The map data is large, so it is only fetched when a page needs it (and then cached offline like any other script). */
export function loadWorld(): Promise<World> {
  loading ??= Promise.all([import("world-atlas/countries-50m.json"), import("world-atlas/countries-110m.json")]).then(([d, c]) =>
    buildWorld(d.default as unknown as Topology, c.default as unknown as Topology),
  );
  return loading;
}

/** The country at a point on the globe, if any. */
export function countryAt(world: World, lonLat: [number, number]): Country | null {
  for (const c of world.countries) {
    if (geoDistance(c.cap.centre, lonLat) * DEG > c.cap.radius) continue;
    if (geoContains(c.shape, lonLat)) return c;
  }
  return null;
}
