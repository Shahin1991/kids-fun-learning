// Builds src/data/world-countries.json: name, capital, continent and flag for every shape in the
// world-atlas map (Natural Earth), keyed the way src/lib/world/world.ts looks them up.
// Run after upgrading world-atlas or world-countries: node scripts/build-world.mjs
import { readFileSync, writeFileSync } from "node:fs";

const topo = JSON.parse(readFileSync("node_modules/world-atlas/countries-50m.json", "utf8"));
const countries = JSON.parse(readFileSync("node_modules/world-countries/countries.json", "utf8"));
const byNumber = new Map(countries.map((c) => [c.ccn3, c]));

/** Shapes the map has without an ISO number. Somaliland and Northern Cyprus join the UN member they belong to. */
const NO_ID = {
  Somaliland: "706",
  "N. Cyprus": "196",
  Kosovo: "XK",
  "Indian Ocean Ter.": "IOT",
  "Siachen Glacier": "SIA",
};
const EXTRA = {
  XK: { ...pick(countries.find((c) => c.cca2 === "XK")) },
  IOT: { name: "Australian Indian Ocean Territories", capital: "", continent: "Oceania", flag: "🇦🇺", area: 150, un: false },
  SIA: { name: "Siachen Glacier", capital: "", continent: "Asia", flag: "", area: 700, un: false },
};

function continentOf(c) {
  if (c.region === "Americas") return c.subregion === "South America" ? "South America" : "North America";
  if (c.region === "Antarctic") return "Antarctica";
  return c.region;
}

function pick(c) {
  return { name: c.name.common, capital: c.capital?.[0] ?? "", continent: continentOf(c), flag: c.flag ?? "", area: Math.round(c.area), un: !!c.unMember };
}

const out = {};
for (const g of topo.objects.countries.geometries) {
  const key = g.id ?? NO_ID[g.properties.name];
  if (!key) throw new Error(`No key for ${g.properties.name}`);
  if (out[key]) continue;
  const c = byNumber.get(key);
  out[key] = c ? pick(c) : EXTRA[key];
  if (!out[key]) throw new Error(`No data for ${key} ${g.properties.name}`);
}

writeFileSync("src/data/world-countries.json", JSON.stringify(out, null, 0).replace(/\},"/g, '},\n"') + "\n");
console.log(`${Object.keys(out).length} countries and territories written`);
