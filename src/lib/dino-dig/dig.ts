/** Pure rules for Dino Dig: the dinosaurs, where their bones are buried, and when a bone counts as found. */

export interface BonePiece {
  id: string;
  name: string;
  kind: "skull" | "bone";
  /** Where the bone sits in the assembled skeleton (400 x 240 box): centre, length, angle in degrees */
  x: number;
  y: number;
  len: number;
  rot: number;
}

export interface Dino {
  id: string;
  name: string;
  emoji: string;
  fact: string;
  bones: BonePiece[];
}

export const DINOS: Dino[] = [
  {
    id: "trex",
    name: "T. rex",
    emoji: "🦖",
    fact: "T. rex had teeth as big as bananas!",
    bones: [
      { id: "skull", name: "skull", kind: "skull", x: 300, y: 70, len: 90, rot: 0 },
      { id: "back", name: "backbone", kind: "bone", x: 200, y: 110, len: 150, rot: 10 },
      { id: "tail", name: "tail bone", kind: "bone", x: 85, y: 140, len: 130, rot: 20 },
      { id: "leg1", name: "leg bone", kind: "bone", x: 180, y: 180, len: 90, rot: 80 },
      { id: "leg2", name: "leg bone", kind: "bone", x: 225, y: 180, len: 90, rot: 100 },
    ],
  },
  {
    id: "brachio",
    name: "Brachiosaurus",
    emoji: "🦕",
    fact: "Brachiosaurus had a neck as long as a bus!",
    bones: [
      { id: "skull", name: "skull", kind: "skull", x: 330, y: 40, len: 60, rot: 0 },
      { id: "neck", name: "neck bone", kind: "bone", x: 285, y: 85, len: 120, rot: -60 },
      { id: "back", name: "backbone", kind: "bone", x: 190, y: 130, len: 140, rot: 0 },
      { id: "tail", name: "tail bone", kind: "bone", x: 80, y: 150, len: 110, rot: 15 },
      { id: "leg1", name: "leg bone", kind: "bone", x: 160, y: 190, len: 80, rot: 90 },
      { id: "leg2", name: "leg bone", kind: "bone", x: 230, y: 190, len: 80, rot: 90 },
    ],
  },
];

export interface Buried {
  id: string;
  x: number;
  y: number;
  rot: number;
}

/** Bones buried in a 400 x 260 dig, spread out so they don't overlap: one per cell of a jittered grid. */
export function buryBones(dino: Dino, r: () => number = Math.random): Buried[] {
  const cells = [0, 1, 2, 3, 4, 5].sort(() => r() - 0.5);
  return dino.bones.map((b, i) => {
    const c = cells[i];
    const cx = 75 + (c % 3) * 125;
    const cy = 75 + Math.floor(c / 3) * 115;
    return { id: b.id, x: cx + (r() - 0.5) * 30, y: cy + (r() - 0.5) * 24, rot: Math.round((r() - 0.5) * 120) };
  });
}

/** How much of a bone is uncovered: the share of the bone's cells where the sand is gone. */
export function uncovered(bone: ArrayLike<number>, sand: ArrayLike<number>): number {
  let cells = 0;
  let clear = 0;
  for (let i = 0; i < bone.length; i++) {
    if (bone[i] < 128) continue;
    cells++;
    if (sand[i] < 64) clear++;
  }
  return cells ? clear / cells : 0;
}

export const FOUND_AT = 0.6;
