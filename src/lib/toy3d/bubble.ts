import * as THREE from "three";

/** A speech-bubble sprite with text; dispose the returned texture when removing it. */
export function makeBubble(text: string): { sprite: THREE.Sprite; dispose: () => void } {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 200;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.strokeStyle = "#3b2f4a";
  g.lineWidth = 8;
  g.beginPath();
  g.roundRect(12, 12, 488, 140, 44);
  g.fill();
  g.stroke();
  g.beginPath();
  g.moveTo(220, 150);
  g.lineTo(256, 192);
  g.lineTo(290, 150);
  g.fill();
  g.fillStyle = "#3b2f4a";
  g.font = "bold 64px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, 256, 84, 460);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.renderOrder = 10;
  sprite.scale.set(3.6, 1.4, 1);
  return {
    sprite,
    dispose: () => {
      tex.dispose();
      mat.dispose();
    },
  };
}

/** Big outlined word (e.g. a colour name) as a sprite. */
export function makeTitle(text: string, fill: string): { sprite: THREE.Sprite; dispose: () => void } {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 220;
  const g = c.getContext("2d")!;
  g.font = "900 150px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineJoin = "round";
  g.lineWidth = 26;
  g.strokeStyle = "#ffffff";
  g.strokeText(text, 320, 112, 600);
  g.fillStyle = fill;
  g.fillText(text, 320, 112, 600);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.renderOrder = 10;
  sprite.scale.set(5.2, 1.8, 1);
  return {
    sprite,
    dispose: () => {
      tex.dispose();
      mat.dispose();
    },
  };
}
