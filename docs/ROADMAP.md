# Roadmap

All modules from requirement.md are implemented. Remaining ideas:

- Tap-to-place alternative to dragging (shapes, sizes, balance scale).
- Artwork (Twemoji, public/art) covers animals, vehicles, flags, places and science; extend `scripts/fetch-art.mjs` for more.
- Speech fallback where `speechSynthesis` is missing.
- Math Racer: more question types; Road Runner: difficulty tuning on real devices.
- Apex Highway: ghost/lap modes, more traffic variety.

## Learning-game roadmap (from `docs/GAME_RESEARCH.md`)

Built so far from this research: Number Path, Pattern Parade, First Sound, Clock Time, Robot Path, Tic Tac Toe and Connect 4 (3D, three bot levels, reasoning/planning), Snakes & Ladders and Ludo (3D, bots, 2-4 players; Ludo has three bot levels), Uno (animated cards, 1-3 bots, three levels).

Memory and reasoning ideas still to build: Simon Says (repeat the sequence), What's Missing?, Odd One Out, Sliding Puzzle, Nim (take 1-3 sticks), Checkers-lite. (Sudoku now has its own entry below.)

Built in the October 2026 pass: **Make Ten**, **Rhyme Time**, **Word Builder** (tap-to-place letters), **Coin Shop** (USD / GBP / AED, exact pay and change), **Music Maker** (xylophone: free play, copy-me, four songs) and **Colouring** (tap-to-fill pages and finger painting).

Built in the October 2026 sports pass: **Carrom**, **Snooker**, **Darts** (count-up maths) and **Archery** (wind), all 3D with Robo / pass-and-play / solo. Decisions: `docs/SPORTS_3D_DECISIONS.md`.

Built in the October 2026 physics pass: **Peg Drop** (count the cups), **Catapult** (knock the towers down) and **Marble Run** (ramp puzzles). Decisions: `docs/PHYSICS_GAMES.md`. Researched but not built yet: **Domino Chain**, **Hamster Ball Maze** (tilt), **Float or Sink** (buoyancy) and **Fire Hose** (water arcs); see that file for the plan for each.

Next, roughly by expected learning value:
1. **Robot Path 2**: loops ("repeat 3 times"), turn left/right commands, "fix the broken program" levels; adds computational-thinking depth.
2. **Tangram / Jigsaw** (5-8): spatial reasoning; tap-to-rotate, snap to silhouette.
3. **Number Path to 100** with skip-count dice (2s, 5s, 10s) and a hundreds chart.
4. **Sort It** (4-6): sort objects by category (animals / vehicles / food) and by attribute (colour, size); Odd One Out as an easier mode.
5. **Story Order** (5-7): put 3-4 picture cards in the right order (sequencing, early comprehension).
6. **Fractions Pizza** (7-8): split and share; halves, quarters.

Cross-cutting UX to-dos:
- See `docs/CHILD_UX_REVIEW.md` (October 2026) for the ranked child-development and UX findings: voice muted by the sound button, the play-limit lock, the default PIN, one-tap exits, "Other Games", duplicate jingles and endless loops.
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

## Logic and word puzzles: next
- **Sudoku for kids** (4-8): logic and deduction. Start with a 4x4 grid of pictures (animals, fruit), move to 4x4 numbers, then 6x6 for ages 7-8. Tap a cell, then tap a picture or number to fill it in (tap-to-place, no dragging). There is no way to fail: a clash wobbles and glows on both cells instead of saying "wrong", and a hint button fills one safe cell. Puzzles are generated with a single solution (a small solver in `src/lib/sudoku/` with vitest tests, like `robot-path.test.ts`).
- **Crossword puzzles** (6-8): spelling and vocabulary, which also fills the 7-8 literacy gap. Mini 5x5 grids with picture clues (the Twemoji art in `public/art`) and the clue read aloud. Letters are filled by tapping from a small letter tray, reusing the Word Builder tile UI. Words come from themed lists (animals, colours, CBSE Class 1-3 book words). Completed words light up and are spoken. Puzzle layouts are hand-made JSON at first, with a generator later.

