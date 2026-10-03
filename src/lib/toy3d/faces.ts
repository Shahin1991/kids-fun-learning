export type Emotion = "happy" | "sad" | "angry" | "surprised" | "sleepy" | "silly" | "loved" | "scared";

export const EMOTION_IDS: Emotion[] = ["happy", "sad", "angry", "surprised", "sleepy", "silly", "loved", "scared"];

const SKIN: Record<Emotion, [string, string]> = {
  happy: ["#ffe45e", "#ffc93c"],
  sad: ["#bcd9ff", "#8fb8f0"],
  angry: ["#ff9b8a", "#ec5b4a"],
  surprised: ["#ffe9a0", "#ffcf5a"],
  sleepy: ["#d9ccff", "#b4a2f0"],
  silly: ["#b8f0a0", "#7edc66"],
  loved: ["#ffc2d4", "#ff8fb0"],
  scared: ["#d5f2dd", "#a7dcb8"],
};

export function skinColor(e: Emotion) {
  return SKIN[e][1];
}

/**
 * Draws the face on an equirectangular canvas: the front of a sphere is the centre of the
 * left quarter (x = 256 on a 1024x512 canvas), where pixels are not stretched.
 */
export function drawFace(ctx: CanvasRenderingContext2D, e: Emotion) {
  const [a, b] = SKIN[e];
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, a);
  grad.addColorStop(1, b);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  ctx.save();
  ctx.translate(256, 256);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const ink = "#3b2f4a";
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = 14;

  const roundEye = (x: number, r = 22, pupil = 0.55) => {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(x, -22, r, r * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc(x, -20, r * pupil, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x + r * 0.18, -28, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 14;
  };
  const cheeks = () => {
    ctx.fillStyle = "rgba(255,110,140,0.45)";
    for (const x of [-92, 92]) {
      ctx.beginPath();
      ctx.ellipse(x, 28, 22, 13, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = ink;
  };
  const brow = (x: number, tilt: number, y = -66) => {
    ctx.beginPath();
    ctx.moveTo(x - 28, y + tilt);
    ctx.lineTo(x + 28, y - tilt);
    ctx.stroke();
  };
  const smile = (w: number, depth: number, y = 38) => {
    ctx.beginPath();
    ctx.moveTo(-w, y);
    ctx.quadraticCurveTo(0, y + depth, w, y);
    ctx.stroke();
  };

  switch (e) {
    case "happy":
      for (const x of [-48, 48]) {
        ctx.beginPath();
        ctx.arc(x, -18, 24, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      }
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.moveTo(-52, 28);
      ctx.quadraticCurveTo(0, 112, 52, 28);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ff7a8a";
      ctx.beginPath();
      ctx.ellipse(0, 62, 22, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      cheeks();
      break;
    case "sad":
      roundEye(-48, 20, 0.7);
      roundEye(48, 20, 0.7);
      brow(-48, 14);
      brow(48, -14);
      ctx.beginPath();
      ctx.moveTo(-36, 62);
      ctx.quadraticCurveTo(0, 26, 36, 62);
      ctx.stroke();
      break;
    case "angry":
      roundEye(-48, 18, 0.6);
      roundEye(48, 18, 0.6);
      brow(-48, -16, -56);
      brow(48, 16, -56);
      ctx.beginPath();
      ctx.moveTo(-40, 64);
      ctx.quadraticCurveTo(0, 38, 40, 64);
      ctx.stroke();
      break;
    case "surprised":
      roundEye(-48, 28, 0.35);
      roundEye(48, 28, 0.35);
      brow(-48, 0, -84);
      brow(48, 0, -84);
      ctx.beginPath();
      ctx.ellipse(0, 62, 22, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "sleepy":
      for (const x of [-48, 48]) {
        ctx.beginPath();
        ctx.arc(x, -26, 24, Math.PI * 0.1, Math.PI * 0.9);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.ellipse(0, 58, 16, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      cheeks();
      break;
    case "silly":
      roundEye(-52, 24, 0.5);
      roundEye(50, 14, 0.7);
      smile(54, 52);
      ctx.fillStyle = "#ff6f91";
      ctx.beginPath();
      ctx.roundRect(8, 44, 38, 56, 18);
      ctx.fill();
      ctx.stroke();
      break;
    case "loved": {
      const heart = (x: number) => {
        ctx.fillStyle = "#ff3d6e";
        ctx.beginPath();
        ctx.moveTo(x, -4);
        ctx.bezierCurveTo(x - 46, -40, x - 22, -70, x, -46);
        ctx.bezierCurveTo(x + 22, -70, x + 46, -40, x, -4);
        ctx.fill();
      };
      heart(-48);
      heart(48);
      ctx.fillStyle = ink;
      smile(46, 60, 34);
      cheeks();
      break;
    }
    case "scared":
      roundEye(-48, 26, 0.28);
      roundEye(48, 26, 0.28);
      brow(-48, 10, -80);
      brow(48, -10, -80);
      ctx.beginPath();
      ctx.moveTo(-40, 64);
      for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(-40 + i * 20 + 10, 52 + (i % 2 ? 10 : -10), -40 + (i + 1) * 20, 64);
      ctx.stroke();
      break;
  }
  ctx.restore();
}
