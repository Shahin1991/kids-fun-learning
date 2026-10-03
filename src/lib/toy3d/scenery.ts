import * as THREE from "three";

const sphere = new THREE.SphereGeometry(1, 20, 14);
const cone = new THREE.ConeGeometry(1, 1, 14);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 10);
const mats = new Map<number, THREE.MeshStandardMaterial>();
const mat = (c: number) => {
  let m = mats.get(c);
  if (!m) mats.set(c, (m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 })));
  return m;
};
const basic = new Map<number, THREE.MeshBasicMaterial>();
const flat = (c: number) => {
  let m = basic.get(c);
  if (!m) basic.set(c, (m = new THREE.MeshBasicMaterial({ color: c })));
  return m;
};

export function addToyLights(scene: THREE.Scene, key = 1.1) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.85 * Math.PI));
  const sun = new THREE.DirectionalLight(0xfff4dc, key * Math.PI);
  sun.position.set(6, 12, 10);
  scene.add(sun);
}

export interface Drifter {
  update(dt: number): void;
}

/** Soft white clouds that drift slowly sideways. */
export function addClouds(scene: THREE.Scene, count: number, y0: number, z0: number): Drifter {
  const clouds: THREE.Group[] = [];
  for (let i = 0; i < count; i++) {
    const c = new THREE.Group();
    for (const [x, y, s] of [[0, 0, 1], [1.1, -0.1, 0.8], [-1.1, -0.15, 0.75], [0.4, 0.5, 0.7]] as const) {
      const m = new THREE.Mesh(sphere, flat(0xffffff));
      m.position.set(x, y, 0);
      m.scale.set(s, s * 0.7, s * 0.6);
      c.add(m);
    }
    c.scale.setScalar(1.4 + Math.random());
    c.position.set(-26 + (i * 52) / count + Math.random() * 4, y0 + Math.random() * 5, z0 - Math.random() * 8);
    clouds.push(c);
    scene.add(c);
  }
  return {
    update(dt) {
      for (const c of clouds) {
        c.position.x += dt * 0.4;
        if (c.position.x > 30) c.position.x = -30;
      }
    },
  };
}

/** Rolling green hills, round trees, flowers and a sun: the "meadow" backdrop. */
export function addMeadow(scene: THREE.Scene): Drifter {
  addToyLights(scene);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 48), mat(0x93dd72));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  for (const [x, z, r, c] of [[-16, -22, 11, 0x7ccf63], [10, -26, 14, 0x6fc45a], [30, -18, 10, 0x84d46a], [-34, -16, 9, 0x76c95f]] as const) {
    const h = new THREE.Mesh(sphere, mat(c));
    h.position.set(x, -r * 0.55, z);
    h.scale.setScalar(r);
    scene.add(h);
  }
  // Trees
  for (const [x, z, s] of [[-13, -12, 1.2], [-8.5, -15, 1], [9, -13, 1.1], [14, -10, 1.3], [-18, -9, 1.4], [19, -16, 1.1]] as const) {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(cyl, mat(0x8a5a3c));
    trunk.scale.set(0.3, 1.6, 0.3);
    trunk.position.y = 0.8;
    t.add(trunk);
    for (const [y, r] of [[2.1, 1.3], [3.0, 1.0]] as const) {
      const leaf = new THREE.Mesh(sphere, mat(0x3fae52));
      leaf.position.y = y;
      leaf.scale.setScalar(r);
      t.add(leaf);
    }
    t.position.set(x, 0, z);
    t.scale.setScalar(s);
    scene.add(t);
  }
  // Flowers
  const heads = new THREE.InstancedMesh(sphere, new THREE.MeshStandardMaterial({ roughness: 0.6 }), 60);
  const stems = new THREE.InstancedMesh(cyl, mat(0x4aa84a), 60);
  const m = new THREE.Matrix4();
  const colors = [0xff6b9a, 0xffd93d, 0xffffff, 0xb583ff, 0xff9f43];
  for (let i = 0; i < 60; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (6 + Math.random() * 22);
    const z = 3 - Math.random() * 14;
    m.compose(new THREE.Vector3(x, 0.22, z), new THREE.Quaternion(), new THREE.Vector3(0.025, 0.44, 0.025));
    stems.setMatrixAt(i, m);
    m.compose(new THREE.Vector3(x, 0.5, z), new THREE.Quaternion(), new THREE.Vector3(0.14, 0.14, 0.14));
    heads.setMatrixAt(i, m);
    heads.setColorAt(i, new THREE.Color(colors[i % colors.length]));
  }
  scene.add(stems, heads);
  const sun = new THREE.Mesh(sphere, flat(0xffe066));
  sun.position.set(14, 15, -40);
  sun.scale.setScalar(3);
  scene.add(sun);
  return addClouds(scene, 6, 9, -22);
}

export { cone as unitCone, cyl as unitCylinder, sphere as unitSphere, mat as toyMaterial };
