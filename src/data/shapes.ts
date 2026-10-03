export interface ShapeDef {
  id: string;
  label: string;
  color: string;
  /** SVG path in a 100x100 box */
  path: string;
}

export const SHAPES: ShapeDef[] = [
  { id: "circle", label: "Circle", color: "#ff6b6b", path: "M50 8 a42 42 0 1 0 0.01 0 Z" },
  { id: "square", label: "Square", color: "#4d96ff", path: "M10 10 H90 V90 H10 Z" },
  { id: "triangle", label: "Triangle", color: "#6bcb77", path: "M50 8 L94 90 H6 Z" },
  { id: "star", label: "Star", color: "#ffd93d", path: "M50 6 L61 38 L95 38 L67 58 L78 92 L50 71 L22 92 L33 58 L5 38 L39 38 Z" },
  { id: "diamond", label: "Diamond", color: "#9b51e0", path: "M50 4 L94 50 L50 96 L6 50 Z" },
];
