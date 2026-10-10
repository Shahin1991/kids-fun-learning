import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { ARCHETYPES, buildNature, buildingGeometry, makeTreeKit, ridgeGeometry, ridgeHeights, rng, skylineGeometry } from "./scenery";

const finite = (a: ArrayLike<number>) => Array.from(a).every(Number.isFinite);

describe("scenery generators", () => {
  it("rng is deterministic and in range", () => {
    const a = rng(5);
    const b = rng(5);
    for (let i = 0; i < 20; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("mountain ranges have real relief and stay within bounds", () => {
    for (const seed of [1, 2, 3]) {
      const hs = ridgeHeights(2000, 200, seed, 4);
      expect(finite(hs)).toBe(true);
      expect(Math.max(...hs)).toBeLessThan(200 * 1.5);
      expect(Math.min(...hs)).toBeGreaterThan(0);
      expect(Math.max(...hs) - Math.min(...hs)).toBeGreaterThan(200 * 0.25);
    }
  });

  it("ridge geometry is consistent, finite and has snow on the high points", () => {
    const g = ridgeGeometry(1000, 200, 1, 120);
    const pos = g.attributes.position.array;
    const col = g.attributes.color.array;
    expect(finite(pos) && finite(col)).toBe(true);
    expect(pos.length).toBe(col.length);
    expect(g.index!.count % 3).toBe(0);
    expect(Math.max(...Array.from(col))).toBeGreaterThan(1.0); // snow is brighter than the base colour
  });

  it("tree kit builds non-empty, finite geometry for every species", () => {
    const kit = makeTreeKit();
    for (const g of Object.values(kit)) {
      expect(g.attributes.position.count).toBeGreaterThan(8);
      expect(finite(g.attributes.position.array)).toBe(true);
    }
  });

  it("nature layout covers the whole period with finite transforms", () => {
    const { group } = buildNature({ period: 120, copies: 4, origin: 30 });
    expect(group.children.length).toBeGreaterThan(5);
    for (const c of group.children) {
      const m = c as THREE.InstancedMesh;
      expect(m.count).toBeGreaterThan(0);
      expect(finite(m.instanceMatrix.array)).toBe(true);
      // Every instance sits inside the repeated span (so recycling by the period is seamless).
      const p = new THREE.Vector3();
      const mat = new THREE.Matrix4();
      for (let i = 0; i < m.count; i++) {
        m.getMatrixAt(i, mat);
        p.setFromMatrixPosition(mat);
        expect(p.z).toBeLessThanOrEqual(30);
        expect(p.z).toBeGreaterThan(30 - 4 * 120 - 1);
      }
    }
  });

  it("building boxes tile windows at a constant size", () => {
    for (const a of ARCHETYPES) {
      const g = buildingGeometry(a);
      const uv = g.attributes.uv;
      expect(finite(uv.array)).toBe(true);
      // The +x face (vertices 0-3) spans depth/12 across and height/10.5 up.
      let maxU = 0;
      let maxV = 0;
      for (let i = 0; i < 4; i++) {
        maxU = Math.max(maxU, uv.getX(i));
        maxV = Math.max(maxV, uv.getY(i));
      }
      expect(maxU).toBeCloseTo(a.d / 12, 5);
      expect(maxV).toBeCloseTo(a.h / 10.5, 5);
    }
  });

  it("skyline builds towers and night lights", () => {
    const { geo, lights } = skylineGeometry(900, 4, 25, 100);
    expect(geo.attributes.position.count).toBeGreaterThan(100);
    expect(finite(geo.attributes.position.array)).toBe(true);
    expect(lights.attributes.position.count).toBeGreaterThan(10);
  });
});
