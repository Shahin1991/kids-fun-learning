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
  { id: "balloon-pop", title: "Balloon Pop", ageGroup: "toddler", route: "/toddler/balloon-pop", icon: "🎈", colorToken: "kid-red", description: "Pop the wobbly balloons" },

  { id: "alphabet", title: "Alphabet", ageGroup: "early-learning", route: "/early-learning/alphabet", icon: "🔤", colorToken: "kid-blue", description: "Letters with example words" },
  { id: "numbers", title: "Numbers", ageGroup: "early-learning", route: "/early-learning/numbers", icon: "🔢", colorToken: "kid-green", description: "Count and add" },
  { id: "memory", title: "Memory Match", ageGroup: "early-learning", route: "/early-learning/memory", icon: "🃏", colorToken: "kid-purple", description: "Flip cards and find pairs" },
  { id: "bubble-pop", title: "Bubble Pop", ageGroup: "early-learning", route: "/early-learning/bubble-pop", icon: "🫧", colorToken: "kid-blue", description: "Pop the matching bubble" },
  { id: "letter-parade", title: "Letter & Number Parade", ageGroup: "early-learning", route: "/early-learning/letter-parade", icon: "🎺", colorToken: "kid-purple", description: "Tap the giant letter or number that is called out" },
  { id: "block-tower", title: "Block Tower", ageGroup: "early-learning", route: "/early-learning/block-tower", icon: "🧱", colorToken: "kid-red", description: "Stack wobbly blocks, then knock them down" },
  { id: "cake-bakery", title: "Cake Bakery", ageGroup: "early-learning", route: "/early-learning/cake-bakery", icon: "🎂", colorToken: "kid-red", description: "Mix, bake, frost and decorate your own cake" },
  { id: "magna-tiles", title: "Magna Tiles", ageGroup: "early-learning", route: "/early-learning/magna-tiles", icon: "🔷", colorToken: "kid-blue", description: "Snap magnetic tiles into houses, towers and more" },
  { id: "patterns", title: "Pattern Parade", ageGroup: "early-learning", route: "/early-learning/patterns", icon: "🔴", colorToken: "kid-purple", description: "What comes next in the pattern?" },
  { id: "first-sound", title: "First Sound", ageGroup: "early-learning", route: "/early-learning/first-sound", icon: "🔊", colorToken: "kid-orange", description: "Which letter does the word start with?" },
  { id: "number-path", title: "Number Path", ageGroup: "early-learning", route: "/early-learning/number-path", icon: "🎲", colorToken: "kid-green", description: "Roll the dice and hop along the numbers" },
  { id: "tic-tac-toe", title: "Tic Tac Toe", ageGroup: "early-learning", route: "/early-learning/tic-tac-toe", icon: "❌", colorToken: "kid-blue", description: "Beat the robot: three in a row wins" },
  { id: "snakes-ladders", title: "Snakes & Ladders", ageGroup: "early-learning", route: "/early-learning/snakes-ladders", icon: "🐍", colorToken: "kid-green", description: "Roll, climb ladders and dodge the snakes" },
  { id: "balance-scale", title: "Balance Scale", ageGroup: "early-learning", route: "/early-learning/balance-scale", icon: "⚖️", colorToken: "kid-orange", description: "Make both sides equal" },

  { id: "math-racer", title: "Math Racer", ageGroup: "advanced", route: "/advanced/math-racer", icon: "🏎️", colorToken: "kid-red", description: "Answer to race down the road" },
  { id: "vehicles", title: "Vehicle World", ageGroup: "advanced", route: "/advanced/vehicles", icon: "🚒", colorToken: "kid-orange", description: "Vehicles with sounds and facts" },
  { id: "geography", title: "Geography", ageGroup: "advanced", route: "/advanced/geography", icon: "🌍", colorToken: "kid-green", description: "Flags, countries and continents" },
  { id: "science", title: "Science", ageGroup: "advanced", route: "/advanced/science", icon: "🔭", colorToken: "kid-purple", description: "Space, plants and weather" },
  { id: "clock", title: "Clock Time", ageGroup: "advanced", route: "/advanced/clock", icon: "🕒", colorToken: "kid-blue", description: "Learn to tell the time" },
  { id: "robot-path", title: "Robot Path", ageGroup: "advanced", route: "/advanced/robot-path", icon: "🤖", colorToken: "kid-green", description: "Line up arrows to guide the robot to the star" },
  { id: "connect-4", title: "Connect 4", ageGroup: "advanced", route: "/advanced/connect-4", icon: "🔴", colorToken: "kid-red", description: "Drop discs and connect four in a row" },
  { id: "uno", title: "Uno", ageGroup: "advanced", route: "/advanced/uno", icon: "🃏", colorToken: "kid-red", description: "Match colours and numbers, shout UNO!" },
  { id: "ludo", title: "Ludo", ageGroup: "advanced", route: "/advanced/ludo", icon: "🎲", colorToken: "kid-yellow", description: "Race your pawns home and send rivals back" },
  { id: "road-runner", title: "Road Runner", ageGroup: "advanced", route: "/advanced/road-runner", icon: "🛣️", colorToken: "kid-yellow", description: "Dodge across three lanes" },

  { id: "alternate-uses", title: "Alternate Uses", ageGroup: "others", route: "/others/alternate-uses", icon: "💡", colorToken: "kid-yellow", description: "How many uses can you think of?" },
  { id: "snake", title: "Snake", ageGroup: "others", route: "/others/snake", icon: "🐍", colorToken: "kid-green", description: "The classic: eat, grow, don't crash" },
  { id: "bounce", title: "Bounce", ageGroup: "others", route: "/others/bounce", icon: "🔴", colorToken: "kid-red", description: "Roll and bounce through the rings" },
  { id: "space-impact", title: "Space Impact", ageGroup: "others", route: "/others/space-impact", icon: "🚀", colorToken: "kid-blue", description: "Shoot your way through space" },
  { id: "city-bloxx", title: "City Bloxx", ageGroup: "others", route: "/others/city-bloxx", icon: "🏙️", colorToken: "kid-orange", description: "Stack buildings to build a city" },
  { id: "apex-highway", title: "Apex Highway", ageGroup: "others", route: "/others/apex-highway", icon: "🚗", colorToken: "kid-red", description: "Endless 3D highway driving" },
];

export function getModuleById(id: string): LearningModule | undefined {
  return MODULES.find((m) => m.id === id);
}

export function getModulesByAgeGroup(ageGroup: AgeGroup): LearningModule[] {
  return MODULES.filter((m) => m.ageGroup === ageGroup);
}
