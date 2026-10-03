# Notes

- Apex Highway and Road Runner use crash/lives states, which deviates from the "no fail states" principle. Keep them labelled as such.
- The parent PIN is salted+hashed but this is **not real security**; it only deters small children.
- All data stays on-device (IndexedDB / localStorage). No analytics, no network calls beyond fetching static assets.
- `npm audit` reports advisories only in the `eslint-config-next` dev toolchain (braces/micromatch); `next` itself is clean. The suggested `--force` fix downgrades to Next 14 tooling, so do not apply it.

## Lint rules to remember (React Compiler-era react-hooks)
- No synchronous `setState` in an effect body; wrap in `setTimeout(fn, 0)` or call from async callbacks.
- Don't mutate or read refs during render; no impure calls (`Date.now`, `Math.random`) in render. Use lazy `useState` initialisers and `ClientOnly` for random content.
- Declare helpers before the effects that use them.
