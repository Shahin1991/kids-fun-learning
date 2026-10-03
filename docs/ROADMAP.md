# Roadmap

All modules from requirement.md are implemented. Remaining ideas:

- Tap-to-place alternative to dragging (shapes, sizes, balance scale).
- Generated precache manifest for `sw.js`, so every page works offline after the first load.
- Artwork (Twemoji, public/art) covers animals, vehicles, flags, places and science; extend `scripts/fetch-art.mjs` for more.
- Speech fallback where `speechSynthesis` is missing.
- Math Racer: more question types; Road Runner: difficulty tuning on real devices.
- Apex Highway: ghost/lap modes, more traffic variety; keep Three.js out of the precache.
