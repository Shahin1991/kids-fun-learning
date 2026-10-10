# Notes

- Apex Highway and Road Runner use crash/lives states, which deviates from the "no fail states" principle. Keep them labelled as such.
- The parent PIN is salted+hashed but this is **not real security**; it only deters small children.
- All data stays on-device (IndexedDB / localStorage). No analytics, no network calls beyond fetching static assets.
- `npm audit` reports advisories only in the `eslint-config-next` dev toolchain (braces/micromatch); `next` itself is clean. The suggested `--force` fix downgrades to Next 14 tooling, so do not apply it.

## Lint rules to remember (React Compiler-era react-hooks)
- No synchronous `setState` in an effect body; wrap in `setTimeout(fn, 0)` or call from async callbacks.
- Don't mutate or read refs during render; no impure calls (`Date.now`, `Math.random`) in render. Use lazy `useState` initialisers and `ClientOnly` for random content.
- Declare helpers before the effects that use them.

## Block Tower physics
- Uses `cannon-es` (pure JS, no WASM) with Three.js rendering; Rapier would add a ~1.5 MB WASM binary.
- Settings were tuned in a headless simulation: friction 0.8, no bounce, low spin and a short drop keep towers stackable. Blocks are mostly locked to the screen plane (`linearFactor.z`, `angularFactor`).
- Sounds are played by the page through `audioManager` so they follow the sound toggle; pitch rises with tower height.

