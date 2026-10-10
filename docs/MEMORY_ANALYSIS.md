# Memory analysis (October 2026)

## How it was measured
- A Chrome tab with the dev build, instrumented to count live WebGL textures/buffers/programs, WebGL contexts opened and lost, and `performance.memory.usedJSHeapSize`.
- Scripted client-side navigation: home -> game (9 s) -> home (3.5 s), for each game. 9 games finished before the run was stopped (the background tab is heavily throttled, so a full 16-game x 2-round run would have taken over an hour).
- A second tab sampled the heap every 5 s while driving in Apex Highway.
- Caveats: dev build (extra code and React StrictMode double-mounts), throttled background tab (so per-frame allocation is under-represented), GPU memory cannot be read from JS (contexts and resource counts were used as a proxy).

## Results
| Game | JS heap in -> after leaving | WebGL context opened/lost |
|---|---|---|
| Apex Highway | 100.7 -> 90.4 MB | 1 / 1 |
| Block Tower | 90.8 -> 91.8 | 2 / 2 |
| Magna Tiles | 91.9 -> 93.5 | 4 / 4 (cumulative) |
| Cake Bakery | 93.7 -> 97.0 | 6 / 6 |
| Animals | 95.3 -> 98.7 | 8 / 8 |
| Balloon Pop | 96.4 -> 99.1 | 9 / 9 |
| Tic Tac Toe | 88.8 -> 70.0 | 11 / 11 |
| Connect 4 | 72.0 -> 44.9 | 13 / 13 |
| Apex Highway, driving 35 s | 22.6 -> 28.8 MB, flat after the first 10 s | n/a |

- **No leaked WebGL contexts**: every context opened is lost again when leaving a page (Chrome allows about 16 live contexts, so this is the main risk for an app with many 3D games, and it is clean).
- **No per-visit heap growth in the nine games measured.** The heap drifts up only a few MB while the first games load (more code and module caches) and then drops sharply once a game is left (Tic Tac Toe -19 MB, Connect 4 -27 MB).
- **No growth while driving** in Apex Highway after the initial ramp.
- Games not reached in the run: Ludo, Snakes & Ladders, Uno, Picture Books, Memory, Letter Parade, Math Racer, Road Runner (and the second round). They use the same shared teardown (`ToyScene`/`Stage`), and Ludo/Snakes explicitly dispose their dice textures, but they are unmeasured.
- The extra context opened per 3D page in the table is React StrictMode mounting twice in development; it does not happen in a production build.

## Risks found by reading the code, and what was done
1. **Apex Highway built and threw away a whole traffic car about once a second** (about 150 meshes and a dozen materials each). That is garbage-collection churn and a hitch at every spawn. **Fixed:** traffic cars are now pooled per kind (up to 3 parked), repainted and reused; the pool is disposed with the engine.
2. **Connect 4 Hard bot** copies the board at every search node. Measured: about 53 ms per move on a desktop (worst 117 ms), about 5 MB of short-lived garbage. Fine on a laptop, but a slow phone could stall for half a second. Not changed. Options: search in place on one mutable board (no copies, roughly 5x faster), or run the search in a Web Worker.
3. **Big canvas textures when a board game opens:** Ludo 1500x1500 (about 9 MB canvas plus GPU copy and mipmaps), Snakes & Ladders 1280x1280. Fine on modern phones; on very low-end devices use 1024. Not changed.
4. `Stage.dispose` frees geometries and materials but not the textures they reference. The GPU side is released anyway by `forceContextLoss()`, and the canvases are garbage-collected, so this is only a tidiness issue; disposing textures explicitly would be safer.
5. Small module-level caches live for the whole session: floating-icon textures, Apex label textures, the Tic Tac Toe minimax memo (a few thousand entries). All tiny.
6. Progress rows in IndexedDB grow one row per finished activity (bytes each); fine.

## Next time
- Run the full loop in a **foreground** tab (or use DevTools heap snapshots) so Ludo, Snakes & Ladders, Uno, Picture Books and a second round can be compared.
- Add a dev-only on-screen counter (`renderer.info.memory`) to the 3D pages so texture/geometry counts are visible while playing.
- Test on a low-end Android phone with Chrome's task manager open (GPU process memory is the number that matters there).
