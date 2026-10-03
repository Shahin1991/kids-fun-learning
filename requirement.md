# Build "Kids Learning Hub" — an offline-first educational PWA with 3D mini-games

Build a complete, production-ready educational Progressive Web App for children aged 2–8 and deploy it as a fully static site on Cloudflare Pages. Deliver working code, not a plan. Run `npx tsc --noEmit`, `npm run lint` and `npm run build` yourself and fix everything until all three pass. Before writing code, read the docs in `node_modules/next/dist/docs/`, because this Next.js version has breaking changes from older releases.

## 1. Stack
- Next.js 16 (App Router, Turbopack default), React 19, TypeScript (strict), Tailwind CSS v4 (CSS-first `@theme inline` tokens in `src/app/globals.css`, no `tailwind.config.ts`).
- Framer Motion for UI animation, Howler.js for sound playback, Dexie.js (IndexedDB) for storage, Three.js (+ `@types/three`) for the 3D games. npm as package manager.
- Path alias `@/*` → `src/*`. Font: Baloo 2 via `next/font/google`.
- `next.config.ts`: `output: "export"` and `images: { unoptimized: true }`. Every metadata route (`icon.tsx`, `apple-icon.tsx`, `manifest.ts`, icon route handlers) needs `export const dynamic = "force-static"`.
- Cloudflare Pages: add `public/_headers` (no-cache for `/sw.js` and `/manifest.webmanifest`, `Content-Type: image/png` for the extensionless icon routes, immutable year-long cache for `/_next/static/*`) and a `.node-version` file containing `22`. Build command `npm run build`, output directory `out`.

## 2. Non-negotiable design principles (apply to every game)
1. **No fail states.** A wrong answer or placement gets a gentle physical deflection (a block slides back to its tray, a shape wobbles back) with a soft neutral tone. Never use red X icons, buzzers or penalty sounds.
2. **Multisensory redundancy.** Every visual movement (colour glow, squash-and-stretch bounce) is paired with synthesized sound, and audio pitch maps to value or progress.
3. **Dynamic scaffolding.** Start with binary or tiny choices (two colours, numbers 1–3) and progressively reveal wider ranges during the session. No difficulty menus.
Also: touch targets at least 80px (`--spacing-touch: 5rem`), every activity at most 2 taps from home, and everything respects `prefers-reduced-motion` plus a parent-dashboard override.

## 3. App structure
- Home screen: header with logo, sound toggle and music toggle. Below it, sections per age group with module cards (icon, title, star count): "2-3 Years", "4-6 Years", "7-8 Years", "Other Games". Colour tokens: `--color-toddler(-dark)`, `--color-early(-dark)`, `--color-advanced(-dark)`, `--color-others(-dark)` (purple), plus `--color-kid-{red,blue,green,yellow,orange,purple}`.
- `src/data/modules.ts` is the single source of truth: a `MODULES` array of `{id,title,ageGroup,route,icon,colorToken,description}`, plus `AGE_GROUP_LABELS`, `AGE_GROUP_ORDER`, `getModuleById`, `getModulesByAgeGroup`. Adding a module means one entry here plus one route folder.
- Shared components: `PageContainer`, `ActivityHeader` (home button, title, `ProgressStars`, `SoundToggle`), `HomeButton`, `ModuleCard`, `AgeGroupSection`, `LogoLongPress` (3-second long-press on the logo opens the parent area), `Button`, `Card`, `LoadingSpinner`, plus animation wrappers `TapBounce`, `ShakeOnWrong` (gentle wobble), `SuccessPop`, `FadeIn`, `SlideIn`. All of them respect `useAppReducedMotion()` from a `ReducedMotionProvider`.
- Shared animation variants in `src/lib/animations/variants.ts`.

## 4. Audio (no audio files anywhere)
- `src/lib/audio/tone-generator.ts` and `wav-encoder.ts` render short WAV tones procedurally as data URIs. `AudioManager.ts` (singleton) plays them with Howler for success, failure (soft, neutral), reward and background music. It also provides `speak(text)` via `window.speechSynthesis` for spoken words and `playAnimal(onomatopoeia)`. An `AudioProvider` loads the sound and music settings from storage. `SoundToggle` and `MusicToggle` are in the headers.

