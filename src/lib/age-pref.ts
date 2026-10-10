import type { AgeGroup } from "@/data/modules";

export type AgeChoice = AgeGroup | "all";
const KEY = "kids-age";

export function readAgePref(): AgeChoice | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "toddler" || v === "early-learning" || v === "advanced" || v === "others" || v === "all" ? v : null;
  } catch {
    return null;
  }
}

export function saveAgePref(v: AgeChoice) {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    // storage can be blocked; the picker will simply show again next time
  }
}
