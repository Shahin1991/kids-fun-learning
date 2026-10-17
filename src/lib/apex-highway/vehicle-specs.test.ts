import { describe, expect, it } from "vitest";
import { TRAFFIC_KINDS, VEHICLES, getVehicleSpec } from "./vehicle-specs";

describe("vehicle specs", () => {
  it("every vehicle's body spans its length and its wheels fit inside it", () => {
    for (const v of VEHICLES) {
      const xs = v.body.map((p) => p[0]);
      expect(Math.max(...xs), v.id).toBeCloseTo(v.length / 2, 1);
      expect(Math.min(...xs), v.id).toBeCloseTo(-v.length / 2, 1);
      expect(v.wheelbase / 2 + v.wheelRadius, v.id).toBeLessThan(v.length / 2);
      // The outline starts and ends on the bottom edge, where the wheel arches are cut
      expect(v.body[0][1], v.id).toBeCloseTo(v.body[v.body.length - 1][1], 5);
    }
  });

  it("car glasshouses have four corners and sit on the body", () => {
    // Boxy vehicles (vans, buses) have their own five-point cab outlines
    for (const v of VEHICLES) {
      if (!v.cabin || v.boxes) continue;
      expect(v.cabin, v.id).toHaveLength(4);
      const top = Math.max(...v.body.map((p) => p[1]));
      expect(Math.abs(v.cabin[0][1] - top), v.id).toBeLessThan(0.05);
      expect(v.cabin[1][1], v.id).toBeGreaterThan(top);
    }
  });

  it("look-alikes match the real cars' published size", () => {
    // [length, width, height, wheelbase] in metres
    const real: Record<string, [number, number, number, number]> = {
      "family-suv": [4.6, 1.855, 1.685, 2.69],
      "big-4x4": [4.985, 1.98, 1.925, 2.85],
      "exec-saloon": [4.94, 1.886, 1.457, 2.924],
    };
    for (const [id, [l, w, h, wb]] of Object.entries(real)) {
      const v = getVehicleSpec(id);
      expect(v.id).toBe(id);
      expect(v.length).toBeCloseTo(l, 2);
      expect(v.width).toBeCloseTo(w, 2);
      expect(v.wheelbase).toBeCloseTo(wb, 2);
      // Roof skin sits 2.5 cm above the glasshouse outline
      const roof = Math.max(...v.cabin!.map((p) => p[1])) + 0.025;
      expect(Math.abs(roof - h) / h, id).toBeLessThan(0.05);
    }
  });

  it("uses generic names and puts the look-alikes in traffic", () => {
    for (const v of VEHICLES) expect(v.name).not.toMatch(/toyota|rav4|land cruiser|audi|a6/i);
    expect(TRAFFIC_KINDS).toEqual(expect.arrayContaining(["family-suv", "exec-saloon"]));
  });
});
