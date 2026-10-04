import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { bestEdge, edgePolygon, floorFrame, hingeFrame, insetPolygon, sameEdge, worldEdges } from "./geometry";

const close = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(eps);

describe("magna tile geometry", () => {
  it("puts the hinge edge on the x axis for every edge", () => {
    for (const shape of ["square", "triangle", "rect"] as const) {
      for (let k = 0; k < (shape === "triangle" ? 3 : 4); k++) {
        const p = edgePolygon(shape, k);
        close(p[0][1], 0);
        close(p[1][1], 0);
        close(p[0][0], -p[1][0]);
        expect(p.every(([, y]) => y >= -1e-9)).toBe(true);
      }
    }
  });

  it("a flat hinge continues the tile in the same plane", () => {
    const f = floorFrame(0, 0);
    const edges = worldEdges(edgePolygon("square", 0), f);
    const flat = hingeFrame(edges[0], f.z, 180, 1);
    close(flat.z.dot(f.z), 1);
    // the new tile lies beyond the shared edge
    const beyond = worldEdges(edgePolygon("square", 0), flat);
    expect(beyond.some((e) => sameEdge(e, edges[0]))).toBe(true);
    for (const e of beyond) close(e.mid.y, 0.03);
  });

  it("a 90 degree hinge makes a wall", () => {
    const f = floorFrame(0, 0);
    const edges = worldEdges(edgePolygon("square", 0), f);
    const wall = hingeFrame(edges[0], f.z, 90, 1);
    close(Math.abs(wall.z.dot(f.z)), 0);
    const top = worldEdges(edgePolygon("square", 0), wall).reduce((m, e) => Math.max(m, e.mid.y), 0);
    close(top, 1.03, 1e-5);
  });

  it("four 55 degree triangles meet in a pyramid apex", () => {
    const f = floorFrame(0, 0);
    const base = worldEdges(edgePolygon("square", 0), f);
    const apexes = base.map((e) => {
      const fr = hingeFrame(e, f.z, 54.74, 1);
      const tri = edgePolygon("triangle", 0);
      return fr.origin.clone().addScaledVector(fr.x, tri[2][0]).addScaledVector(fr.y, tri[2][1]);
    });
    for (const a of apexes) expect(a.distanceTo(apexes[0])).toBeLessThan(0.01);
  });

  it("picks the long edge of a rectangle for a long hinge", () => {
    expect(bestEdge("rect", 2)).toBe(1);
    expect(bestEdge("rect", 1)).toBe(0);
    expect(bestEdge("square", 1)).toBe(0);
  });

  it("insets a polygon evenly", () => {
    const sq = insetPolygon([[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]], 0.1);
    close(sq[0][0], -0.4);
    close(sq[2][1], 0.4);
    const t = new THREE.Vector2(sq[1][0], sq[1][1]);
    expect(t.x).toBeLessThan(0.5);
  });
});