Built in the late October 2026 pass: **Peekaboo Farm** (2-3: tap the barn, hay, bush, pond, crate and sunflowers to find hiding animals; after one round it asks "Where is the pig?"), **Juice Stand** (4-6: blend what each customer orders, then count their coins or work out change; shares the currency setting with Coin Shop) and **Hindi & Arabic** (7-8: the CBSE varnamala with the "क से कबूतर" chant, the 28 Arabic letters, १-१० and ١-١٠; tracing is paint-the-letter coverage on a self-hosted Baloo font, since these scripts have no hand-made stroke skeletons). Speech uses the device's Hindi or Arabic voice (`audioManager.speakIn`) and falls back to an English-voice spelling. Then built: **Car Wash** (2-3: rub the mud off, which leaves foam, then rinse the foam; mud and foam are canvas layers clipped to the car outline, and the step ends at 86% wiped), **Dress for the Weather** (2-3: sunny, rainy or snowy; only the right clothes go on, and the tray grows from one extra item to the whole wardrobe), **Bead Builder** (4-6: copy or continue AB, AAB, ABC and AABB patterns; each bead has its own colour and shape, and finished necklaces collect below the string) and **Tens & Ones** (7-8: build the number from sticks, tie ten into a bundle and ten bundles into a hundred; the right total with ten or more loose sticks asks for a bundle first, and every third round asks "What number is this?"). Next batch built: **Dino Dig** (4-6: brush the sand to uncover bones; a bone counts as found when 60% of its cells are clear of sand, and the skeleton fills in until the dinosaur roars), **Clean-Up & Recycle** (4-6: tap litter, then the paper, plastic or food bin, with cans added later; flowers bloom as the park clears), **Rangoli Maker** (7-8: kaleidoscope drawing with 8, 12 or 16 matching parts, petal stamps and kolam guide dots) and **Treasure Map** (7-8: follow 1-3 compass clues on a grid island; the X shows only on the first map, and water and edges bump you back). Last batch built: **Train Track Builder** (4-6: lay track square by square from the station to a place, around trees, rocks and ponds; from level 2 a passenger waits by the line and must be picked up; tap a piece to pick the track back up), **Road Safety** (4-6: press the button or stand at the zebra kerb, wait for the cars to stop, look left and right, then walk; cars always queue politely before the crossing, and every third round is a picture quiz), **My Lunchbox** (4-6: one food from each of five groups, energy, body-building, fruit, vegetables and a drink; treats are "sometimes food" and stay out; from level 2 the child also picks the spot) and **Measure It** / **Tally & Charts** (7-8: blocks along a toy, then a ruler that later doesn't start at 0, then cups into containers where the taller one can hold less; tally animals walking past in gates of five, draw the bar chart, then answer most/fewest/how many more/altogether). Every idea from the October 2026 list is now built. Hindi & Arabic follow-up: stroke-order guides for the most common letters, and matras (का कि की).

## Recommended next (gaps found in the October 2026 audit)
Coverage is thinnest in social-emotional learning, literacy for 7-8 and toddler logic. In priority order:
1. **Calm Corner** (4-8): a breathing bubble to follow, a feelings check-in, and kind-choice stories. Social-emotional is the biggest gap after the toddler Feelings game.
2. **Story Order** (5-7): put 3-4 picture cards in order; reuses the books' `Scene` art.
3. **Sort It / Odd One Out** (3-6): sort by category or colour on `PickRound`; gives toddlers a simple logic game.
4. **Sight Words and Little Readers** (6-8): read a short sentence and pick its picture; ages 7-8 have no literacy activity yet.
5. **Simon Says / What's Missing?** (4-7): memory games; Music Maker's copy-me engine can drive Simon Says.
6. **Sudoku for kids** and **Mini Crosswords** (4-8): logic and spelling puzzles; see "Logic and word puzzles: next".
7. **Body Parts and My Day** (2-4): tap-the-nose and daily-routine sequencing for toddlers.
8. **Tracing 2**: numbers and pre-writing lines (the Alphabet trace engine already exists).
9. **Fractions Pizza** and a **Hundreds Chart** (7-8).
10. Cross-cutting: per-child profiles with a parent progress report, persisted difficulty per game, and recorded voice-over as a speech fallback.
11. **Child voices** (all ages): device speech voices are adult only; raising the pitch ("Squeaky", "Bright") sounds robotic, not like a child. Cloud text-to-speech has child voices (Amazon Polly: Ivy, Justin, Kevin; Azure: Ana, Maisie; check the current lists), but calling it live would break offline play and put a key in the app. Plan: a build script sends every spoken line to the service once and saves audio files into the app (precached, so they work offline); `audioManager.speak` plays the file when one exists and falls back to device speech otherwise. Main work: 74 speech call sites, 24 of them built from templates (picture names, numbers), which must be listed out or split into fixed pieces. Generation costs a few dollars at most. Needs a Polly or Azure account and key, set up by the parent.
