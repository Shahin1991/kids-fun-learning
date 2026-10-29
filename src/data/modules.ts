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
  { id: "music-maker", title: "Music Maker", ageGroup: "toddler", route: "/toddler/music-maker", icon: "🎹", colorToken: "kid-purple", description: "Play the xylophone, copy tunes and play songs" },
  { id: "peekaboo-farm", title: "Peekaboo Farm", ageGroup: "toddler", route: "/toddler/peekaboo-farm", icon: "🙈", colorToken: "kid-green", description: "Tap the barn, hay and bushes to find who's hiding" },
  { id: "car-wash", title: "Car Wash", ageGroup: "toddler", route: "/toddler/car-wash", icon: "🧽", colorToken: "kid-blue", description: "Scrub the mud off, rinse the bubbles, beep beep!" },
  { id: "dress-up", title: "Dress for the Weather", ageGroup: "toddler", route: "/toddler/dress-up", icon: "☂️", colorToken: "kid-yellow", description: "Sunny, rainy or snowy: pick what to wear" },
  { id: "colouring", title: "Colouring", ageGroup: "toddler", route: "/toddler/colouring", icon: "🖍️", colorToken: "kid-orange", description: "Colour in pictures or finger-paint" },

  { id: "books", title: "Picture Books", ageGroup: "early-learning", route: "/early-learning/books", icon: "📚", colorToken: "kid-purple", description: "Pick a book from the shelf and swipe the pages" },
  { id: "alphabet", title: "Alphabet", ageGroup: "early-learning", route: "/early-learning/alphabet", icon: "🔤", colorToken: "kid-blue", description: "Letters with example words" },
  { id: "numbers", title: "Numbers", ageGroup: "early-learning", route: "/early-learning/numbers", icon: "🔢", colorToken: "kid-green", description: "Count and add" },
  { id: "memory", title: "Memory Match", ageGroup: "early-learning", route: "/early-learning/memory", icon: "🃏", colorToken: "kid-purple", description: "Flip cards and find pairs" },
  { id: "bubble-pop", title: "Bubble Pop", ageGroup: "early-learning", route: "/early-learning/bubble-pop", icon: "🫧", colorToken: "kid-blue", description: "Pop the matching bubble" },
  { id: "letter-parade", title: "Letter & Number Parade", ageGroup: "early-learning", route: "/early-learning/letter-parade", icon: "🎺", colorToken: "kid-purple", description: "Tap the giant letter or number that is called out" },
  { id: "block-tower", title: "Block Tower", ageGroup: "early-learning", route: "/early-learning/block-tower", icon: "🧱", colorToken: "kid-red", description: "Stack wobbly blocks, then knock them down" },
  { id: "peg-drop", title: "Peg Drop", ageGroup: "early-learning", route: "/early-learning/peg-drop", icon: "🟡", colorToken: "kid-yellow", description: "Drop balls through the pegs and add up the cups" },
  { id: "catapult", title: "Catapult", ageGroup: "early-learning", route: "/early-learning/catapult", icon: "🏰", colorToken: "kid-orange", description: "Pull back the slingshot and knock the towers down" },
  { id: "cake-bakery", title: "Cake Bakery", ageGroup: "early-learning", route: "/early-learning/cake-bakery", icon: "🎂", colorToken: "kid-red", description: "Mix, bake, frost and decorate your own cake" },
  { id: "magna-tiles", title: "Magna Tiles", ageGroup: "early-learning", route: "/early-learning/magna-tiles", icon: "🔷", colorToken: "kid-blue", description: "Snap magnetic tiles into houses, towers and more" },
  { id: "patterns", title: "Pattern Parade", ageGroup: "early-learning", route: "/early-learning/patterns", icon: "🔴", colorToken: "kid-purple", description: "What comes next in the pattern?" },
  { id: "colour-mixer", title: "Colour Mixer", ageGroup: "early-learning", route: "/early-learning/colour-mixer", icon: "🎨", colorToken: "kid-purple", description: "Mix paints to make new colours" },
  { id: "first-sound", title: "First Sound", ageGroup: "early-learning", route: "/early-learning/first-sound", icon: "🔊", colorToken: "kid-orange", description: "Which letter does the word start with?" },
  { id: "number-path", title: "Number Path", ageGroup: "early-learning", route: "/early-learning/number-path", icon: "🎲", colorToken: "kid-green", description: "Roll the dice and hop along the numbers" },
  { id: "tic-tac-toe", title: "Tic Tac Toe", ageGroup: "early-learning", route: "/early-learning/tic-tac-toe", icon: "❌", colorToken: "kid-blue", description: "Beat the robot: three in a row wins" },
  { id: "snakes-ladders", title: "Snakes & Ladders", ageGroup: "early-learning", route: "/early-learning/snakes-ladders", icon: "🐍", colorToken: "kid-green", description: "Roll, climb ladders and dodge the snakes" },
  { id: "balance-scale", title: "Balance Scale", ageGroup: "early-learning", route: "/early-learning/balance-scale", icon: "⚖️", colorToken: "kid-orange", description: "Make both sides equal" },
  { id: "make-ten", title: "Make Ten", ageGroup: "early-learning", route: "/early-learning/make-ten", icon: "🔟", colorToken: "kid-red", description: "How many more make ten?" },
  { id: "rhyme-time", title: "Rhyme Time", ageGroup: "early-learning", route: "/early-learning/rhyme-time", icon: "🎤", colorToken: "kid-purple", description: "Find the picture that rhymes" },
  { id: "juice-stand", title: "Juice Stand", ageGroup: "early-learning", route: "/early-learning/juice-stand", icon: "🧃", colorToken: "kid-orange", description: "Blend the juice each customer orders, then count their coins" },
  { id: "bead-builder", title: "Bead Builder", ageGroup: "early-learning", route: "/early-learning/bead-builder", icon: "📿", colorToken: "kid-purple", description: "Thread beads in a pattern to make a necklace" },
  { id: "dino-dig", title: "Dino Dig", ageGroup: "early-learning", route: "/early-learning/dino-dig", icon: "🦖", colorToken: "kid-orange", description: "Brush away the sand to find dinosaur bones" },
  { id: "clean-up", title: "Clean-Up & Recycle", ageGroup: "early-learning", route: "/early-learning/clean-up", icon: "♻️", colorToken: "kid-green", description: "Sort the rubbish into the right bins and clean the park" },
  { id: "train-track", title: "Train Track Builder", ageGroup: "early-learning", route: "/early-learning/train-track", icon: "🚂", colorToken: "kid-blue", description: "Lay the track so the train reaches the station" },
  { id: "road-safety", title: "Road Safety", ageGroup: "early-learning", route: "/early-learning/road-safety", icon: "🚦", colorToken: "kid-red", description: "Press the button, look left and right, then cross" },
  { id: "lunchbox", title: "My Lunchbox", ageGroup: "early-learning", route: "/early-learning/lunchbox", icon: "🍱", colorToken: "kid-yellow", description: "Pack a balanced lunch from every food group" },
  { id: "word-builder", title: "Word Builder", ageGroup: "early-learning", route: "/early-learning/word-builder", icon: "🔤", colorToken: "kid-blue", description: "Spell little words letter by letter" },

  { id: "math-racer", title: "Math Racer", ageGroup: "advanced", route: "/advanced/math-racer", icon: "🏎️", colorToken: "kid-red", description: "Answer to race down the road" },
  { id: "vehicles", title: "Vehicle World", ageGroup: "advanced", route: "/advanced/vehicles", icon: "🚒", colorToken: "kid-orange", description: "Vehicles with sounds and facts" },
  { id: "geography", title: "Geography", ageGroup: "advanced", route: "/advanced/geography", icon: "🌍", colorToken: "kid-green", description: "Flags, countries and continents" },
  { id: "science", title: "Science", ageGroup: "advanced", route: "/advanced/science", icon: "🔭", colorToken: "kid-purple", description: "Space, plants and weather" },
  { id: "science-lab", title: "Science Lab", ageGroup: "advanced", route: "/advanced/science-lab", icon: "🧪", colorToken: "kid-green", description: "Body, plants, weather, magnets, electricity and more, animated" },
  { id: "clock", title: "Clock Time", ageGroup: "advanced", route: "/advanced/clock", icon: "🕒", colorToken: "kid-blue", description: "Learn to tell the time" },
  { id: "robot-path", title: "Robot Path", ageGroup: "advanced", route: "/advanced/robot-path", icon: "🤖", colorToken: "kid-green", description: "Line up arrows to guide the robot to the star" },
  { id: "connect-4", title: "Connect 4", ageGroup: "advanced", route: "/advanced/connect-4", icon: "🔴", colorToken: "kid-red", description: "Drop discs and connect four in a row" },
  { id: "uno", title: "Uno", ageGroup: "advanced", route: "/advanced/uno", icon: "🃏", colorToken: "kid-red", description: "Match colours and numbers, shout UNO!" },
  { id: "ludo", title: "Ludo", ageGroup: "advanced", route: "/advanced/ludo", icon: "🎲", colorToken: "kid-yellow", description: "Race your pawns home and send rivals back" },
  { id: "world-globe", title: "World Globe", ageGroup: "advanced", route: "/advanced/world-globe", icon: "🌐", colorToken: "kid-blue", description: "Spin the globe and guess countries by shape" },
  { id: "times-tables", title: "Times Tables", ageGroup: "advanced", route: "/advanced/times-tables", icon: "✖️", colorToken: "kid-purple", description: "Build groups, tap the times grid, then quiz" },
  { id: "hindi-arabic", title: "Hindi & Arabic", ageGroup: "advanced", route: "/advanced/hindi-arabic", icon: "🔡", colorToken: "kid-purple", description: "अ आ and أ ب ت: hear each letter with a picture word, then trace it" },
  { id: "tens-ones", title: "Tens & Ones", ageGroup: "advanced", route: "/advanced/tens-ones", icon: "🪢", colorToken: "kid-green", description: "Bundle sticks into tens to build each number" },
  { id: "rangoli", title: "Rangoli Maker", ageGroup: "advanced", route: "/advanced/rangoli", icon: "🪷", colorToken: "kid-red", description: "Draw once and watch it repeat all round: symmetry art" },
  { id: "treasure-map", title: "Treasure Map", ageGroup: "advanced", route: "/advanced/treasure-map", icon: "🗺️", colorToken: "kid-yellow", description: "Follow the compass clues North, South, East and West" },
  { id: "measure-it", title: "Measure It", ageGroup: "advanced", route: "/advanced/measure-it", icon: "📏", colorToken: "kid-orange", description: "Measure with blocks and a ruler, then fill jugs with cups" },
  { id: "tally", title: "Tally & Charts", ageGroup: "advanced", route: "/advanced/tally", icon: "📊", colorToken: "kid-blue", description: "Tally the animals walking past, then make a bar chart" },
  { id: "coin-shop", title: "Coin Shop", ageGroup: "advanced", route: "/advanced/coin-shop", icon: "🪙", colorToken: "kid-yellow", description: "Pay with coins and work out the change" },
  { id: "carrom", title: "Carrom", ageGroup: "advanced", route: "/advanced/carrom", icon: "⚪", colorToken: "kid-orange", description: "Flick the striker and pocket the coins" },
  { id: "snooker", title: "Snooker", ageGroup: "advanced", route: "/advanced/snooker", icon: "🎱", colorToken: "kid-green", description: "Pot a red, then a colour, in 3D" },
  { id: "darts", title: "Darts", ageGroup: "advanced", route: "/advanced/darts", icon: "🎯", colorToken: "kid-red", description: "Throw three darts and add up your score" },
  { id: "archery", title: "Archery", ageGroup: "advanced", route: "/advanced/archery", icon: "🏹", colorToken: "kid-blue", description: "Draw the bow, beat the wind, hit the gold" },
  { id: "marble-run", title: "Marble Run", ageGroup: "advanced", route: "/advanced/marble-run", icon: "🎢", colorToken: "kid-blue", description: "Place the ramps so the marble rolls into the cup" },
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