## 5. Storage and rewards
- Dexie database in `src/lib/storage/db.ts` with tables `settings` (single row id `app-settings`: sounds/music enabled, reduced-motion override, `parentPin` default `1234`, enabled modules), `progress`, `stars` (one row per moduleId) and `achievements`. `AgeGroup` is `"toddler" | "early-learning" | "advanced" | "others"`.
- `src/lib/progress/progress.ts`: `recordActivityCompletion`, `getModuleProgress`, `getAllProgress`, `getBestScore` (max is best), `getBestMoves` (min is best).
- `src/lib/rewards/RewardManager.ts` (`awardStar`, `unlockAchievement`) with a tiny pub/sub (`reward-events.ts`), an achievements catalog in `src/data/achievements.ts`, and global `RewardCelebration` plus `BadgeToast`, `StarBurst` and `ProgressStars` components mounted once in the root layout.
- Parent area: `/parent/unlock` is a PIN pad (default 1234) that sets `sessionStorage["parent-unlocked"]` and routes to `/parent`. The dashboard redirects back if the flag is missing, shows per-module progress, lets parents enable or disable modules, toggle reduced motion and change the PIN. State plainly in a comment that this is not real security.

## 6. Modules to implement (each in its own route folder with data in `src/data/*.ts`)
**Toddler (2-3):**
- `/toddler/animals`: tap an animal to hear its name and sound word.
- `/toddler/colors`: tap a colour to hear its name and see it flash.
- `/toddler/shapes`: drag shapes to matching outlines; wrong drops slide back.
- `/toddler/tap-fun` ("Tap Party"): tap anywhere for firework, confetti, bubble or splash bursts, with a style picker. Deliberately no rewards or achievements and a lightweight custom header.
- `/toddler/sizes`: "Big or Small" tap game with a streak counter and a "Sort Them" drag-to-slot mode.
- `/toddler/emotions`: tap a face to hear its name and an affirming phrase.

**Early learning (4-6):**
- `/early-learning/alphabet`: letters with example words.
- `/early-learning/numbers`: counting objects and simple addition, with questions generated at runtime.
- `/early-learning/memory`: flip-card match with easy, medium and hard sizes, best moves stored.
- `/early-learning/bubble-pop`: mode picker (colours, shapes, letters, numbers), floating bubbles, a spoken and shown prompt, tap the matching bubble. A wrong tap wobbles only that bubble. Use a plain CSS `@keyframes` float on a wrapper around the motion element, never on the motion element itself.
- `/early-learning/balance-scale`: see section 8.

**Advanced (7-8):**
- `/advanced/math-racer`: answer questions to race down the road with the SVG+Framer `CarAnimation` component (states idle, drive-left, drive-right, boost, celebrate).
- `/advanced/vehicles`: Vehicle World with sounds and facts.
- `/advanced/geography`: flags, countries, continents.
- `/advanced/science`: space, plants, weather.
- `/advanced/road-runner`: endless 3-lane dodge game.

**Others:**
- `/others/alternate-uses`: Guilford's Alternate Uses Test. Start, then a random object appears, then a 5-second countdown, then 60 seconds of typing uses. The score is the number of uses, unlocking an achievement at 10 or more.
- `/others/apex-highway`: see section 7.

