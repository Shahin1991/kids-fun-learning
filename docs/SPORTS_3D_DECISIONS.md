# 3D sports games: research and decision log

Built in October 2026: **Carrom**, **Snooker**, **Darts** and **Archery** (`/advanced/*`).
The brief was to "research the best way to implement these as 3D interactive online games, implement, test, commit and push, and when there are questions take the suggested option but document the question, the options and the decision". This file is that record.

## Research summary

- **Table games (carrom, snooker): use a dedicated ball solver, not a general physics engine.** Billiards is hard to get right with generic engines. Most browser pool games write their own ball–ball physics because spin and precise contacts are awkward in Cannon/Oimo, and fast balls tunnel unless you add many sub-steps. Cannon-style engines can also drop contacts from early internal sub-steps, and restitution changes with the timestep. Carrom builds hit the same problems: engine "friction" covers body-to-body contact, not sliding on the board, so coins creep forever unless you add surface damping. A Roblox carrom system uses 8 sub-steps per tick to stop tunnelling. ([Babylon.js forum](https://forum.babylonjs.com/t/making-a-billiard-game-which-physics-library-is-better/9206), [Cocos forum](https://forum.cocos.org/t/3d-physics-collision-problem-with-maxsubstep-1/94699), [Forge2D issue](https://polar.sh/flame-engine/forge2d/issues/88), [Phaser forum](https://phaser.discourse.group/t/collision-detection/9819), [BuiltByBit carrom system](https://builtbybit.com/resources/pro-carrom-board-game-system.112663/))
- **Aiming on touch screens.** Mobile darts usually uses the flick as the throw, but reviewers find it imprecise. Archery games split the input: touch to draw, drag to aim, release to fire. Players complain when the screen does not show where they are aiming, so an aim preview helps. ([Pocket Gamer](https://www.pocketgamer.com/darts/review/), [Macworld](https://www.macworld.com/article/1138754/darts.html), [Archery Clash listing](https://oceanol.com/game/11130.html))

## Decisions

Each entry gives the question, the options, and what was chosen and why. Every choice was the "suggested/recommended" one.

### 1. Physics for carrom and snooker
- **Options:** (a) cannon-es (already a dependency, used by Block Tower), (b) Rapier (WASM), (c) a custom 2D circle solver drawn in Three.js.
- **Chosen: (c)** `src/lib/sports3d/physics2d.ts`. It is deterministic and pure, so it can be unit-tested. It sub-steps on speed, so nothing moves more than a quarter of a radius per step, and there is no tunnelling. Surface friction is a constant deceleration plus speed-proportional drag, collisions are impulses with restitution, cushions are axis-aligned, and pockets are capture circles. Because it is cheap and deterministic, the robot can simulate candidate shots ahead of time. Rapier would add about 1.5 MB of WASM (see NOTES, Block Tower).

### 2. Physics for darts and archery
- **Options:** rigid-body projectiles in an engine, or analytic flight (a lerp plus an arc) to a computed hit point.
- **Chosen: analytic.** The hit point is decided at release (aim + hand wobble, + wind/drop for archery), then the dart/arrow flies a short arc to it. This gives exact, fair scoring and no physics edge cases.

### 3. Table-game aiming input
- **Options:** (a) rotate-the-cue + separate power slider (8 Ball Pool style), (b) a slingshot pull-back anchored on the cue ball/striker, (c) a flick.
- **Chosen: (b).** It is one gesture: pull back and the shot goes the other way, harder the further you pull. Letting go close to the ball cancels the shot. Power is measured in screen pixels, so it feels the same on any screen. A guide line shows the first ball hit, a ghost ball, and that ball's departure line, and a power ring changes colour from green to red.

### 4. Darts input
- **Options:** flick-to-throw, or aim-then-release.
- **Chosen: aim-then-release.** Touch shows a reticle (lifted 70 px above a finger so it isn't hidden), you slide to move it, and let go to throw. The reticle wobbles gently like a hand, by level. Research found flicks imprecise and noted that players want visible aim feedback.

### 5. Archery input
- **Options:** the same as darts, a slingshot, or press-and-hold to draw.
- **Chosen: hold to draw (0.7 s to full), slide to aim, release.** Real archery splits draw and aim, and this keeps archery different from darts. Letting go early drops the arrow low. The sight ring goes from red to green as the bow is drawn. Holding longer than 3 s adds fatigue wobble.

### 6. Rules: simplify for children?
- **Carrom.** Options: ICF rules (own colour, queen must be covered, fouls) or point carrom. **Chosen: kid-friendly point carrom.** Anyone may pocket any coin: white 20, black 10, queen 50, and the queen counts straight away. Pocketing a coin gives another shot. Pocketing the striker just ends the turn. You may shoot in any direction. Settings: Quick (7 coins) or Full (19).
- **Snooker.** Options: full rules or simplified. **Chosen: real core rules, with the hard parts left out.**
  - Kept: red then colour, colours re-spotted while reds remain, then the colours in order. Fouls give the opponent at least 4 (or the value of the balls involved). Reds potted on a foul stay down. Ball in hand in the D after an in-off.
  - Left out: free ball, the miss rule, nominating (the first colour hit counts as nominated), and the re-spotted black on a tie (a tie is a draw).
  - Settings: 3 / 6 / 10 / 15 reds. Default is **6**, so a frame fits a child's attention span.
- **Darts.** Options: 501 (needs a double to finish), Around the Clock, or Count Up. **Chosen: Count Up**, with 3 darts per turn and 3 / 5 / 8 rounds. The HUD shows the sum ("20 + 5 + 60 = 85") and speaks the total, which is the maths practice. Real board geometry and segment order are used.
- **Archery.** **Chosen:** a World Archery 10-ring face at 18 m, 3 arrows per end, 3 or 5 ends. Wind is 0 on Easy, up to 2 m/s on Medium and up to 4 m/s on Hard. It is shown by a flag and the HUD, and it changes every end.

### 7. Sizes: real proportions or enlarged?
- **Chosen: real layouts with friendlier sizes.** Snooker balls are drawn about 30% larger than 52.5 mm and the pockets are generous. Carrom pockets are 3 cm larger in radius than the real ones. Dartboard and archery-face geometry is exact, and only the level-based wobble makes them easier or harder.

### 8. Opponents
- **Options:** solo only, vs robot, pass-and-play, or online two-device play.
- **Chosen: Robot, Friend (pass-and-play) and Just me, in all four games.** Online play needs a room/relay service, which does not fit the offline-first app (see ROADMAP "online two-device play").
- **Robot design.** In carrom and snooker, Robo lists "ghost ball" shots for each legal target and pocket, plus direct hits. In carrom it also tries several striker positions. It simulates up to 36–48 of them with the real physics, scores each with the real rules (fouls are negative), and adds angle and power error by level. The work is spread across frames, about 7 ms per frame. In darts and archery it aims at a sensible spot (bull or treble 20, or the gold) with Gaussian spread by level. On Hard archery it mostly corrects for wind.

### 9. Age group and rewards
- **Options:** "Other Games" (arcade, no stars) or "7-8 Years" (advanced).
- **Chosen: 7-8 Years.** These games involve scoring arithmetic and planning angles. To fit the no-fail-states principle, **finishing a game earns a star whoever wins** (`finishActivity`, with the child's score saved).

### 10. Camera and layout
- **Chosen:** Carrom and snooker use a fixed, tilted top-down camera fitted to the screen. In landscape, the snooker table turns sideways. There is no free orbit, because kids lose the table. Darts and archery are first person. Archery uses a narrow "aiming lens" with a separate overlay camera for the bow, and zooms in on the target after each arrow.

### 11. Sound
- **Chosen:** new synthesised effects in `tone-generator.ts`: clack, knock, thud, whoosh and plunk. They play through `audioManager.playSfx`, so they follow the sound toggle and add no audio files to the offline cache. Results are spoken with the existing speech helper.

## Testing done
- Unit tests in `src/lib/sports3d/sports3d.test.ts` cover these areas:
  - Physics: momentum, no tunnelling, cushions, pockets, stopping distance, the aim ray-cast.
  - Carrom: layout and scoring, and that the robot finds a pot.
  - Snooker: rack, break flow, fouls, the colour sequence, corner pockets.
  - Darts: segments, rings, sums, robot spread.
  - Archery: rings and wind.
- Played in Chrome on the dev server:
  - Carrom: slide, aim, shoot, scoring and robot turns.
  - Snooker: aim guide and cue stick, foul flow and robot turns.
  - Darts: three-dart turns, sums and robot turns.
  - Archery: draw, aim and release, a full game to the end panel, settings, and Hard-level wind.
  - Landscape snooker layout checked.
- `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all pass.

## Follow-ups (not done)
- Spin/English in snooker and a "cue ball path after contact" line on Easy.
- Keyboard or switch control for aiming (the shells are pointer-only today).
- Real-device tuning of power curves and robot difficulty with children.
- Carrom: optional ICF rules (own colour, cover the queen) behind a "Classic rules" toggle.
