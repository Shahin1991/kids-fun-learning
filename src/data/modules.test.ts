import { describe, expect, it } from "vitest";
import { getModulesForSection, HOME_SECTION_ORDER, MODULES } from "./modules";

describe("home sections", () => {
  it("shows every game in exactly one section", () => {
    const shown = HOME_SECTION_ORDER.flatMap((s) => getModulesForSection(s).map((m) => m.id));
    expect(shown.sort()).toEqual(MODULES.map((m) => m.id).sort());
  });

  it("puts the two-player games in Play Together, out of their age band", () => {
    const together = getModulesForSection("together").map((m) => m.id);
    expect(together).toEqual(expect.arrayContaining(["tic-tac-toe", "connect-4", "snakes-ladders", "ludo", "uno", "math-racer", "carrom", "snooker", "darts", "archery"]));
    expect(getModulesForSection("advanced").some((m) => m.together)).toBe(false);
  });
});
