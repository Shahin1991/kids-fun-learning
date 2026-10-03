import * as THREE from "three";

/** Renderer, scene and camera with strict teardown, shared by the simple 3D games. */
export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private extraDispose: (() => void)[] = [];

  constructor(private container: HTMLElement, background: number, fov = 45) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none";
    container.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color(background);
    this.camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 200);
  }

  get aspect() {
    return this.camera.aspect;
  }

  /** Resizes the canvas and returns the new aspect ratio. */
  resize(): number {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    return this.camera.aspect;
  }

  /** Half the visible width at a given distance from the camera. */
  halfWidthAt(distance: number) {
    return Math.tan((this.camera.fov * Math.PI) / 360) * distance * this.camera.aspect;
  }

  halfHeightAt(distance: number) {
    return Math.tan((this.camera.fov * Math.PI) / 360) * distance;
  }

  onDispose(fn: () => void) {
    this.extraDispose.push(fn);
  }

  dispose() {
    this.extraDispose.forEach((f) => f());
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Line) {
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: THREE.Material) => m.dispose());
      }
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
