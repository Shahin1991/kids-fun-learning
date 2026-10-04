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
