/** Pure rules for My Lunchbox: food groups (CBSE EVS "Food we eat"), the tray, and packing one of each. */

export type GroupId = "grain" | "protein" | "fruit" | "veg" | "drink";

export interface FoodGroup {
  id: GroupId;
  name: string;
  color: string;
  /** "gives you energy to run and play" */
  why: string;
}

export interface Food {
  id: string;
  name: string;
  emoji: string;
  /** Treats are "sometimes food" and stay out of the lunchbox */
  group: GroupId | "treat";
}

export const GROUPS: FoodGroup[] = [
  { id: "grain", name: "energy food", color: "#ffc93c", why: "gives you energy to run and play" },
  { id: "protein", name: "body-building food", color: "#ff8a65", why: "helps your muscles grow strong" },
  { id: "fruit", name: "fruit", color: "#ff6b9a", why: "is full of vitamins" },
  { id: "veg", name: "vegetables", color: "#6bcb77", why: "protects you from getting ill" },
  { id: "drink", name: "drink", color: "#4d96ff", why: "stops you getting thirsty" },
];

export const FOODS: Food[] = [
  { id: "bread", name: "sandwich bread", emoji: "🍞", group: "grain" },
  { id: "rice", name: "rice", emoji: "🍚", group: "grain" },
  { id: "roti", name: "roti", emoji: "🫓", group: "grain" },
  { id: "pasta", name: "pasta", emoji: "🍝", group: "grain" },
  { id: "egg", name: "egg", emoji: "🥚", group: "protein" },
  { id: "dal", name: "dal", emoji: "🫘", group: "protein" },
  { id: "chicken", name: "chicken", emoji: "🍗", group: "protein" },
  { id: "cheese", name: "cheese", emoji: "🧀", group: "protein" },
  { id: "nuts", name: "peanuts", emoji: "🥜", group: "protein" },
  { id: "apple", name: "apple", emoji: "🍎", group: "fruit" },
  { id: "banana", name: "banana", emoji: "🍌", group: "fruit" },
  { id: "grapes", name: "grapes", emoji: "🍇", group: "fruit" },
  { id: "mango", name: "mango", emoji: "🥭", group: "fruit" },
  { id: "orange", name: "orange", emoji: "🍊", group: "fruit" },
  { id: "carrot", name: "carrot", emoji: "🥕", group: "veg" },
  { id: "cucumber", name: "cucumber", emoji: "🥒", group: "veg" },
  { id: "broccoli", name: "broccoli", emoji: "🥦", group: "veg" },
  { id: "tomato", name: "tomato", emoji: "🍅", group: "veg" },
  { id: "pepper", name: "pepper", emoji: "🫑", group: "veg" },
  { id: "milk", name: "milk", emoji: "🥛", group: "drink" },
  { id: "water", name: "water", emoji: "💧", group: "drink" },
  { id: "coconut", name: "coconut water", emoji: "🥥", group: "drink" },
  { id: "lolly", name: "lollipop", emoji: "🍭", group: "treat" },
  { id: "donut", name: "doughnut", emoji: "🍩", group: "treat" },
  { id: "chips", name: "chips", emoji: "🍟", group: "treat" },
  { id: "cupcake", name: "cupcake", emoji: "🧁", group: "treat" },
  { id: "soda", name: "fizzy drink", emoji: "🥤", group: "treat" },
  { id: "choc", name: "chocolate", emoji: "🍫", group: "treat" },
];

export const foodById = (id: string) => FOODS.find((f) => f.id === id)!;
export const groupById = (id: GroupId) => GROUPS.find((g) => g.id === id)!;

export type Box = Partial<Record<GroupId, string>>;

/**
 * Foods on the tray: at least one of every group, more choices and more treats as the levels go up.
 * From level 2 the child also picks the right spot in the box (`sortMode`).
 */
export function makeTray(level: number, r: () => number = Math.random): string[] {
  const shuffle = <T>(list: T[]) => [...list].sort(() => r() - 0.5);
  const perGroup = Math.min(3, 1 + Math.floor((level + 1) / 2));
  const treats = Math.min(3, 1 + Math.floor(level / 2));
  const picks = GROUPS.flatMap((g) => shuffle(FOODS.filter((f) => f.group === g.id)).slice(0, perGroup));
  const sweets = shuffle(FOODS.filter((f) => f.group === "treat")).slice(0, treats);
  return shuffle([...picks, ...sweets]).map((f) => f.id);
}

export const sortMode = (level: number) => level >= 2;

export type PackResult = { ok: true; box: Box; group: GroupId } | { ok: false; reason: "treat" | "full" | "wrongSpot"; group?: GroupId };

/** Put a food in the box: in `spot` if the child picked one (sort mode), else straight into its own group's spot. */
export function pack(box: Box, foodId: string, spot?: GroupId): PackResult {
  const f = foodById(foodId);
  if (f.group === "treat") return { ok: false, reason: "treat" };
  if (spot && spot !== f.group) return { ok: false, reason: "wrongSpot", group: f.group };
  if (box[f.group]) return { ok: false, reason: "full", group: f.group };
  return { ok: true, box: { ...box, [f.group]: foodId }, group: f.group };
}

export const isPacked = (box: Box) => GROUPS.every((g) => box[g.id]);

/** "Roti gives you energy to run and play, egg helps your muscles grow strong, ..." */
export const lunchSpeech = (box: Box) =>
  GROUPS.filter((g) => box[g.id])
    .map((g) => `${foodById(box[g.id]!).name} ${g.why}`)
    .join(", ");