## Letter & Number Parade / Balloon Pop
- Letters and numbers are chunky tubes built from stroke data in `src/lib/parade/glyphs.ts` (no font file; three's npm package ships none).
- Balloon shapes are registered by name in `src/lib/balloons/BalloonEngine.ts` (`SHAPES` + `ENABLED_SHAPES`); an animal balloon is one new builder function returning `{ group, body, string }`.
- Both games share `src/lib/fx/stage.ts` (renderer/teardown) and `src/lib/fx/confetti.ts`.

## 3D toddler games (toy3d kit)
- Animals, Colors, Shapes, Tap Party, Feelings and Big/Small are Three.js scenes built on `src/lib/toy3d/ToyScene.ts` (renderer, loop, picking, confetti, teardown) and shown through the generic `src/components/toy3d/ToyGame.tsx` shell, which also renders hidden keyboard buttons for each item.
- Animals are procedural rounded toys (`toy3d/animals.ts`: quad / bird / frog templates + per-species specs); faces are drawn on canvas (`toy3d/faces.ts`); shape outlines live in `toy3d/outlines.ts`.
- Shapes and Big/Small sort mode also accept a plain tap (sends the piece home), so dragging is optional.
- Tap Party deliberately awards no stars (spec).

## Dark mode
- Colours come from CSS tokens in `src/app/globals.css` (`--background`, `--foreground`, `--surface`, `--*-dark`); `:root[data-theme="dark"]` overrides them. Use `bg-surface` / `text-foreground` instead of `bg-white` / `text-slate-*`, and `text-ink` for text on fixed bright colours.
- `ThemeProvider` keeps the choice (`system | light | dark`) in localStorage; an inline script in `layout.tsx` sets `data-theme` before first paint to avoid a flash. Toggle: home header; full control in the parent dashboard.
- The 3D game worlds keep their own bright scenes; only the surrounding UI (header, pills, buttons) follows the theme.

## Alphabet & Numbers (3D)
- Alphabet = Letter Land (`lib/letter-land/LetterEngine.ts`): giant tube letter + picture + word, 26 tappable letters, and a Trace mode (beads from `trace.ts`, lit by dragging).
- Numbers = Counting Garden (`lib/counting-garden/CountingEngine.ts`): tap animals to count them one by one, then tap the giant number answer; questions and levels come from `lib/numbers/questions.ts`.
- Lesson: invisible tap boxes must hug the object. Oversized boxes on items near the camera swallow taps meant for things behind them.

## Math Racer (3D)
- `lib/math-racer/RacerEngine.ts` builds a scrolling road, trees and rival cars around a coupe from the Apex Highway vehicle builder. Right answer = `boost()` (speed lines, flame, hop); wrong = `wobble()` only, so the car never loses speed or progress. Answer 10 and `finish()` brings in a finish gantry, confetti and a win panel.
- The question pill deliberately has no exit animation, so the new question always shows even if frames are dropped.

## Apex Highway / arcade updates
- Chase camera removed (Follow and Cockpit remain; saved "chase" prefs fall back to Follow).
- Coasting: thrust only comes from the pedal; lifting off gives engine braking + speed-squared drag. Inputs are released on blur, tab hide and lost pointer capture.
- Van, bus, ambulance and fire engine upper bodies are rounded, raked extrusions with tumblehome and crowned roofs (`rakeFront`/`rakeRear` on `BoxSpec`).
- City Bloxx (`/others/city-bloxx`): pure logic in `lib/arcade/bloxx.ts`.
- Cake Bakery v2 (`/early-learning/cake-bakery`): 3D bakery (`lib/cake-bakery/BakeryEngine.ts`, a ToyScene) with customer orders. Six stations (pantry jars, whisk circles, hold-to-pour + oven, frost by painting a per-tier canvas, pipe/topping decorating, serve). Pure rules in `recipe.ts` (orders grow with `served`, scoring is never below 1 star) and `unlocks.ts` (gifts by total coins, no spending), saved in localStorage. Skipping a station auto-completes the earlier ones.
- Magna Tiles (`/early-learning/magna-tiles`): `lib/magna-tiles/geometry.ts` (hinge maths, tested) + `MagnaEngine` (ToyScene subclass with orbit camera). The camera rests on one of 12 fixed views (`VIEWS`: front, right, back, left, top, bottom, 4 corners, front/back high), chosen from the 🧭 menu or by swiping sideways; no free orbit. Tiles snap on edges with a chosen inside angle (Flat/Open/Wall/Tent/Pyramid) and a Flip side toggle; the selected leaf tile can be re-folded live.

## Picture Books (`/early-learning/books`)
- `data/books.ts` defines books as plain data (`BookDef` with `BookPage`s): ABC, Counting, Animal Friends, Colour and Shape books are generated from the existing alphabet/animals/colours/shapes data. A new book is one more entry; a page needs only `caption`, `say`, a `bg`/`fg` colour and one visual (`emoji` (+`count`), `art`, `swatch` or `shapePath`).
- `components/books/BookShelf.tsx`: wooden bookcase; tapping a spine measures its on-screen rect and passes the offset/scale to the viewer, which flies in from that spot (and flies back on close).
- `components/books/BookViewer.tsx`: CSS-3D flip book. Each sheet is a `Leaf` with front and back faces turning about the left (spine) edge; rotation is a framer `motionValue` per leaf, driven by the finger while dragging and settled with a spring on release (flick or >30% drag turns the page). Shading on the turning sheet, the shadow it casts on the page below and the shifting of the open spread to the centre are all derived from those values. Z-order: the sheet being turned is lifted to z-index 1000 while it moves. Pages are read aloud when they open; tap a page to hear it again; arrows and keyboard also work.
- Pages are single-sided on purpose (works on phones); on wide screens the left half shows the back of the turned sheet.
- Page turns play `audioManager.playPaper(forward)`: a synthesised paper swish (`renderPageTurnSamples` in `lib/audio/tone-generator.ts`: band-passed noise sweeping upward, a crinkle gain, and a soft landing tap), three variants plus random speed, a little slower going backwards. No audio files. It plays when a turn commits (button, key, tap or finished swipe), not on a swipe that springs back.

## Apex Highway scenery (`lib/apex-highway/scenery.ts`, `world.ts`)
- Mountains are three vertex-coloured ridge strips (ridged fractal noise; forest > rock > snow, lit side lighter) at increasing distance, tinted toward the sky colour for haze. Slopes are sampled over a wide window, otherwise neighbouring columns alternate in brightness and stripe the ridge; octaves are capped so detail is never finer than the sample step (that made needle spikes).
- Trees: pine (5 cones), oak (5 lumpy blobs), poplar, bush, all jittered low-poly merged geometry with per-instance colour (a few autumn oaks), plus a dense far tree line. The nature layout repeats every 120 m, the city every 160 m (the road's lane markings still repeat every 40 m), so scenery does not visibly loop every 40 m. The road group shifts by `distance % period`.
- City: 7 building archetypes with window textures that tile at real-world size (UVs scaled per geometry), lit-window emissive map driven by night, shop signs, paving ground, and a two-layer skyline with night lights. Built lazily the first time it is needed.
- `World.setEnvironment(env, instant?)` swaps scenery behind a short fog fade. Garage chips: Country / City / Auto (Auto alternates every 4 km).

## Pass-and-play (two people, one device)
- `lib/board-games/seats.ts`: the first `humans` seats are people (names "You" for one person, "Player 1/2" for two), the rest are robots (Robo, Froggy, Unicorn). Settings sheet: "Who is playing?" (1 or 2 people) and "How many seats?" (2-4). Choice is saved per game.
- Snakes & Ladders and Ludo: engines take `humans` and use `isHuman(seat)`; only a person can press Roll or tap pawns, the message says "Player 2's turn! Pass the device, then roll". Ludo seats map to board colours via the player set, so two people plus a robot is red/green/yellow.
- Uno: secret hands. With two people, whenever it becomes a person's turn and they have not confirmed, a full-screen curtain says "Pass the device to Player 2!" and the cards stay face-down until they tap "I'm Player 2!". During robot turns the hand is hidden too. With one person nothing changes.
- Math Racer: `RacerEngine.setPlayers(1|2)`. Two cars side by side (no computer rivals), each player has their own question and answer buttons on their half of the screen, the leader pulls ahead by 3.2 m per answer lead, first to 10 wins. The camera looks lower and nearer in two-player mode so the cars stay above the answer panels.
