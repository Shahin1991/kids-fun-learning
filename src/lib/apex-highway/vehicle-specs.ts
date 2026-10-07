// Pure data: dimensions in metres, profile points are [x along length (front +), y up].
export type VehicleKind = "sedan" | "coupe" | "suv" | "pickup" | "van" | "bus" | "police" | "police-uae" | "ambulance" | "fire";
type Pt = [number, number];

export interface BoxSpec {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  /** How far the top edge is pulled in at the front / rear, so the box is raked rather than square */
  rakeFront?: number;
  rakeRear?: number;
}

export interface VehicleSpec {
  id: VehicleKind;
  name: string;
  length: number;
  width: number;
  wheelbase: number;
  wheelRadius: number;
  body: Pt[];
  cabin?: Pt[];
  /** Painted upper boxes (van cargo, bus body) */
  boxes?: BoxSpec[];
  /** Dark side-window strips */
  windows?: BoxSpec[];
  features: {
    spoiler?: boolean;
    roofRack?: boolean;
    bed?: boolean;
    cargo?: boolean;
    busUnits?: boolean;
    stripe?: boolean;
    ladder?: boolean;
    /** Flashing red/blue light bar at (u along length, y) */
    lightbar?: { u: number; y: number };
    livery?: "police" | "police-uae" | "ambulance" | "fire";
    /** H plays a siren instead of the horn */
    siren?: boolean;
  };
  /** Front windscreen slab for boxy bodies */
  frontGlass?: { u: number; y: number; w: number; h: number };
  driver: { x: number; y: number; z: number };
  topSpeedKmh: number;
  accel: number;
  brake: number;
  /** Max steering lock in radians at standstill */
  lock: number;
  rating: { speed: number; accel: number; brake: number; steer: number };
  engine: { base: number; filter: number; wave: OscillatorType; rpmRange: number };
  defaultColor: string;
}

