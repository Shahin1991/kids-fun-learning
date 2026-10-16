# Roadmap

All modules from requirement.md are implemented. Remaining ideas:

- Tap-to-place alternative to dragging (shapes, sizes, balance scale).
- Artwork (Twemoji, public/art) covers animals, vehicles, flags, places and science; extend `scripts/fetch-art.mjs` for more.
- Speech fallback where `speechSynthesis` is missing.
- Math Racer: more question types; Road Runner: difficulty tuning on real devices.
- Apex Highway: ghost/lap modes, more traffic variety.

## Learning-game roadmap (from `docs/GAME_RESEARCH.md`)

Built so far from this research: Number Path, Pattern Parade, First Sound, Clock Time, Robot Path, Tic Tac Toe and Connect 4 (3D, three bot levels, reasoning/planning), Snakes & Ladders and Ludo (3D, bots, 2-4 players; Ludo has three bot levels), Uno (animated cards, 1-3 bots, three levels).

Memory and reasoning ideas still to build: Simon Says (repeat the sequence), What's Missing?, Odd One Out, Sliding Puzzle, Sudoku for kids (4x4 pictures), Nim (take 1-3 sticks), Checkers-lite.

Built in the October 2026 pass: **Make Ten**, **Rhyme Time**, **Word Builder** (tap-to-place letters), **Coin Shop** (USD / GBP / AED, exact pay and change), **Music Maker** (xylophone: free play, copy-me, four songs) and **Colouring** (tap-to-fill pages and finger painting).

Next, roughly by expected learning value:
1. **Robot Path 2**: loops ("repeat 3 times"), turn left/right commands, "fix the broken program" levels; adds computational-thinking depth.
2. **Tangram / Jigsaw** (5-8): spatial reasoning; tap-to-rotate, snap to silhouette.
3. **Number Path to 100** with skip-count dice (2s, 5s, 10s) and a hundreds chart.
4. **Sort It** (4-6): sort objects by category (animals / vehicles / food) and by attribute (colour, size); Odd One Out as an easier mode.
5. **Story Order** (5-7): put 3-4 picture cards in the right order (sequencing, early comprehension).
6. **Fractions Pizza** (7-8): split and share; halves, quarters.

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

## Recommended next (gaps found in the October 2026 audit)
Coverage is thinnest in social-emotional learning, literacy for 7-8 and toddler logic. In priority order:
1. **Calm Corner** (4-8): a breathing bubble to follow, a feelings check-in, and kind-choice stories. Social-emotional is the biggest gap after the toddler Feelings game.
2. **Story Order** (5-7): put 3-4 picture cards in order; reuses the books' `Scene` art.
3. **Sort It / Odd One Out** (3-6): sort by category or colour on `PickRound`; gives toddlers a simple logic game.
4. **Sight Words and Little Readers** (6-8): read a short sentence and pick its picture; ages 7-8 have no literacy activity yet.
5. **Simon Says / What's Missing?** (4-7): memory games; Music Maker's copy-me engine can drive Simon Says.
6. **Body Parts and My Day** (2-4): tap-the-nose and daily-routine sequencing for toddlers.
7. **Tracing 2**: numbers and pre-writing lines (the Alphabet trace engine already exists).
8. **Fractions Pizza** and a **Hundreds Chart** (7-8).
9. Cross-cutting: per-child profiles with a parent progress report, persisted difficulty per game, and recorded voice-over as a speech fallback.
