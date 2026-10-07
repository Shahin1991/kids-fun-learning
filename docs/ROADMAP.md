# Roadmap

All modules from requirement.md are implemented. Remaining ideas:

- Tap-to-place alternative to dragging (shapes, sizes, balance scale).
- Generated precache manifest for `sw.js`, so every page works offline after the first load.
- Artwork (Twemoji, public/art) covers animals, vehicles, flags, places and science; extend `scripts/fetch-art.mjs` for more.
- Speech fallback where `speechSynthesis` is missing.
- Math Racer: more question types; Road Runner: difficulty tuning on real devices.
- Apex Highway: ghost/lap modes, more traffic variety; keep Three.js out of the precache.

## Learning-game roadmap (from `docs/GAME_RESEARCH.md`)

Built so far from this research: Number Path, Pattern Parade, First Sound, Clock Time, Robot Path, Tic Tac Toe and Connect 4 (3D, three bot levels, reasoning/planning).

Memory and reasoning ideas still to build: Simon Says (repeat the sequence), What's Missing?, Odd One Out, Sliding Puzzle, Sudoku for kids (4x4 pictures), Nim (take 1-3 sticks), Checkers-lite.

Next, roughly by expected learning value:
1. **Make Ten** (ages 5-7): ten-frame with counters, "how many more to make 10?"; extends Number Path into number bonds.
2. **Rhyme Time** (4-6): pick the picture that rhymes with the spoken word (cat / hat). Phonological awareness predicts reading.
3. **Word Builder** (5-7): drag letter tiles to spell a pictured 3-letter word (CVC words), with sounded-out letters.
4. **Coin Shop** (7-8): count coins to pay, give change; currency switchable (USD / AED / GBP).
5. **Robot Path 2**: loops ("repeat 3 times"), turn left/right commands, "fix the broken program" levels; adds computational-thinking depth.
6. **Tangram / Jigsaw** (5-8): spatial reasoning; tap-to-rotate, snap to silhouette.
7. **Number Path to 100** with skip-count dice (2s, 5s, 10s) and a hundreds chart.
8. **Sort It** (4-6): sort objects by category (animals / vehicles / food) and by attribute (colour, size); Odd One Out as an easier mode.
9. **Story Order** (5-7): put 3-4 picture cards in the right order (sequencing, early comprehension).
10. **Music Maker** (3-8): tap a keyboard / xylophone, copy short tunes (pattern + memory).
11. **Fractions Pizza** (7-8): split and share; halves, quarters.

Cross-cutting UX to-dos:
- A real voice-over recording (not browser speech synthesis) for the title/greeting lines, so non-English devices and devices without voices still talk.
- Per-child profiles and a parent "what did they practise" report (the parent dashboard already stores per-module progress).
- Adaptive difficulty persisted per game (start where the child left off, not at level 1).
- Playtest with real 3, 5 and 7 year olds; the numbers in the research (target sizes, session length) are starting points.