export const VEHICLES: VehicleSpec[] = [
  {
    id: "sedan", name: "Sedan", length: 4.7, width: 1.85, wheelbase: 2.8, wheelRadius: 0.33,
    body: [[-2.35, 0.38], [-2.35, 0.88], [-2.0, 0.98], [1.2, 0.98], [2.0, 0.85], [2.35, 0.7], [2.35, 0.38]],
    cabin: [[-1.25, 0.98], [-0.85, 1.5], [0.6, 1.5], [1.25, 0.98]],
    features: {}, driver: { x: -0.4, y: 1.15, z: 0.1 },
    topSpeedKmh: 190, accel: 5.5, brake: 9, lock: 0.5,
    rating: { speed: 0.6, accel: 0.55, brake: 0.65, steer: 0.65 },
    engine: { base: 55, filter: 900, wave: "sawtooth", rpmRange: 2.6 }, defaultColor: "#3a6ee8",
  },
  {
    id: "coupe", name: "Sports Coupe", length: 4.4, width: 1.95, wheelbase: 2.6, wheelRadius: 0.34,
    body: [[-2.2, 0.32], [-2.2, 0.78], [-1.9, 0.88], [1.0, 0.88], [2.0, 0.7], [2.2, 0.55], [2.2, 0.32]],
    cabin: [[-1.0, 0.88], [-0.4, 1.22], [0.45, 1.22], [1.05, 0.88]],
    features: { spoiler: true }, driver: { x: -0.42, y: 0.95, z: 0.0 },
    topSpeedKmh: 280, accel: 9, brake: 11, lock: 0.55,
    rating: { speed: 1, accel: 1, brake: 0.9, steer: 0.9 },
    engine: { base: 70, filter: 1600, wave: "sawtooth", rpmRange: 3.2 }, defaultColor: "#e53935",
  },
  {
    id: "suv", name: "SUV", length: 4.8, width: 1.95, wheelbase: 2.9, wheelRadius: 0.38,
    body: [[-2.4, 0.45], [-2.4, 1.15], [-2.2, 1.2], [1.3, 1.2], [2.2, 1.05], [2.4, 0.85], [2.4, 0.45]],
    cabin: [[-2.15, 1.2], [-2.0, 1.85], [0.5, 1.85], [1.3, 1.2]],
    features: { roofRack: true }, driver: { x: -0.45, y: 1.45, z: 0.1 },
    topSpeedKmh: 200, accel: 5, brake: 8.5, lock: 0.48,
    rating: { speed: 0.65, accel: 0.5, brake: 0.6, steer: 0.5 },
    engine: { base: 48, filter: 800, wave: "sawtooth", rpmRange: 2.4 }, defaultColor: "#2e7d32",
  },
  {
    id: "pickup", name: "Pickup", length: 5.4, width: 2.0, wheelbase: 3.3, wheelRadius: 0.4,
    body: [[-2.7, 0.45], [-2.7, 1.1], [1.9, 1.1], [2.5, 0.95], [2.7, 0.8], [2.7, 0.45]],
    cabin: [[-0.8, 1.1], [-0.55, 1.75], [0.55, 1.75], [1.3, 1.1]],
    features: { bed: true }, driver: { x: -0.45, y: 1.45, z: 0.0 },
    topSpeedKmh: 180, accel: 4.5, brake: 8, lock: 0.45,
    rating: { speed: 0.55, accel: 0.45, brake: 0.55, steer: 0.45 },
    engine: { base: 40, filter: 700, wave: "square", rpmRange: 2.2 }, defaultColor: "#f9a825",
  },
  {
    id: "van", name: "Cargo Van", length: 5.3, width: 2.0, wheelbase: 3.2, wheelRadius: 0.38,
    body: [[-2.65, 0.4], [-2.65, 1.0], [2.2, 1.0], [2.65, 0.85], [2.65, 0.4]],
    cabin: [[0.7, 1.0], [0.7, 2.2], [1.15, 2.2], [2.05, 1.3], [2.2, 1.0]],
    boxes: [{ x0: -2.65, x1: 0.7, y0: 1.0, y1: 2.5, rakeRear: 0.12 }],
    windows: [{ x0: 0.85, x1: 1.5, y0: 1.5, y1: 2.0 }],
    features: { cargo: true }, driver: { x: -0.5, y: 1.7, z: 1.2 },
    topSpeedKmh: 150, accel: 3.5, brake: 7.5, lock: 0.42,
    rating: { speed: 0.4, accel: 0.35, brake: 0.5, steer: 0.4 },
    engine: { base: 45, filter: 650, wave: "triangle", rpmRange: 2.0 }, defaultColor: "#eceff1",
  },
  {
    id: "bus", name: "City Bus", length: 9, width: 2.5, wheelbase: 5.6, wheelRadius: 0.5,
    body: [[-4.5, 0.45], [-4.5, 1.0], [4.5, 1.0], [4.5, 0.45]],
    boxes: [{ x0: -4.5, x1: 4.5, y0: 1.0, y1: 3.1, rakeFront: 0.3, rakeRear: 0.15 }],
    windows: [{ x0: -4.0, x1: 3.3, y0: 1.7, y1: 2.6 }],
    frontGlass: { u: 4.5, y: 2.2, w: 2.2, h: 0.9 },
    features: { busUnits: true, stripe: true }, driver: { x: -0.8, y: 1.9, z: -3.5 },
    topSpeedKmh: 110, accel: 2.2, brake: 7, lock: 0.34,
    rating: { speed: 0.25, accel: 0.2, brake: 0.4, steer: 0.25 },
    engine: { base: 32, filter: 520, wave: "sawtooth", rpmRange: 1.8 }, defaultColor: "#ff7043",
  },
  {
    id: "police", name: "Police (US)", length: 4.8, width: 1.9, wheelbase: 2.85, wheelRadius: 0.34,
    body: [[-2.4, 0.38], [-2.4, 0.9], [-2.05, 1.0], [1.25, 1.0], [2.05, 0.87], [2.4, 0.72], [2.4, 0.38]],
    cabin: [[-1.3, 1.0], [-0.9, 1.52], [0.6, 1.52], [1.3, 1.0]],
    features: { lightbar: { u: -0.15, y: 1.6 }, livery: "police", siren: true }, driver: { x: -0.4, y: 1.15, z: 0.1 },
    topSpeedKmh: 230, accel: 7.5, brake: 10, lock: 0.52,
    rating: { speed: 0.82, accel: 0.78, brake: 0.8, steer: 0.75 },
    engine: { base: 62, filter: 1300, wave: "sawtooth", rpmRange: 2.9 }, defaultColor: "#16181c",
  },
  {
    id: "police-uae", name: "Police (UAE)", length: 4.8, width: 1.9, wheelbase: 2.85, wheelRadius: 0.34,
    body: [[-2.4, 0.38], [-2.4, 0.9], [-2.05, 1.0], [1.25, 1.0], [2.05, 0.87], [2.4, 0.72], [2.4, 0.38]],
    cabin: [[-1.3, 1.0], [-0.9, 1.52], [0.6, 1.52], [1.3, 1.0]],
    features: { lightbar: { u: -0.15, y: 1.6 }, livery: "police-uae", siren: true }, driver: { x: -0.4, y: 1.15, z: 0.1 },
    topSpeedKmh: 230, accel: 7.5, brake: 10, lock: 0.52,
    rating: { speed: 0.82, accel: 0.78, brake: 0.8, steer: 0.75 },
    engine: { base: 62, filter: 1300, wave: "sawtooth", rpmRange: 2.9 }, defaultColor: "#f4f6f8",
  },
  {
    id: "ambulance", name: "Ambulance", length: 5.6, width: 2.05, wheelbase: 3.4, wheelRadius: 0.38,
    body: [[-2.8, 0.42], [-2.8, 1.0], [2.3, 1.0], [2.8, 0.85], [2.8, 0.42]],
    cabin: [[0.9, 1.0], [0.9, 2.15], [1.3, 2.15], [2.15, 1.3], [2.3, 1.0]],
    boxes: [{ x0: -2.8, x1: 0.9, y0: 1.0, y1: 2.55, rakeRear: 0.2 }],
    windows: [{ x0: 0.95, x1: 1.6, y0: 1.5, y1: 2.0 }],
    features: { lightbar: { u: 1.1, y: 2.25 }, livery: "ambulance", siren: true }, driver: { x: -0.5, y: 1.7, z: 1.2 },
    topSpeedKmh: 170, accel: 4.2, brake: 8, lock: 0.42,
    rating: { speed: 0.5, accel: 0.42, brake: 0.55, steer: 0.4 },
    engine: { base: 48, filter: 700, wave: "sawtooth", rpmRange: 2.1 }, defaultColor: "#f4f6f8",
  },
  {
    id: "fire", name: "Fire Engine", length: 8, width: 2.5, wheelbase: 4.6, wheelRadius: 0.5,
    body: [[-4.0, 0.5], [-4.0, 1.1], [4.0, 1.1], [4.0, 0.5]],
    boxes: [{ x0: -4.0, x1: 0.5, y0: 1.1, y1: 2.5, rakeRear: 0.12 }, { x0: 0.6, x1: 3.7, y0: 1.1, y1: 2.7, rakeFront: 0.45 }],
    windows: [{ x0: 0.9, x1: 3.3, y0: 1.75, y1: 2.45 }],
    frontGlass: { u: 3.7, y: 2.15, w: 2.2, h: 0.8 },
    features: { ladder: true, lightbar: { u: 2.2, y: 2.78 }, livery: "fire", siren: true }, driver: { x: -0.6, y: 2.3, z: -2.3 },
    topSpeedKmh: 120, accel: 2.8, brake: 7.5, lock: 0.36,
    rating: { speed: 0.3, accel: 0.25, brake: 0.45, steer: 0.3 },
    engine: { base: 36, filter: 560, wave: "sawtooth", rpmRange: 1.9 }, defaultColor: "#d32f2f",
  },
];

export const PAINT_SWATCHES = [
  "#e53935", "#d81b60", "#8e24aa", "#3949ab", "#3a6ee8", "#039be5", "#00acc1",
  "#2e7d32", "#7cb342", "#f9a825", "#fb8c00", "#eceff1", "#607d8b", "#212121",
];

export function getVehicleSpec(id: string): VehicleSpec {
  return VEHICLES.find((v) => v.id === id) ?? VEHICLES[0];
}

export const TRAFFIC_KINDS: VehicleKind[] = ["sedan", "suv", "van", "pickup", "bus"];
export const EMERGENCY_KINDS: VehicleKind[] = ["police", "police-uae", "ambulance", "fire"];
