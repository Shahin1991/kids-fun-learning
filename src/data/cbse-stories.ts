import type { SceneDef } from "@/components/art/Scene";
import type { BookDef } from "./books";
import { DAY, GRASS, NIGHT, RAIN, pages } from "./stories";

/**
 * Stories and poems for the lower classes of the CBSE English course (Marigold and Mridang / Santoor).
 *
 * The NCERT lesson texts are copyrighted, so none of them are copied here. The traditional tales that those
 * books retell (folk tales, Aesop) are retold again in new words, the poems are new ones written for this app
 * on the same themes, and "Little Drops of Water" is a public-domain classic.
 */

/** emoji, x %, y %, size % of the picture width, flip, tilt */
type Item = [emoji: string, x: number, y: number, size: number, flip?: boolean, tilt?: number];
type Spread = [text: string, scene: SceneDef];

const scene = (sky: SceneDef["sky"], ground: string | undefined, items: Item[]): SceneDef => ({
  sky,
  ground,
  items: items.map(([emoji, x, y, size, flip, tilt]) => ({ emoji, x, y, size, flip, tilt })),
});

const DUSK: SceneDef["sky"] = ["#ffc999", "#ffe7cf"];
const MORNING: SceneDef["sky"] = ["#ffe3b0", "#fff4dc"];
const HOUSE: SceneDef["sky"] = ["#ffe3b0", "#fff4dc"];
const STORM: SceneDef["sky"] = ["#8a94a6", "#c3cbd6"];
const SAND = "#f1d9a0";
const WATER = "#5bb8f0";
const BATH = "#cdeefc";
const FLOOR = "#d9b38c";
const WOODS = "#5aa456";

const make = (meta: Omit<BookDef, "pages" | "dark"> & { dark: string }, list: Spread[]): BookDef => ({ ...meta, pages: pages(meta.id, list) });

const TALE = "Retold in new words";
const POEM = "A poem written for this app";

