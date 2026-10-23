export interface LabStep {
  title: string;
  /** Read aloud and shown as the caption. */
  say: string;
}

export interface LabLesson {
  id: string;
  title: string;
  icon: string;
  /** Full Tailwind class so the compiler can see it. */
  bg: string;
  /** Section heading in the picker (one of `LAB_GROUPS`); lessons without one go under the first. */
  group?: string;
  steps: LabStep[];
}

/** Picker sections, in display order. */
export const LAB_GROUPS = ["🔬 Science", "🌱 Living things", "🔦 Light and forces", "⚡ Energy"] as const;

export const LAB_LESSONS: LabLesson[] = [
  {
    id: "body",
    title: "Human Body",
    icon: "🫀",
    bg: "bg-kid-red",
    steps: [
      { title: "Your body", say: "Your body has many parts that work together. Tap a part to see what it does!" },
      { title: "Brain", say: "Your brain is the boss. It sends little messages to every part of your body." },
      { title: "Heart", say: "Your heart is a strong muscle. It beats all day and night to push blood around your body." },
      { title: "Lungs", say: "Your lungs fill with air when you breathe in, and empty when you breathe out." },
      { title: "Tummy", say: "Food goes down to your tummy. It squishes the food into tiny pieces your body can use." },
    ],
  },
  {
    id: "plant",
    title: "Plant Growth",
    icon: "🌱",
    bg: "bg-kid-green",
    steps: [
      { title: "Seed", say: "Every plant starts as a tiny seed, resting in the soil." },
      { title: "Water and sun", say: "Rain gives the seed water, and the sun keeps it warm. Now it can wake up!" },
      { title: "Roots and sprout", say: "Roots grow down to drink water. A little sprout pushes up into the light." },
      { title: "Seedling", say: "The stem grows taller and the first leaves open to catch sunshine." },
      { title: "Flower", say: "A flower opens. Bees visit it and carry yellow pollen from flower to flower." },
      { title: "Fruit and seeds", say: "The flower turns into fruit with new seeds inside. Then the cycle starts again!" },
    ],
  },
  {
    id: "water-cycle",
    title: "Water Cycle",
    icon: "💧",
    bg: "bg-kid-blue",
    steps: [
      { title: "Evaporation", say: "The sun warms the sea. Water turns into invisible vapour and floats up into the sky." },
      { title: "Condensation", say: "High up it is cold. The vapour turns back into tiny drops and makes clouds." },
      { title: "Rain", say: "When a cloud gets too heavy, the drops fall down as rain." },
      { title: "Collection", say: "Rain runs down the hills in rivers and flows back to the sea. Then it all starts again!" },
    ],
  },
  {
    id: "weather",
    title: "Weather",
    icon: "⛅",
    bg: "bg-kid-yellow",
    steps: [
      { title: "Sunny", say: "On a sunny day the sky is blue and the sun keeps us warm." },
      { title: "Windy", say: "Wind is moving air. It pushes clouds along, bends trees and spins windmills." },
      { title: "Rainy", say: "Grey clouds are full of water. Plip plop, the rain falls and makes puddles." },
      { title: "Stormy", say: "In a storm, lightning flashes first. Thunder is the loud sound that follows." },
      { title: "Snowy", say: "When it is very cold, the water in clouds freezes into snowflakes." },
    ],
  },
  {
    id: "day-night",
    title: "Day and Night",
    icon: "🌗",
    bg: "bg-kid-orange",
    steps: [
      { title: "The Sun", say: "The sun shines on one half of the Earth at a time. The other half is dark." },
      { title: "Earth spins", say: "The Earth slowly spins around, like a top. One spin takes a whole day." },
      { title: "Day", say: "When your home faces the sun, it is day. Time to play!" },
      { title: "Night", say: "When your home turns away from the sun, it is night. Time to sleep!" },
    ],
  },
  {
    id: "matter",
    title: "Ice, Water, Steam",
    icon: "🧊",
    bg: "bg-kid-purple",
    steps: [
      { title: "Solid ice", say: "In ice, the tiny bits are packed tight and only wiggle. That is why ice is hard." },
      { title: "Melting", say: "Heat makes the tiny bits move more. The ice melts into water that can flow." },
      { title: "Boiling", say: "More heat makes the bits zoom around and escape. Water turns into steam, a gas." },
      { title: "Freezing", say: "Take the heat away and the bits slow down. Steam turns to water, and water turns to ice." },
    ],
  },
  {
    id: "moon",
    title: "Moon Phases",
    icon: "🌙",
    bg: "bg-kid-blue",
    steps: [
      { title: "New moon", say: "The moon goes around the Earth. At new moon, the sunny side faces away from us, so we cannot see it." },
      { title: "Crescent", say: "A thin curve of the moon lights up. This is a crescent." },
      { title: "Half moon", say: "A week later, half of the moon we see is bright." },
      { title: "Full moon", say: "At full moon, the sunny side faces us. The whole moon shines!" },
      { title: "Shrinking", say: "Then the bright part gets smaller again, until the moon is new once more." },
    ],
  },
  {
    id: "magnets",
    title: "Magnets",
    icon: "🧲",
    bg: "bg-kid-red",
    steps: [
      { title: "Magnets pull", say: "A magnet pulls some metal things towards it, without even touching them. That invisible pull is magic you can feel!" },
      { title: "Magnetic or not?", say: "Magnets pick up things made of iron, like paper clips and nails. Wood, toys and fruit do not stick." },
      { title: "Opposites attract", say: "Every magnet has two ends, called poles. A north pole and a south pole pull together and snap shut." },
      { title: "Same poles push", say: "Two north poles, or two south poles, push each other away. They do not want to touch!" },
      { title: "The magnetic field", say: "Around every magnet is an invisible magnetic field. It flows from the north pole round to the south pole." },
    ],
  },
  {
    id: "solar-system",
    title: "Solar System",
    icon: "🪐",
    bg: "bg-kid-purple",
    steps: [
      { title: "The Sun", say: "The Sun is a giant star in the middle. Its light and heat keep every planet company." },
      { title: "Rocky planets", say: "Mercury, Venus, Earth and Mars are the four rocky planets close to the Sun. They go around quickly." },
      { title: "Giant planets", say: "Jupiter, Saturn, Uranus and Neptune are giants far from the Sun. They take a very long time to go all the way round." },
      { title: "Our home", say: "The blue planet is Earth, our home. The Moon goes around it as it travels around the Sun." },
      { title: "Meet the planets", say: "Tap a planet to hear its name. There are eight planets in all!" },
    ],
  },
  {
    id: "skeleton",
    title: "Skeleton",
    icon: "💀",
    bg: "bg-kid-orange",
    steps: [
      { title: "Your skeleton", say: "Inside you is a skeleton made of 206 bones. Bones hold you up and give your body its shape." },
      { title: "Skull", say: "Your skull is a hard helmet. It keeps your soft brain safe." },
      { title: "Ribs", say: "Your ribs are a bony cage. They protect your heart and lungs, and they move a little when you breathe." },
      { title: "Spine", say: "Your spine is a stack of small bones. That is why you can bend, twist and touch your toes." },
      { title: "Joints", say: "Where two bones meet is a joint, like your elbow or knee. Joints let your skeleton move!" },
    ],
  },
  {
    id: "electricity",
    title: "Electricity",
    icon: "💡",
    bg: "bg-kid-yellow",
    group: "⚡ Energy",
    steps: [
      { title: "A circuit", say: "A battery pushes electricity round a loop of wire. When the loop is complete, the bulb lights up!" },
      { title: "The switch", say: "A switch opens and closes the loop. Tap the switch to turn the light on and off." },
      { title: "Conductors", say: "Metal lets electricity flow through, so it is a conductor. Wood and toys block it, so they are insulators." },
      { title: "Static", say: "Rub a balloon on your hair and tiny charges move onto it. Now it can stick to the wall!" },
      { title: "Stay safe", say: "Electricity from a wall socket is very strong. Never touch sockets or wires, and keep water away. Ask a grown-up for help." },
    ],
  },
  {
    id: "hydel",
    title: "Hydel Power",
    icon: "🏞️",
    bg: "bg-kid-blue",
    group: "⚡ Energy",
    steps: [
      { title: "Rain fills the lake", say: "Rain and rivers fill a big lake behind a strong wall called a dam." },
      { title: "The gate opens", say: "A gate opens and the water rushes down a big pipe. Falling water is full of energy." },
      { title: "The turbine spins", say: "The rushing water hits a turbine, like a water wheel, and spins it round and round." },
      { title: "The generator", say: "The spinning turbine turns a generator. The generator makes electricity!" },
      { title: "Power for homes", say: "Wires carry the electricity to houses, schools and shops. The water flows on down the river, ready to be used again." },
    ],
  },
  {
    id: "butterfly",
    title: "Butterfly Life",
    icon: "🦋",
    bg: "bg-kid-orange",
    group: "🌱 Living things",
    steps: [
      { title: "Egg", say: "A butterfly begins as a tiny egg, stuck to a leaf." },
      { title: "Caterpillar", say: "A hungry caterpillar hatches. It eats leaves all day and grows, and grows, and grows!" },
      { title: "Chrysalis", say: "When it is big enough, the caterpillar hangs from a twig and wraps itself up in a chrysalis. Inside, it is changing!" },
      { title: "Butterfly", say: "Out comes a butterfly! It flaps its wings and flies off to find flowers, and to lay new eggs." },
    ],
  },
  {
    id: "frog",
    title: "Frog Life",
    icon: "🐸",
    bg: "bg-kid-green",
    group: "🌱 Living things",
    steps: [
      { title: "Eggs", say: "A mother frog lays lots of jelly-like eggs in the pond." },
      { title: "Tadpole", say: "Tiny tadpoles hatch. They have a tail, and they breathe underwater, like fish." },
      { title: "Growing legs", say: "The tadpole grows back legs, then front legs. Its tail gets shorter and shorter." },
      { title: "Frog", say: "Now it is a frog! It breathes air, hops on a lily pad, and catches flies with its long sticky tongue." },
    ],
  },
  {
    id: "photosynthesis",
    title: "How Plants Eat",
    icon: "🍃",
    bg: "bg-kid-green",
    group: "🌱 Living things",
    steps: [
      { title: "Plants make food", say: "Plants cannot go shopping, so they make their own food inside their leaves." },
      { title: "Sunlight", say: "The leaves catch sunlight. Sunlight gives the plant the energy to cook." },
      { title: "Water", say: "The roots drink water from the soil, and it travels up the stem to the leaves." },
      { title: "Air", say: "The leaves also take in a gas from the air, called carbon dioxide. It is the gas we breathe out." },
      { title: "Food and fresh air", say: "The plant mixes it all together to make sugar, its food. And it lets out oxygen, the fresh air we breathe in!" },
    ],
  },
  {
    id: "germs",
    title: "Wash Your Hands",
    icon: "🧼",
    bg: "bg-kid-blue",
    group: "🌱 Living things",
    steps: [
      { title: "Tiny germs", say: "Germs are tiny living things, too small to see. They can hide on your hands and make you sick." },
      { title: "Wet your hands", say: "Turn on the tap and wet your hands with clean water." },
      { title: "Soap and scrub", say: "Rub in soap and scrub for twenty seconds. Between your fingers too! The soap grabs the germs." },
      { title: "Rinse", say: "Rinse with water. The germs wash away down the drain." },
      { title: "Clean hands", say: "Dry your hands. Clean hands keep you and your friends healthy!" },
    ],
  },
  {
    id: "light",
    title: "Light and Shadows",
    icon: "🔦",
    bg: "bg-kid-yellow",
    group: "🔦 Light and forces",
    steps: [
      { title: "Light goes straight", say: "Light travels in straight lines, in every direction, from a torch, a lamp or the Sun." },
      { title: "Shadows", say: "When something blocks the light, it makes a dark shadow behind it." },
      { title: "Move the torch", say: "Drag the torch. Close to the toy makes a big shadow. Far away makes a small one." },
      { title: "Rainbow light", say: "White light is really made of many colours. A glass prism splits it into a rainbow!" },
    ],
  },
  {
    id: "floating",
    title: "Float or Sink?",
    icon: "🛟",
    bg: "bg-kid-blue",
    group: "🔦 Light and forces",
    steps: [
      { title: "Things that float", say: "Wood, apples and balls float. They stay on top of the water." },
      { title: "Things that sink", say: "Stones, coins and metal bolts sink. They fall to the bottom." },
      { title: "Try it!", say: "Tap a thing to drop it in the water. Will it float or sink?" },
      { title: "Boats", say: "A ball of clay sinks. But the same clay shaped into a boat floats, because it pushes lots of water out of the way!" },
    ],
  },
];
