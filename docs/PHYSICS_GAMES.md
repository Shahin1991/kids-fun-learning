# Physics games: research and decisions

Built in October 2026 after fixing Block Tower's jerky animation: **Peg Drop** and **Catapult** (Ages 4-6, `/early-learning/*`) and **Marble Run** (Ages 7-8, `/advanced/marble-run`).

## Research summary
- Physics apps that young children love are about **cause and effect** with a clear goal: machines and gravity in Tinybop Simple Machines, Thinkrolls, Monster Physics and Where's My Water? ([Fatherly](https://www.fatherly.com/gear/the-best-physics-apps-for-kids/), [SmileTutor](https://smiletutor.sg/best-physics-games-apps-that-explain-forces-of-nature-to-your-kids/), [Common Sense Media list](https://www.commonsensemedia.org/lists/physics-games-for-kids)).
- Ramp-and-ball goal puzzles are a staple (Ramps, Labo Marble Race), but the harder ones are rated 9+ because of their difficulty, so younger players need help built in ([Common Sense: Ramps](https://www.commonsensemedia.org/app-reviews/ramps), [Common Sense: Apparatus](https://www.commonsensemedia.org/app-reviews/apparatus), [ParentMap](https://www.parentmap.com/article/best-science-stem-apps-kid/13)).
- PBS Kids aims ramps, rolling and simple machines at ages 4-8: Roll to the Rescue, Hamster Run, and Ramp and Roll with its "Hit the Target" game ([PBS Ruff Ruffman](https://www.pbs.org/parents/shows/ruff), [Ups and Downs activity](https://cms-assets.prod.pbskids.org/global/parents-mezzanines/Ruff_UpsDowns-1.pdf)).

## Decisions (question → options → choice)
1. **Which games to build first?** Options were seven ideas: Peg Drop, Marble Run, Catapult, Domino Chain, Hamster Ball Maze, Float or Sink and Fire Hose. **Chosen: Peg Drop, Catapult and Marble Run**, the ones I recommended. They give the most variety (luck plus maths, aim plus knock-down, building puzzles), reuse the most code, and none of them has a way to fail. The other four are in the roadmap.
2. **Physics engine.** Options: cannon-es (already used by Block Tower), Rapier (a WASM download), or the custom 2D solver from Carrom and Snooker. **Chosen: cannon-es**, because these toys need boxes, stacking and ramps as well as circles, and it adds nothing to the download. All motion is kept in the screen plane.
3. **Shell.** Options: a new shell like Block Tower's, or the sports `SportsGame` shell. **Chosen: `SportsGame`**, with solo play only and a new `levelLabel` prop. That gives the status line, settings, the end screen with a star, pause handling and speech for free.
4. **Ages.** Peg Drop and Catapult are Ages 4-6: simple gestures, and Peg Drop adds up the cups. Marble Run is Ages 7-8 because it needs spatial planning.
5. **Peg Drop maths.** Cup values are symmetric, smallest in the middle where most balls land: Easy 1-3, Medium 1-5, Hard 1-10. Each ball adds to a spoken sum such as "3 + 2 + 1 = 6". The level also sets the number of peg rows (6, 8 or 10).
6. **Catapult help and fairness.**
   - The flight-path dots are long on Easy and short on Hard, and the level sets how far away the tower is.
   - Three shots per tower. When they run out the next tower comes, so you can't lose.
   - Towers start asleep so they never wobble before they're hit.
7. **Marble Run controls.** Options: rotate handles, two-finger twist, or tap-to-tilt. **Chosen: drag to move (snaps to a 0.25 m grid) and tap to tilt through seven angles (−45° to 45° in 15° steps)**, plus tap the marble to go. One finger only, and no extra buttons.
8. **Marble Run help.** After 1, 2 or 4 misses (Easy, Medium, Hard), see-through green ghost ramps show the solution. A ramp dropped near its ghost snaps into place, so every child can finish.
9. **Puzzle quality.** Every puzzle's solution is proved in a unit test with the real physics, and so is "no ramps means a miss". During design I also checked that nudging the solution one grid step still works for 17 of 20 nudges.

## Not built yet (plan)
- **Domino Chain:** draw a path with a finger, dominoes stand along it (cannon-es boxes), tap the first one. The risk is chains stalling, so it needs tuning of spacing and friction.
- **Hamster Ball Maze:** drag to tilt the maze, or use the device's tilt where allowed. A cannon-es sphere in walls.
- **Float or Sink:** guess first, then drop toys into a bath. Buoyancy is an upward force proportional to how much of the toy is under water. It teaches density words.
- **Fire Hose:** aim a water arc at fires using simple flying droplets with gravity, much like the darts flight.
