import type { IUniform, Material, Object3D } from "three";

/** Shared by every bent material; positive bends the road to the right. */
export const bendUniform: IUniform<number> = { value: 0 };

const MAX_BEND = 0.0009;
const BEND_LINE = "mvPosition.x += uBend * mvPosition.z * mvPosition.z;\n";

/** Road curvature as a function of distance driven: straight stretches between smooth left and right bends. */
export function curvatureAt(distance: number): number {
  const s = Math.sin(distance / 650) * 0.6 + Math.sin(distance / 240 + 1.7) * 0.4;
  const a = Math.max(0, Math.abs(s) - 0.25) / 0.75;
  return Math.sign(s) * a * a * (3 - 2 * a) * MAX_BEND;
}

interface PatchableShader {
  vertexShader: string;
  uniforms: Record<string, IUniform>;
}

function patch(shader: PatchableShader, sprite: boolean) {
  shader.uniforms.uBend = bendUniform;
  const body = sprite
    ? shader.vertexShader.replace("gl_Position = projectionMatrix * mvPosition;", `${BEND_LINE}gl_Position = projectionMatrix * mvPosition;`)
    : shader.vertexShader.replace("#include <project_vertex>", `#include <project_vertex>\n${BEND_LINE}gl_Position = projectionMatrix * mvPosition;`);
  shader.vertexShader = `uniform float uBend;\n${body}`;
}

/**
 * Bends everything under `root` along the road curve in view space.
 * Purely visual: lanes, traffic and collisions keep working on the straight logical road.
 */
export function applyBend(root: Object3D) {
  root.traverse((o) => {
    const obj = o as unknown as { isMesh?: boolean; isSprite?: boolean; material?: Material | Material[] };
    if (!obj.isMesh && !obj.isSprite) return;
    const sprite = Boolean(obj.isSprite);
    for (const m of Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : []) {
      if (m.userData.bent) continue;
      m.userData.bent = true;
      m.onBeforeCompile = (shader) => patch(shader, sprite);
      m.customProgramCacheKey = () => (sprite ? "bend-sprite" : "bend-mesh");
    }
  });
}
