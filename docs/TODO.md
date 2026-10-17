# TODO

Work queued for later. Each item has the current state, the goal, and a researched approach.

## 1. Apex Highway: realistic headlights and tail lights

**Now** (`src/lib/apex-highway/vehicle-builder.ts`, `makeHeadlamp` / `makeTaillamp` / `setLights`):
lamps are small extruded shapes with a `MeshStandardMaterial` emissive, one additive `Sprite`
glow per lamp, and a flat light-pool decal on the road. Under ACES tone mapping
(`engine.ts`) the emissive whites get compressed to a dull cream, there is no bloom, and the
glow sprite looks the same from every angle, so the lights read as painted stickers.

**Goal:** lamps that look like real LED/projector units: a bright white-hot core, a soft halo
that grows when the lamp faces the camera, a visible beam at dusk/night, and red tail lights
that clearly flare when braking.

**Approach** (cheapest first; each step is useful on its own):
1. **HDR emissive that survives tone mapping.** Give the bulb/DRL/tail-lens materials
   `toneMapped: false` and an emissive colour above 1.0 (e.g. `emissive * 4–8`) so the core
   reads as pure white/red. Split each lamp into *core* (tiny, very bright) and *housing*
   (chrome reflector with `envMap` and low roughness) so there is contrast.
2. **View-dependent glare sprite.** Replace the fixed glow sprite with a custom
   `ShaderMaterial` (additive, `depthWrite: false`) whose opacity and size scale with
   `max(0, dot(lampForward, toCamera))^k`, so the halo blooms when the lamp points at the
   camera (oncoming traffic, chase-cam tail lights) and fades side-on. Add a faint horizontal
   anamorphic streak and a 4–6 point starburst texture for the headlights. three.js also ships
   `Lensflare` (`three/addons/objects/Lensflare.js`), which is cheap enough for the player car.
3. **Selective bloom on lamp cores only.** `EffectComposer` + `UnrealBloomPass` (or
   pmndrs `postprocessing` `SelectiveBloomEffect`) with a high threshold so only the
   `toneMapped: false` cores bloom. Keep tone mapping as the *last* pass (`OutputPass`) and use a
   `HalfFloatType` render target. Gate it behind a quality check: off on low-end tablets,
   where the sprite approach from step 2 is the fallback.
4. **Fake volumetric beam at night.** An open cone mesh in front of each headlight with an
   additive shader: alpha = edge falloff `pow(1 - abs(dot(N, V)), k)` × distance fade from the
   lamp, no shadows, `depthWrite: false`. Fade it in with `night` in `setLights`. Keep the
   existing road light-pool decal but give it a soft elliptical texture that brightens with the
   beam.
5. **Brake / indicator polish.** Brake = tail core intensity ×3 plus a larger glare sprite
   (already partly there); add a third high-mounted brake strip; animate indicators with a
   0.5 s blink for AI cars that change lanes.

Check it in: day and night, the chase cam, oncoming traffic in the other lane, and an iPad-class
device for frame rate (target 60 fps; the bloom pass must be optional).

References:
- [Optimizing bloom for vehicle lights (three.js forum)](https://discourse.threejs.org/t/optimizing-bloom-effect-in-three-js-for-vehicle-lights/66900): selective bloom vs. lens flares for vehicle lights
- [Best way to achieve a glow effect (three.js forum)](https://discourse.threejs.org/t/whats-the-best-way-to-achieve-a-glow-effect/59724): tone mapping last, half-float targets
- [Selective bloom without layers (three.js forum)](https://discourse.threejs.org/t/how-to-get-selective-bloom-to-work-without-layers/57728)
- [Volumetric light rays with three.js (Codrops)](https://tympanus.net/codrops/2022/06/27/volumetric-light-rays-with-three-js)
- [Fake volumetric light (Blender Artists)](https://blenderartists.org/t/fake-volumetric-light/598153): facing-ratio cone falloff

## 2. Audio is too robotic: kid-friendly voice and sounds

**Now:**
- Speech is the browser's `speechSynthesis` (`AudioManager.speak`) with `pitch = 1.3`,
  `rate = 0.85`, and whatever English voice `pickVoice` finds. On many devices that is a flat
  system voice, and the raised pitch makes it sound more synthetic, not more friendly.
- Every sound effect is a sine/triangle tone generated in `src/lib/audio/tone-generator.ts`
  (success, gentle, reward, tap, pop, bell, music), so the effects sound like beeps.

**Goal:** a warm, natural, child-friendly voice and playful, real-sounding effects, still fully
offline with no network calls.

**Options to evaluate:**
1. **Quick win (hours):** better voice picking and settings. Prefer the high-quality voices
   ("Enhanced"/"Premium"/"Natural" on Apple, "Google UK/US English" on Android and Chrome),
   drop pitch to around 1.05–1.1, and let the parent choose the voice in the dashboard with a
   "test" button.
2. **Recorded voice-over (best quality):** record or commission the fixed phrases (praise,
   instructions, numbers 0–20, letters, the word lists in `src/data/`) as small compressed
   files (Opus/AAC, about 10–20 KB each) under `public/voice/`, precached by the service
   worker. Use them first and fall back to `speechSynthesis` for anything dynamic. This was
   already in the roadmap ("Recorded voice-over fallback"). It means relaxing the
   "no audio files" rule in `docs/NOTES.md`.
3. **On-device neural TTS:** [Piper](https://github.com/Mintplex-Labs/piper-tts-web)
   in the browser through ONNX/WASM. It sounds natural, works offline once the voice model is
   cached, and runs on Safari without WebGPU. The cost is a model download (roughly 20–60 MB per
   voice) and a CPU spike per phrase, so pre-render at build time instead and ship the
   phrases as files (this is option 2 without a voice actor).
4. **Sound effects:** replace the generated beeps with a small set of CC0 kid-game sounds
   (sparkle, boing, pop, cheer, xylophone, drum, animal sounds), e.g. from Kenney.nl or
   freesound (CC0 filter), about 30 files of a few KB each. Keep `tone-generator.ts` as the
   fallback. Keep the dynamic-pitch idea (pentatonic progress) by changing the `rate` on the
   recorded sample.

Decide: which voice (gender, accent, en-US/en-GB), the licence for any recordings, and the extra
offline cache size (currently about 4.5 MB).

References:
- [piper-tts-web](https://github.com/Mintplex-Labs/piper-tts-web): browser Piper TTS, works offline with local WASM and a cached model
- [Offline Piper in the browser (demo)](https://offlinetts.com/app/piper/): runs without WebGPU, Safari included
