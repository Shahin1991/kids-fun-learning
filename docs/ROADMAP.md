# Roadmap

All modules from requirement.md are implemented. Remaining ideas:

- Tap-to-place alternative to dragging (shapes, sizes, balance scale).
- Generated precache manifest for `sw.js`, so every page works offline after the first load.
- Artwork (Twemoji, public/art) covers animals, vehicles, flags, places and science; extend `scripts/fetch-art.mjs` for more.
- Speech fallback where `speechSynthesis` is missing.
- Math Racer: more question types; Road Runner: difficulty tuning on real devices.
- Apex Highway: ghost/lap modes, more traffic variety; keep Three.js out of the precache.

## Learning-game roadmap (from `docs/GAME_RESEARCH.md`)

Built so far from this research: Number Path, Pattern Parade, First Sound, Clock Time, Robot Path, Tic Tac Toe and Connect 4 (3D, three bot levels, reasoning/planning), Snakes & Ladders and Ludo (3D, bots, 2-4 players; Ludo has three bot levels), Uno (animated cards, 1-3 bots, three levels).

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

## Board and card games: follow-ups
- Pass-and-play for Tic Tac Toe and Connect 4 (done for Snakes & Ladders, Ludo, Uno and Math Racer).
- Online two-device play (needs a room code and either WebRTC with a signalling step or a small relay server; game moves are tiny, so only the matchmaking needs a service).
- Uno: "UNO!" call button for older kids (currently shouted automatically), stacking +2/+4, and a house-rules switch.
- Ludo: optional rules (safe-square blocks, three sixes forfeit) behind a "classic rules" toggle.
- Snakes & Ladders: choose board themes; read the square number aloud as the pawn hops.
- Test with real children: the bots' timing (about 1s per move) was picked by feel.

## Picture Books: next
- Story books (a short story over 6-10 pages with a character and a repeating phrase), not only concept books.
- Read-along: highlight each word as it is spoken, tap a word to hear it.
- "Make your own book": pick a picture per page, add a title, save it on the shelf.
- A "bookmark" that remembers the last page per book, and a first-run hint on the shelf.
- More shelves unlocked by stars (collection feeling), seasonal books.