export const CBSE_BOOKS: BookDef[] = [
  // ---------------------------------------------------------------- Class 1
  make({ id: "cap-seller", title: "The Cap-Seller and the Monkeys", short: "Cap-Seller", emoji: "🧢", color: "#e76f51", dark: "#b5472b", shelf: "Class 1", kind: "story", credit: `An Indian folk tale. ${TALE}.` }, [
    ["A cap-seller walked along with a basket of caps.", scene(DAY, GRASS, [["👳", 42, 62, 38], ["🧺", 72, 68, 22], ["🧢", 72, 52, 14]])],
    ["The sun was hot, so he rested under a big tree.", scene(DAY, GRASS, [["☀️", 84, 18, 22], ["🌳", 64, 46, 58], ["👳", 28, 68, 30]])],
    ["Soon he was fast asleep.", scene(DAY, GRASS, [["🌳", 66, 46, 58], ["👳", 32, 68, 30], ["💤", 48, 50, 18]])],
    ["Some monkeys jumped down from the tree.", scene(DAY, GRASS, [["🌳", 50, 38, 70], ["🐒", 28, 34, 18], ["🐒", 52, 54, 20], ["🐒", 74, 44, 18, true], ["👳", 50, 76, 22]])],
    ["They took the caps and put them on their heads!", scene(DAY, GRASS, [["🐒", 26, 62, 26], ["🧢", 26, 46, 13], ["🐒", 52, 64, 26], ["🧢", 52, 48, 13], ["🐒", 78, 62, 26, true], ["🧢", 78, 46, 13]])],
    ["The cap-seller woke up. “My caps!” he cried.", scene(DAY, GRASS, [["👳", 30, 64, 34], ["❗", 30, 34, 14], ["🌳", 74, 44, 56], ["🐒", 70, 42, 18]])],
    ["He was so cross, he threw his own cap on the ground.", scene(DAY, GRASS, [["👳", 32, 64, 34], ["🧢", 56, 76, 16, false, 25]])],
    ["The monkeys threw theirs down too! He picked up his caps and smiled.", scene(DAY, GRASS, [["🌳", 64, 38, 56], ["🧢", 38, 76, 14], ["🧢", 52, 80, 14], ["🧢", 66, 76, 14], ["👳", 22, 66, 30], ["😊", 22, 42, 12]])],
  ]),
  make({ id: "three-pigs", title: "The Three Little Pigs", short: "Three Pigs", emoji: "🐷", color: "#ff8fb1", dark: "#d6336c", shelf: "Class 1", kind: "story", credit: `A traditional tale. ${TALE}.` }, [
    ["Three little pigs went out to build their own houses.", scene(DAY, GRASS, [["🐷", 26, 66, 26], ["🐷", 50, 66, 26], ["🐷", 74, 66, 26, true], ["☀️", 84, 18, 20]])],
    ["The first pig built a house of straw.", scene(DAY, GRASS, [["🐷", 32, 66, 30], ["🛖", 68, 58, 40], ["🌾", 88, 76, 14]])],
    ["The second pig built a house of sticks.", scene(DAY, GRASS, [["🐷", 32, 66, 30], ["⛺", 68, 58, 38], ["🪵", 88, 76, 14]])],
    ["The third pig worked hard and built a house of bricks.", scene(DAY, GRASS, [["🐷", 28, 66, 30], ["🏠", 64, 54, 44], ["🧱", 86, 78, 14]])],
    ["A big bad wolf came by. “Little pig, let me in!”", scene(DAY, GRASS, [["🐺", 28, 66, 34], ["🛖", 72, 56, 40]])],
    ["He huffed and puffed and blew the weak houses down!", scene(DAY, GRASS, [["🐺", 22, 64, 32], ["💨", 44, 56, 22], ["🛖", 76, 62, 26, false, 35], ["⛺", 88, 76, 16, false, -30]])],
    ["The pigs ran to the brick house. The wolf could not blow it down!", scene(DAY, GRASS, [["🏠", 56, 52, 50], ["🐷", 20, 70, 22], ["🐷", 36, 74, 20], ["🐷", 78, 72, 22, true], ["🐺", 90, 72, 18, true]])],
    ["Now the three little pigs were safe and happy.", scene(DAY, GRASS, [["🏠", 50, 50, 50], ["🐷", 20, 72, 22], ["🐷", 34, 76, 20], ["🐷", 80, 72, 22, true], ["❤️", 50, 20, 12]])],
  ]),
  make({ id: "bubble-straw-shoe", title: "The Bubble, the Straw and the Shoe", short: "Bubble, Shoe", emoji: "🫧", color: "#4dabf7", dark: "#1c7ed6", shelf: "Class 1", kind: "story", credit: `A folk tale. ${TALE}.` }, [
    ["A bubble, a straw and a shoe set off on a journey.", scene(DAY, GRASS, [["🫧", 26, 58, 24], ["🌾", 52, 66, 22], ["👞", 76, 70, 22]])],
    ["They walked and walked through the green forest.", scene(DAY, GRASS, [["🌳", 14, 48, 40], ["🌳", 86, 48, 40], ["🫧", 34, 60, 16], ["🌾", 52, 66, 16], ["👞", 70, 70, 16]])],
    ["Soon they came to a wide river. There was no bridge!", scene(DAY, WATER, [["🫧", 18, 40, 16], ["🌾", 34, 44, 16], ["👞", 50, 46, 16]])],
    ["“I will be your bridge,” said the straw.", scene(DAY, WATER, [["🌾", 50, 60, 54, false, 90], ["🫧", 20, 40, 16], ["👞", 80, 40, 16]])],
    ["The shoe stepped on. Snap! The straw broke.", scene(DAY, WATER, [["🌾", 44, 60, 40, false, 70], ["👞", 52, 42, 22], ["💥", 56, 56, 16]])],
    ["Splash! In went the shoe and the straw.", scene(DAY, WATER, [["💦", 50, 48, 26], ["🌾", 36, 70, 18, false, 40], ["👞", 64, 70, 18]])],
    ["The shoe floated like a boat. The straw stood up like a mast.", scene(DAY, WATER, [["👞", 50, 68, 28], ["🌾", 50, 48, 24]])],
    ["The bubble hopped on top. Off they sailed, laughing!", scene(DAY, WATER, [["☀️", 82, 16, 20], ["👞", 44, 68, 28], ["🌾", 44, 50, 22], ["🫧", 44, 34, 16], ["😄", 74, 60, 12]])],
  ]),
  make({ id: "happy-me", title: "Happy Me", emoji: "😊", color: "#ffb703", dark: "#e08600", shelf: "Class 1", kind: "poem", credit: POEM }, [
    ["I wake up with the morning sun,\nAnd 1, 2, 3, the day’s begun!", scene(MORNING, GRASS, [["☀️", 76, 24, 26], ["🏠", 28, 54, 36], ["🧒", 66, 72, 22]])],
    ["I clap my hands, I stamp my feet,\nI skip along the leafy street.", scene(DAY, GRASS, [["🧒", 32, 66, 30], ["🌳", 74, 46, 40], ["🍃", 54, 72, 12]])],
    ["I wave at birds up in the tree,\nThey sing a happy song for me.", scene(DAY, GRASS, [["🌳", 68, 44, 56], ["🐦", 66, 36, 16], ["🐦", 80, 50, 14, true], ["🧒", 28, 68, 28], ["🎵", 48, 32, 14]])],
    ["I share my toys and share my cake,\nAnd smiles are what I love to make.", scene(DAY, GRASS, [["👧", 26, 66, 28], ["🧒", 64, 66, 28, true], ["🎂", 45, 72, 18], ["😊", 45, 38, 16]])],
    ["I hug my mum and say good night,\nThe stars come out, the moon is bright.", scene(NIGHT, "#2f5a52", [["🌙", 76, 24, 24], ["⭐", 22, 20, 12], ["⭐", 50, 14, 10], ["👩", 40, 66, 28], ["🧒", 62, 72, 20]])],
  ]),
  make({ id: "bath-time", title: "Splash! Bath Time", short: "Bath Time", emoji: "🛁", color: "#4cc9f0", dark: "#1b98c4", shelf: "Class 1", kind: "poem", credit: POEM }, [
    ["Splash, splash, splash, it’s time for a bath,\nBubbles pop and make me laugh.", scene(["#d9f0ff", "#f0faff"], BATH, [["🛁", 50, 62, 52], ["🫧", 30, 38, 16], ["🫧", 72, 34, 12]])],
    ["Soap on my elbows, soap on my toes,\nSoap on my tummy and soap on my nose.", scene(["#d9f0ff", "#f0faff"], BATH, [["🧼", 28, 62, 22], ["🧒", 60, 62, 34], ["🫧", 78, 42, 14], ["🫧", 44, 38, 12]])],
    ["Rub-a-dub, scrub-a-dub, rinse it away,\nMy rubber duck loves to float and play.", scene(["#d9f0ff", "#f0faff"], BATH, [["🛁", 50, 64, 50], ["🦆", 50, 48, 18], ["💦", 76, 48, 16]])],
    ["Out I jump and wrap up tight,\nWarm and clean and smelling bright.", scene(["#d9f0ff", "#f0faff"], BATH, [["🧒", 42, 66, 32], ["✨", 66, 42, 16], ["✨", 30, 38, 12], ["🌸", 76, 72, 14]])],
  ]),
  make({ id: "little-kitten", title: "Little Kitten", short: "Kitten", emoji: "🐱", color: "#f4a261", dark: "#c97b2e", shelf: "Class 1", kind: "poem", credit: POEM }, [
    ["One little kitten, soft and small,\nPlaying with a woolly ball.", scene(HOUSE, FLOOR, [["🐱", 40, 64, 36], ["🧶", 72, 72, 20]])],
    ["Two little kittens, hide and seek,\nPeeking out with a tiny squeak.", scene(HOUSE, FLOOR, [["🪴", 50, 62, 34], ["🐱", 24, 68, 26], ["🐱", 76, 68, 26, true]])],
    ["Three little kittens, tired at last,\nCurl up cosy, sleeping fast.", scene(HOUSE, FLOOR, [["🧺", 50, 72, 70], ["🐱", 32, 62, 22], ["🐱", 50, 60, 22], ["🐱", 68, 62, 22], ["💤", 50, 34, 18]])],
  ]),
  make({ id: "merry-go-round", title: "Merry-Go-Round", short: "Merry-Go", emoji: "🎠", color: "#e56b6f", dark: "#b83f45", shelf: "Class 1", kind: "poem", credit: POEM }, [
    ["Round and round the horses go,\nUp and down and fast then slow.", scene(DAY, GRASS, [["🎠", 50, 54, 58], ["🎵", 18, 28, 12], ["🎵", 82, 26, 12]])],
    ["I hold the pole and ride so high,\nI wave at Dad as I go by.", scene(DAY, GRASS, [["🎠", 44, 54, 48], ["🧒", 44, 36, 14], ["👨", 86, 72, 20, true], ["👋", 74, 58, 12]])],
    ["Round and round the music plays,\nI could ride for days and days.", scene(DAY, GRASS, [["🎠", 50, 54, 56], ["🎶", 22, 28, 16], ["🎶", 78, 26, 16], ["⭐", 50, 14, 10]])],
    ["The ride is done, I slide down low,\nCan I have another go?", scene(DAY, GRASS, [["🎠", 30, 56, 40], ["🧒", 70, 70, 26], ["🎟️", 86, 56, 12]])],
  ]),
  make({ id: "red-kite", title: "My Red Kite", short: "Red Kite", emoji: "🪁", color: "#ff6b6b", dark: "#d64545", shelf: "Class 1", kind: "poem", credit: POEM }, [
    ["I have a kite, a bright red kite,\nIt dances in the sky so light.", scene(DAY, GRASS, [["🪁", 58, 30, 30, false, 15], ["🧒", 30, 70, 26]])],
    ["The wind says whoosh, the string goes tight,\nUp, up, up, it takes its flight.", scene(DAY, GRASS, [["💨", 28, 42, 24], ["🪁", 66, 22, 30, false, 10], ["🧒", 30, 72, 24]])],
    ["It swoops and dips, it spins around,\nIt never ever touches the ground.", scene(DAY, GRASS, [["🪁", 28, 40, 24, false, -20], ["🪁", 72, 28, 24, true, 20], ["☁️", 50, 14, 24]])],
    ["Now wind it in, the day is done,\nMy red kite flew up to the sun.", scene(DUSK, GRASS, [["☀️", 78, 28, 26], ["🪁", 60, 24, 22], ["🧒", 28, 72, 24]])],
  ]),

  // ---------------------------------------------------------------- Class 2
  make({ id: "wind-and-sun", title: "The Wind and the Sun", short: "Wind & Sun", emoji: "🌬️", color: "#f6c945", dark: "#c99a00", shelf: "Class 2", kind: "story", credit: `An Aesop fable. ${TALE}.` }, [
    ["The Wind and the Sun both said, “I am stronger!”", scene(DAY, undefined, [["💨", 28, 44, 30], ["☀️", 72, 40, 30]])],
    ["They saw a man walking along in a warm coat.", scene(DAY, GRASS, [["🚶", 50, 68, 28], ["🧥", 72, 72, 14], ["🌳", 18, 52, 30]])],
    ["“Let us see who can make him take it off!”", scene(DAY, GRASS, [["💨", 28, 40, 24], ["☀️", 74, 34, 24], ["🚶", 50, 70, 26]])],
    ["The Wind blew and blew with all his might.", scene(STORM, GRASS, [["💨", 26, 42, 30], ["💨", 46, 54, 22], ["🚶", 70, 70, 26, true], ["🍂", 56, 34, 12]])],
    ["But the man only held his coat tighter.", scene(STORM, GRASS, [["💨", 24, 46, 24], ["🥶", 62, 48, 16], ["🚶", 62, 70, 28]])],
    ["Then the Sun shone, warm and bright.", scene(DAY, GRASS, [["☀️", 50, 28, 40], ["🌷", 20, 76, 14], ["🌷", 80, 76, 14], ["🚶", 50, 70, 24]])],
    ["Soon the man felt hot. Off came his coat!", scene(DAY, GRASS, [["☀️", 78, 26, 30], ["🥵", 44, 48, 16], ["🚶", 44, 70, 28], ["🧥", 70, 76, 16, false, 20]])],
    ["“Being gentle can be stronger than being loud,” said the Sun.", scene(DAY, GRASS, [["☀️", 50, 28, 40], ["💨", 20, 44, 18], ["😊", 50, 56, 14], ["🌷", 30, 78, 14], ["🌷", 70, 78, 14]])],
  ]),
  make({ id: "smart-monkey", title: "The Smart Monkey", short: "Smart Monkey", emoji: "🐒", color: "#8ac926", dark: "#5a9a10", shelf: "Class 2", kind: "story", credit: `A folk tale. ${TALE}.` }, [
    ["A little monkey lived in a tree by a river.", scene(DAY, WATER, [["🌳", 24, 44, 52], ["🐒", 26, 40, 18]])],
    ["One day he wanted the sweet fruits on the other side.", scene(DAY, WATER, [["🌳", 14, 48, 36], ["🐒", 18, 42, 14], ["🌴", 88, 48, 34], ["🍇", 84, 40, 14]])],
    ["A crocodile swam by. “I can carry you across!” he said.", scene(DAY, WATER, [["🐊", 56, 68, 40], ["🐒", 24, 50, 20], ["🌳", 12, 44, 30]])],
    ["The monkey hopped on the crocodile’s back.", scene(DAY, WATER, [["🐊", 50, 70, 44], ["🐒", 50, 52, 20]])],
    ["In the middle of the river, the crocodile grinned. “I am hungry!”", scene(DAY, WATER, [["🐊", 50, 70, 44], ["🐒", 50, 52, 20], ["😋", 76, 46, 14]])],
    ["The monkey thought fast. “Oh! I left my sweet fruit on the tree!”", scene(DAY, WATER, [["🐊", 50, 70, 44], ["🐒", 50, 52, 20], ["💭", 76, 32, 22], ["🍇", 76, 30, 10]])],
    ["“Take me back and I will share it!” The crocodile swam back.", scene(DAY, WATER, [["🐊", 56, 70, 40, true], ["🐒", 56, 52, 20], ["🌳", 14, 48, 36]])],
    ["Hop! The monkey leaped up the tree. A quick mind keeps you safe!", scene(DAY, WATER, [["🌳", 50, 40, 64], ["🐒", 50, 30, 20], ["🐊", 84, 72, 26, true], ["😄", 68, 30, 12]])],
  ]),
  make({ id: "curlylocks", title: "Curlylocks and the Three Bears", short: "Curlylocks", emoji: "👧", color: "#d4a373", dark: "#a1744a", shelf: "Class 2", kind: "story", credit: `A traditional tale. ${TALE}.` }, [
    ["Curlylocks went for a walk in the woods.", scene(DAY, WOODS, [["🌳", 16, 46, 40], ["🌲", 86, 48, 40], ["👧", 50, 66, 32]])],
    ["She found a little house. Nobody was home!", scene(DAY, GRASS, [["🏠", 60, 52, 50], ["👧", 24, 68, 28]])],
    ["On the table were three bowls of porridge.", scene(HOUSE, FLOOR, [["🥣", 28, 64, 24], ["🥣", 50, 64, 24], ["🥣", 72, 64, 24]])],
    ["Papa’s was too hot. Mama’s was too cold. Baby’s was just right!", scene(HOUSE, FLOOR, [["🥣", 28, 62, 24], ["🔥", 28, 44, 14], ["🥣", 50, 62, 24], ["❄️", 50, 44, 14], ["🥣", 72, 62, 24], ["✨", 72, 44, 14]])],
    ["She ate it all up. Then she sat in Baby’s chair. Crack!", scene(HOUSE, FLOOR, [["🪑", 44, 62, 34], ["💥", 56, 50, 18], ["👧", 68, 66, 24]])],
    ["Upstairs, she fell asleep in the smallest bed.", scene(HOUSE, FLOOR, [["🛏️", 22, 60, 26], ["🛏️", 48, 60, 26], ["🛏️", 76, 60, 22], ["😴", 76, 40, 14]])],
    ["The three bears came home. “Someone has been here!”", scene(HOUSE, FLOOR, [["🐻", 24, 66, 32], ["🐻", 50, 68, 28], ["🐻", 76, 70, 20, true], ["❗", 50, 32, 16]])],
    ["Curlylocks woke up, said sorry, and ran all the way home.", scene(DAY, GRASS, [["👧", 30, 66, 30], ["💨", 14, 62, 16], ["🏠", 78, 52, 40], ["🐻", 56, 72, 16]])],
  ]),
  make({ id: "rain-rain", title: "Rain, Rain", short: "Rain", emoji: "🌧️", color: "#74c0fc", dark: "#339af0", shelf: "Class 2", kind: "poem", credit: POEM }, [
    ["Pitter-patter, drip and drop,\nRain is falling, will it stop?", scene(RAIN, "#6fb56a", [["☁️", 50, 22, 50], ["💧", 34, 46, 10], ["💧", 52, 54, 10], ["💧", 66, 44, 10], ["🏠", 50, 68, 30]])],
    ["Puddles shine and puddles splash,\nJump right in with a happy dash!", scene(RAIN, "#6fb56a", [["🧒", 44, 64, 30], ["💦", 64, 70, 22], ["☔", 44, 38, 22]])],
    ["Frogs are singing, “Croak, croak, croak!”\nRain is dancing on the oak.", scene(RAIN, "#6fb56a", [["🐸", 30, 68, 28], ["🌳", 72, 46, 50], ["💧", 58, 26, 10], ["🎵", 46, 46, 14]])],
    ["Then the sun peeks through the grey,\nA rainbow shines, hooray, hooray!", scene(DAY, GRASS, [["☀️", 78, 20, 26], ["🌈", 44, 40, 60], ["🐸", 24, 74, 18]])],
  ]),
  make({ id: "clouds", title: "Clouds", emoji: "☁️", color: "#74b9ff", dark: "#4a90d9", shelf: "Class 2", kind: "poem", credit: POEM }, [
    ["Fluffy clouds up in the sky,\nSailing, sailing, floating by.", scene(DAY, undefined, [["☁️", 30, 34, 40], ["☁️", 70, 52, 36], ["☁️", 50, 16, 24]])],
    ["That one looks just like a sheep,\nThis one looks like a bear asleep.", scene(DAY, undefined, [["🐑", 30, 40, 32], ["🐻", 70, 50, 30]])],
    ["That one is a dragon’s tail,\nThis one is a sailing whale!", scene(DAY, undefined, [["🐉", 30, 40, 32], ["🐋", 70, 50, 32]])],
    ["When they turn grey they bring the rain,\nThen they float away again.", scene(RAIN, "#6fb56a", [["🌧️", 30, 36, 34], ["☁️", 72, 30, 34], ["💧", 30, 62, 8]])],
  ]),
  make({ id: "little-drops", title: "Little Drops of Water", short: "Little Drops", emoji: "💧", color: "#4d96ff", dark: "#2b6fd6", shelf: "Class 2", kind: "poem", credit: "By Julia Fletcher Carney, 1845 (public domain)" }, [
    ["Little drops of water,\nLittle grains of sand,", scene(DAY, SAND, [["💧", 30, 36, 24], ["💧", 50, 48, 20], ["💧", 70, 36, 24], ["🏖️", 50, 74, 40]])],
    ["Make the mighty ocean\nAnd the beauteous land.", scene(DAY, WATER, [["🌊", 32, 60, 56], ["🏞️", 72, 44, 40], ["☀️", 80, 14, 20]])],
    ["And the little moments,\nHumble though they be,", scene(DAY, GRASS, [["⏳", 30, 52, 28], ["🕰️", 70, 52, 28]])],
    ["Make the mighty ages\nOf eternity.", scene(NIGHT, undefined, [["🌌", 50, 42, 70], ["⭐", 20, 16, 12], ["⭐", 80, 18, 12]])],
  ]),

  // ---------------------------------------------------------------- Class 3
  make({ id: "enormous-turnip", title: "The Enormous Turnip", short: "Big Turnip", emoji: "🍠", color: "#9b5de5", dark: "#6c3bb0", shelf: "Class 3", kind: "story", credit: `A folk tale. ${TALE}.` }, [
    ["Grandfather planted a little turnip seed.", scene(DAY, GRASS, [["👴", 40, 66, 32], ["🌱", 66, 76, 16]])],
    ["The turnip grew and grew. It became enormous!", scene(DAY, GRASS, [["🍠", 50, 62, 60], ["🌿", 50, 34, 18], ["☀️", 84, 18, 20], ["💧", 20, 28, 10]])],
    ["Grandfather pulled and pulled, but it would not come out.", scene(DAY, GRASS, [["👴", 30, 66, 32], ["🍠", 70, 64, 40], ["💦", 22, 46, 10]])],
    ["Grandmother came. She pulled Grandfather, and he pulled the turnip.", scene(DAY, GRASS, [["👵", 12, 68, 24], ["👴", 34, 66, 26], ["🍠", 72, 64, 40]])],
    ["Then came the girl, and the dog. Pull, pull, pull!", scene(DAY, GRASS, [["👵", 10, 70, 18], ["👴", 26, 68, 20], ["👧", 42, 70, 18], ["🐕", 56, 72, 16], ["🍠", 82, 62, 34]])],
    ["Then the cat came, and last of all, the tiny mouse!", scene(DAY, GRASS, [["👵", 6, 70, 16], ["👴", 20, 68, 18], ["👧", 34, 70, 16], ["🐕", 46, 72, 14], ["🐈", 57, 72, 14], ["🐭", 67, 74, 10], ["🍠", 86, 62, 28]])],
    ["They all pulled together. Pop! Out came the turnip!", scene(DAY, GRASS, [["💥", 68, 48, 22], ["🍠", 72, 64, 34, false, 30], ["👴", 32, 70, 22, false, -20], ["👵", 16, 72, 18, false, -20], ["🐭", 50, 78, 10]])],
    ["Everyone laughed. Together, they could do it!", scene(DAY, GRASS, [["👵", 18, 68, 22], ["👴", 36, 66, 24], ["👧", 54, 70, 20], ["🐕", 68, 74, 16], ["🍠", 86, 68, 18], ["⭐", 30, 22, 12], ["⭐", 62, 18, 12], ["🎉", 50, 34, 16]])],
  ]),
  make({ id: "down-by-the-sea", title: "Down by the Sea", short: "By the Sea", emoji: "🌊", color: "#2ec4b6", dark: "#1a9488", shelf: "Class 3", kind: "poem", credit: POEM }, [
    ["Down by the sea the waves go splash,\nThey tumble in with a gentle crash.", scene(DAY, SAND, [["🌊", 50, 34, 100], ["☀️", 82, 14, 20]])],
    ["Seashells hide in golden sand,\nI pick them up in my little hand.", scene(DAY, SAND, [["🌊", 50, 26, 100], ["🐚", 30, 70, 20], ["🐚", 56, 76, 16], ["🧒", 76, 64, 26]])],
    ["Little crabs go side to side,\nWaiting for the turning tide.", scene(DAY, SAND, [["🌊", 50, 26, 100], ["🦀", 30, 70, 24], ["🦀", 68, 72, 20, true]])],
    ["The sun goes down, the sky turns red,\nTime for the little fish to bed.", scene(["#ff9966", "#ffd6a5"], WATER, [["☀️", 50, 36, 34], ["🐟", 30, 72, 18], ["🐟", 70, 78, 14, true]])],
  ]),
  make({ id: "good-morning", title: "Good Morning", emoji: "🌅", color: "#ffd166", dark: "#e0a800", shelf: "Class 3", kind: "poem", credit: POEM }, [
    ["Good morning, Sun, you’re up so high,\nYou paint with gold the morning sky.", scene(MORNING, GRASS, [["☀️", 50, 28, 40], ["☁️", 20, 40, 22], ["☁️", 80, 36, 22]])],
    ["Good morning, Birds, you chirp and sing,\nYou welcome every little thing.", scene(MORNING, GRASS, [["🌳", 30, 46, 50], ["🐦", 30, 36, 16], ["🐦", 72, 38, 18, true], ["🎶", 52, 24, 16]])],
    ["Good morning, Flowers, wake up too,\nYou drink the dew that’s fresh and new.", scene(MORNING, GRASS, [["🌷", 24, 70, 22], ["🌻", 50, 66, 28], ["🌸", 76, 72, 22], ["💧", 50, 38, 8]])],
    ["Good morning, Mum, good morning, Dad,\nGood morning, world, I’m very glad!", scene(MORNING, GRASS, [["👩", 26, 68, 28], ["👨", 50, 68, 28], ["🧒", 74, 72, 22], ["❤️", 50, 32, 16]])],
  ]),
  make({ id: "balloon-man", title: "The Balloon Man", short: "Balloon Man", emoji: "🎈", color: "#ef476f", dark: "#c0284f", shelf: "Class 3", kind: "poem", credit: POEM }, [
    ["Red and yellow, green and blue,\nThe balloon man has one for you.", scene(DAY, GRASS, [["🧑", 50, 70, 28], ["🎈", 30, 30, 20], ["🎈", 46, 20, 20], ["🎈", 64, 26, 20], ["🎈", 78, 34, 20]])],
    ["He holds them high up by their string,\nThey bob and dance and swing and swing.", scene(DAY, GRASS, [["🧑", 30, 70, 28], ["🎈", 56, 26, 22, false, -10], ["🎈", 70, 20, 22, false, 10], ["🎈", 84, 32, 22, false, -5]])],
    ["I give him a coin, he smiles at me,\nI pick one as bright as can be.", scene(DAY, GRASS, [["🧑", 28, 68, 28], ["🧒", 72, 70, 24], ["🪙", 50, 56, 12], ["🎈", 30, 28, 18]])],
    ["Up, up, up it floats away,\nI wave goodbye. Hip hip hooray!", scene(DAY, GRASS, [["🧒", 30, 72, 26], ["🎈", 60, 18, 22], ["👋", 44, 56, 14], ["☁️", 78, 28, 22]])],
  ]),
  make({ id: "puppy-and-me", title: "Puppy and Me", short: "Puppy & Me", emoji: "🐶", color: "#bc6c25", dark: "#8a4a14", shelf: "Class 3", kind: "poem", credit: POEM }, [
    ["My puppy wakes up before me,\nHe licks my nose and wags with glee.", scene(MORNING, FLOOR, [["🛏️", 28, 62, 34], ["🐶", 66, 66, 30], ["💕", 66, 42, 12]])],
    ["We race across the garden green,\nThe happiest pair you’ve ever seen.", scene(DAY, GRASS, [["🧒", 30, 66, 28], ["🐶", 64, 70, 26], ["🌳", 86, 46, 34], ["💨", 16, 70, 12]])],
    ["He fetches sticks, I throw them far,\nHe brings them back, my little star.", scene(DAY, GRASS, [["🧒", 24, 66, 26], ["🪵", 52, 56, 12, false, 30], ["🐶", 72, 68, 26, true], ["⭐", 72, 38, 12]])],
    ["At night he curls up by my bed,\nWe dream together, head to head.", scene(NIGHT, "#2f5a52", [["🛏️", 36, 62, 40], ["🐶", 72, 70, 26], ["🌙", 78, 18, 20], ["💤", 54, 38, 16]])],
  ]),
];
