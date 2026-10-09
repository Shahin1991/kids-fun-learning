# Kids mobile UX audit (October 2026)

Method: pages loaded in a 390x760 phone-sized frame and driven by hand (home, Uno, Ludo, Memory Match, Snake, Animals, Connect 4), plus code review of the shared shells. Not yet tested on real devices with real children; treat the sizes below as starting points.

## Fixed in this pass
| Problem | Why it hurts a child | Fix |
|---|---|---|
| **Connect 4: "am I moving or dropping?"** Touch dropped the disc the instant a finger landed, so there was no way to aim; a mouse hovered and clicked differently from touch. | The child cannot predict where the disc will go, and an accidental touch is an irreversible move. | One rule on every device: **slide to aim, let go to drop.** While aiming, the column lights up, a ghost disc shows the exact landing slot, a bobbing arrow sits over the hovering disc, and the instruction is on screen. Letting go off the board cancels (the disc wiggles). Once the disc falls, the guide and arrow disappear, so "aiming" and "dropping" look different. Camera now leaves room above the board so the hovering disc is always visible. |
| Header buttons were 80px each and pushed the **sound button off-screen** on phones (Memory, Uno, most pages); the page title wrapped over 3 lines. | Controls hidden, wasted vertical space, title unreadable. | Round buttons are 56px on phones (80px from tablet width up), titles wrap cleanly with the speaker icon beside them. |
| Home header: title wrapped in 3 lines and the three toggles were clipped. | Same. | Smaller title on phones, toggles shrink and stay on screen. |
| Home "jump to age group" tiles: tiny, uneven labels ("Other Games" wrapped). | Hard to read and hit. | Equal-height tiles with short labels (Ages 2-3, Ages 4-6, Ages 7-8, More). |
| **Uno: the player's hand was below the fold** and the options took a third of the screen. | A child could not see their own cards without scrolling. | Uno is exactly one screen tall; the hand is always visible. |
| Game options (players, level) were rows of chips crowding the play area in Ludo, Snakes & Ladders, Tic Tac Toe, Connect 4, Uno. | Visual clutter next to the one thing a child should press. | Options live behind a ⚙️ button in a bottom sheet with big chips; the play screen keeps only the message, the main action and New game. |
| Animals (portrait phone): small animals huddled in the middle with empty grass below. | Tiny tap targets for toddlers. | Animals are ~40% larger and the camera tilts so the rows fan out. |
| Earlier: white scrolling area on game pages; colour borders missing on game cards; first-tap issues on Tic Tac Toe (tall tap boxes). | Confusing, looks broken. | Fixed in previous commits. |

## Still to do (ranked)
1. **Home is a very long list (30+ games).** Add a first-run "How old are you?" picker (or per-child profiles) that opens just that age group, with the others collapsed.
2. **Voice relies on the browser's speech synthesis.** On devices with no voice, non-readers get silence. Record real voice-over for titles, greetings and the main prompts.
3. **Stars on every toddler card ("⭐ 0")** are noise for 2-3 year olds. Hide counts at zero; show them only after a first star.
4. **Other 3D toddler games (Colors, Shapes, Sizes, Feelings)** should get the same portrait-phone check as Animals.
5. **Real-device pass**: tap-target sizes (bottom-edge palm touches on tablets), low-end Android frame rate (the 3D boards are heavy in software rendering), landscape on phones.
6. **Undo for slips**: Memory Match and Uno are forgiving; Connect 4 and Tic Tac Toe drops are final. Consider a one-time "oops" undo for the youngest level.
7. **Pass-and-play** so two children can share a device in the board games.
8. **Reduced motion and sound-off first-run hints** (a short "tap to hear" cue the first time the page speaks).
