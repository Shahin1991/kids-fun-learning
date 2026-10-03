// One-off: downloads Twemoji (CC-BY 4.0) SVGs into public/art. The SVGs are committed, so builds need no network.
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = "https://raw.githubusercontent.com/jdecked/twemoji/main/assets/svg";
const ART = {
  animals: { dog: "1f436", cat: "1f431", cow: "1f42e", duck: "1f986", pig: "1f437", sheep: "1f411", lion: "1f981", frog: "1f438", horse: "1f434", chick: "1f425" },
  vehicles: {
    car: "1f697", bus: "1f68c", fire: "1f692", ambulance: "1f691", police: "1f693", tractor: "1f69c", truck: "1f69a", bike: "1f6b2",
    plane: "2708", helicopter: "1f681", rocket: "1f680", balloon: "1f388", train: "1f682", metro: "1f687", ship: "1f6a2", boat: "26f5",
  },
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
