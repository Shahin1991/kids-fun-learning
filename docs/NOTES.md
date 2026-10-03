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