## 7. Apex Highway (Three.js endless driving game)
Split into `src/lib/apex-highway/` (`vehicle-specs.ts` pure data, `vehicle-builder.ts`, `world.ts`, `engine.ts`, `audio.ts`) and `src/components/apex-highway/ApexHighwayGame.tsx`. The engine is dynamically imported inside a client effect. No reward integration. Prefs and best score live in `localStorage`.
- **Vehicles (6):** Sedan, Sports Coupe, SUV, Pickup, Cargo Van, City Bus, each with its own stats (speed, acceleration, brake, steering) and engine sound character. Bodies are built from extruded side-profile shapes with rounded corners and creased normals, plus glass cabins, pillars, chrome trim, mirrors, door seams and handles, headlights and tail lights with additive glow sprites, wheel arches, spoked wheels that spin and steer, interior seats, dashboard and a steering wheel that turns. Features per type: spoiler, roof rack, pickup bed, van cargo box, bus roof units and stripe. Cache geometry per spec. Glossy `MeshPhysicalMaterial` paint, with 14 paint swatches plus a custom colour picker. Use a `RoomEnvironment` PMREM environment map for reflections.
- **World:** 4 lanes of 3.6m, recycled road segments (scroll modulo, not per-frame reposition), a canvas-generated asphalt texture with dashed dividers and wear tracks, guardrails with instanced posts, street lamps (emissive heads, additive light pools, halos), instanced trees and rocks, grass, overhead gantry signs, far mountains, a gradient sky dome shader, stars, sun and moon sprites and clouds.
- **Day/night:** a smooth lerp of fog, sky, light colours and intensities, tone-mapping exposure, lamp emissive, stars and headlight spot lights. The engine owns two SpotLights and re-parents them when the vehicle changes, to avoid shader recompiles.
- **Driving:** thrust tapers near top speed, quadratic drag, braking, steering lock that shrinks with speed, no turning when stopped, body pitch and roll, guardrail scraping (slowdown and sparks) and a simulated 6-gear RPM model. Three cameras: follow, chase and cockpit/hood. A garage orbit camera shows a turntable. The 3D image shifts to clear the garage panel (side panel on wide screens, bottom sheet on narrow ones).
- **Traffic:** sedans, SUVs, vans, pickups and buses with varied speeds (left lanes faster), following behaviour, occasional safe lane changes, spawn rules that keep one lane free, and multi-sphere bounding-sphere collisions. Close passes give a combo bonus. A crash gives sparks, camera shake and a game-over screen with score, distance, close calls and a saved best.
- **Audio (Web Audio only):** engine from three detuned oscillators through a low-pass filter with RPM-driven pitch, wind and tyre noise beds, guardrail scrape, a horn on H, crash (noise, thump, metal clangs, glass) and a close-call whoosh.
- **UI:** glassmorphism HUD (backdrop-blur panels) with an SVG curved speedometer, digital speed, gear and rev bar, score, distance and best. Top-right buttons for camera, day/night, mute and pause. On-screen touch buttons (left, right, brake, gas) on coarse-pointer or small screens, auto-pause on tab hide, and keyboard controls (WASD/arrows, Space brake, C camera, N night, M mute, H horn, P/Esc pause). A garage menu offers vehicle cards with rating bars, paint swatches, time-of-day and camera selectors, and a start button.
- Note that Apex Highway and Road Runner use crash or lives states, which deviates from the no-fail principle. Keep them labelled as such in repo notes.

