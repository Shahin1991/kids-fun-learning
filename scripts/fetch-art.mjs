// One-off: downloads Twemoji (CC-BY 4.0) SVGs into public/art. The SVGs are committed, so builds need no network.
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = "https://raw.githubusercontent.com/jdecked/twemoji/main/assets/svg";
const ART = {
  animals: { dog: "1f436", cat: "1f431", cow: "1f42e", duck: "1f986", pig: "1f437", sheep: "1f411", lion: "1f981", frog: "1f438", horse: "1f434", chick: "1f425" },
  vehicles: {
    car: "1f697", bus: "1f68c", fire: "1f692", ambulance: "1f691", police: "1f693", tractor: "1f69c", truck: "1f69a", bike: "1f6b2",
    plane: "2708", helicopter: "1f681", rocket: "1f680", balloon: "1f388", train: "1f682", metro: "1f687", ship: "1f6a2", boat: "26f5",
  },
  flags: {
    us: "1f1fa-1f1f8", gb: "1f1ec-1f1e7", fr: "1f1eb-1f1f7", de: "1f1e9-1f1ea", it: "1f1ee-1f1f9", jp: "1f1ef-1f1f5",
    cn: "1f1e8-1f1f3", in: "1f1ee-1f1f3", br: "1f1e7-1f1f7", ca: "1f1e8-1f1e6", au: "1f1e6-1f1fa", eg: "1f1ea-1f1ec",
  },
  countries: { france: "1f5fc", egypt: "1f3dc", japan: "1f5fb", india: "1f54c", brazil: "1f99c", australia: "1f998", italy: "1f355", kenya: "1f992" },
  continents: { africa: "1f981", asia: "1f43c", europe: "1f3f0", "north-america": "1f985", "south-america": "1f999", oceania: "1f428", antarctica: "1f427" },
  space: { sun: "2600", earth: "1f30d", moon: "1f319", mars: "1f534", saturn: "1fa90", comet: "2604", rocket: "1f680", star: "2b50" },
  plants: { seed: "1f330", sprout: "1f331", sunflower: "1f33b", tree: "1f333", cactus: "1f335", mushroom: "1f344", tomato: "1f345" },
  weather: { sunny: "2600", rain: "1f327", storm: "26c8", snow: "2744", rainbow: "1f308", wind: "1f4a8", fog: "1f32b" },
};

for (const [group, items] of Object.entries(ART)) {
  mkdirSync(`public/art/${group}`, { recursive: true });
  for (const [id, cp] of Object.entries(items)) {
    const res = await fetch(`${BASE}/${cp}.svg`);
    if (!res.ok) throw new Error(`${id}: HTTP ${res.status}`);
    writeFileSync(`public/art/${group}/${id}.svg`, await res.text());
  }
}
console.log("done");
