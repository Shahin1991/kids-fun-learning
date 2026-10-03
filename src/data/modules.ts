export type AgeGroup = "toddler" | "early-learning" | "advanced" | "others";

export interface LearningModule {
  id: string;
  title: string;
  ageGroup: AgeGroup;
  route: string;
  icon: string;
  colorToken: "kid-red" | "kid-blue" | "kid-green" | "kid-yellow" | "kid-orange" | "kid-purple";
  description: string;
  /** True while the route is a "coming soon" placeholder. */
  placeholder?: boolean;
}

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  toddler: "2-3 Years",
  "early-learning": "4-6 Years",
  advanced: "7-8 Years",
  others: "Other Games",
};

export const AGE_GROUP_ORDER: AgeGroup[] = ["toddler", "early-learning", "advanced", "others"];

export const MODULES: LearningModule[] = [
  { id: "animals", title: "Animals", ageGroup: "toddler", route: "/toddler/animals", icon: "🐶", colorToken: "kid-orange", description: "Tap an animal to hear its name and sound" },
  { id: "colors", title: "Colors", ageGroup: "toddler", route: "/toddler/colors", icon: "🎨", colorToken: "kid-red", description: "Tap a color to see it flash" },
  { id: "shapes", title: "Shapes", ageGroup: "toddler", route: "/toddler/shapes", icon: "🔺", colorToken: "kid-blue", description: "Drag shapes to their outlines" },
  { id: "tap-fun", title: "Tap Party", ageGroup: "toddler", route: "/toddler/tap-fun", icon: "🎆", colorToken: "kid-purple", description: "Tap anywhere for bursts of fun" },
  { id: "sizes", title: "Big or Small", ageGroup: "toddler", route: "/toddler/sizes", icon: "🐘", colorToken: "kid-green", description: "Find the big one, sort them in order" },
  { id: "emotions", title: "Feelings", ageGroup: "toddler", route: "/toddler/emotions", icon: "😊", colorToken: "kid-yellow", description: "Meet the faces and feelings" },

  { id: "alphabet", title: "Alphabet", ageGroup: "early-learning", route: "/early-learning/alphabet", icon: "🔤", colorToken: "kid-blue", description: "Letters with example words" },
  { id: "numbers", title: "Numbers", ageGroup: "early-learning", route: "/early-learning/numbers", icon: "🔢", colorToken: "kid-green", description: "Count and add" },
  { id: "memory", title: "Memory Match", ageGroup: "early-learning", route: "/early-learning/memory", icon: "🃏", colorToken: "kid-purple", description: "Flip cards and find pairs" },
  { id: "bubble-pop", title: "Bubble Pop", ageGroup: "early-learning", route: "/early-learning/bubble-pop", icon: "🫧", colorToken: "kid-blue", description: "Pop the matching bubble" },
  { id: "balance-scale", title: "Balance Scale", ageGroup: "early-learning", route: "/early-learning/balance-scale", icon: "⚖️", colorToken: "kid-orange", description: "Make both sides equal" },

  { id: "math-racer", title: "Math Racer", ageGroup: "advanced", route: "/advanced/math-racer", icon: "🏎️", colorToken: "kid-red", description: "Answer to race down the road" },
  { id: "vehicles", title: "Vehicle World", ageGroup: "advanced", route: "/advanced/vehicles", icon: "🚒", colorToken: "kid-orange", description: "Vehicles with sounds and facts" },
  { id: "geography", title: "Geography", ageGroup: "advanced", route: "/advanced/geography", icon: "🌍", colorToken: "kid-green", description: "Flags, countries and continents" },
  { id: "science", title: "Science", ageGroup: "advanced", route: "/advanced/science", icon: "🔭", colorToken: "kid-purple", description: "Space, plants and weather" },
  { id: "road-runner", title: "Road Runner", ageGroup: "advanced", route: "/advanced/road-runner", icon: "🛣️", colorToken: "kid-yellow", description: "Dodge across three lanes" },

  { id: "alternate-uses", title: "Alternate Uses", ageGroup: "others", route: "/others/alternate-uses", icon: "💡", colorToken: "kid-yellow", description: "How many uses can you think of?" },
  { id: "apex-highway", title: "Apex Highway", ageGroup: "others", route: "/others/apex-highway", icon: "🚗", colorToken: "kid-red", description: "Endless 3D highway driving" },
];

export function getModuleById(id: string): LearningModule | undefined {
  return MODULES.find((m) => m.id === id);
}

export function getModulesByAgeGroup(ageGroup: AgeGroup): LearningModule[] {
  return MODULES.filter((m) => m.ageGroup === ageGroup);
}