## 8. BalanceScaleGame (Three.js, embeddable module)
Two coordinated files plus a route.
- `src/lib/balance-scale/BalanceGameModule.ts`: a pure TypeScript engine. It must never run in Node, with WebGL and Web Audio started only from client lifecycle hooks. Constructor `(container, options)`. Public API: `setMode`, `reset`, `resize`, `destroy`.
- `src/components/balance-scale/BalanceScaleGame.tsx`: a `"use client"` wrapper with props `{ sharedAudioCtx?, mode?: 'sandbox'|'challenge', targetWeight?, onBalanced?({leftWeight,rightWeight,moves}), onExit?, className? }`. It dynamic-imports the engine in an effect, handles window resize with a `ResizeObserver`, and renders overlays. The container has `position: relative`, `overflow: hidden` and `touch-action: none`. Top-left is an exit button, top-centre a status pill ("Make both sides equal" or "Left: 5 | Right: ?"), top-right a reset button. Keep the status pill neutral and never red.
- Route `src/app/early-learning/balance-scale/page.tsx` is a `"use client"` page that loads the wrapper with `next/dynamic` and `ssr: false`, awards a star on balance and records the activity.
- **Visuals:** background `#F7F5F0`, maple wood `0xBA8C63`, brushed-metal pans `0x90A4AE`. Ambient light (white, 0.7) plus a warm directional key light (`0xFFF7E6`, 0.85) with soft shadows. Multiply both intensities by π so they look right under physically based light units. Static base and pedestal, a crossbeam pivoting about the local Z axis and clamped to ±0.42 rad, and pans that counter-rotate so their tops stay horizontal and hang straight below the beam tips.
- **Blocks 1 to 10:** width and depth 0.85, height `0.4 + value*0.18`. The front face has a canvas-drawn embossed numeral with unit tick marks. Colours cycle through `#FF6B6B #4D96FF #6BCB77 #FFD93D #9B51E0 #FF9F43`. No external model or image assets.
- **Interaction:** raycast pointer-down lifts a block and drags it on a camera-facing plane. Releasing over a pan drops it in, and releasing anywhere else slides it back with a soft neutral tone. Tray blocks respawn after each drop so values can repeat. Pan blocks can be dragged out again. Hovering a pan lights a soft gold ring.
- **Physics:** angular acceleration `α = (R−L)·g·arm − k·θ − c·ω`, integrated in fixed substeps, with a bounce-damped clamp at the limits.
- **Equilibrium:** equal non-zero weights with `|θ| < 0.02` sustained for more than 600 ms triggers a chime, a beam glow, staggered block bounces, confetti, and `onBalanced`. The message must clear again when blocks change.
- **Challenge mode:** the left pan starts with locked blocks summing to `targetWeight` (split into blocks of at most 10).
- **Scaffolding:** the tray starts with blocks 1–3 and reveals two more values after each balance, up to 10.
- **Audio:** pickup (sine glide 260→480 Hz over 80 ms, scaled in pitch by block value), drop (triangle 140→40 Hz plus low band-passed noise, plus a quiet pentatonic note for the block value), tilt creak (filtered sawtooth when angular velocity is high), balance chime (triangle arpeggio C5, E5, G5, C6 with decay) and a soft neutral return tone. Track every audio node, disconnect all of them in `destroy()`, and close the `AudioContext` only if the module created it itself.
- **Strict teardown:** cancel the animation frame, remove every listener from the container and window, dispose all geometries, materials and textures (traverse the scene plus tracked arrays), call `renderer.dispose()` and `forceContextLoss()`, and remove the canvas from the DOM.

## 9. PWA
- No `next-pwa` or Workbox (they cause build and dependency problems under Turbopack). Instead write a hand-rolled `public/sw.js`: pre-cache `/` and `/offline`, network-first for navigations with a cache fallback to `/offline`, cache-first for same-origin assets, versioned caches that are cleaned on activate. Register it from `ServiceWorkerRegistration` in production builds only.
- `src/app/manifest.ts`: standalone display, theme colour `#ff6fa5`, background `#fffaf0`, icons at 192, 512 and 512 maskable. Generate icons at build time with `next/og` `ImageResponse` (`src/app/icon.tsx`, `apple-icon.tsx`, `icon-192/route.tsx`, `icon-512/route.tsx`, `icon-512-maskable/route.tsx`) using shared markup in `src/lib/branding/brand-mark.tsx`. Note that Satori does not support `calc()`, so use plain padding. Commit no binary image assets. Add an `/offline` page.

## 10. Lint and code conventions
- This repo's `eslint-config-next` bundles strict React Compiler-era `react-hooks` rules. Do not call `setState` synchronously in an effect body (wrap it in `setTimeout(fn, 0)` and return the cleanup, or call it from async callbacks), do not mutate refs during render (sync them in an effect), and declare helper functions before the effects that use them. Do not read refs in render or pass ref-reading callbacks into functions called during render; use inline handlers instead.
- Comments only for things the code cannot show, one short line each. Avoid over-engineering and unused abstractions.

## 11. Verification checklist before finishing
- `npx tsc --noEmit`, `npm run lint` and `npm run build` all pass, and `out/` contains every route, `sw.js`, `manifest.webmanifest` and the icons.
- Serve `out/` (`npx serve out`) and manually check: install prompt, offline reload of a visited page, parent unlock flow, sound toggles, and a full session of each 3D game, including balancing the scale and driving in all three camera modes, day and night.
- Run `npm audit` and report any advisories, particularly for the `next` version.