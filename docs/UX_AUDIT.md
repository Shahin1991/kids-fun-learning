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

## Second pass (done)
- **Age picker on first visit** ("How old are you?", spoken, 4 big buttons). Picking an age opens just that group and collapses the others into one big button each with a game count. Changeable from the 🎂 chip on the home screen; the choice is remembered on the device.
- **"⭐ 0" hidden on game cards** until the child has earned a first star.
- **Portrait-phone check of the 3D toddler games:** Colors and Feelings now use bigger balls and faces on tall screens (about +20-25%, capped so rows do not hide each other); the Shapes hint text no longer gets clipped.
- **"↩️ Oops" in Tic Tac Toe and Connect 4:** takes back your last move and the bot's reply (Connect 4 discs slip out of the bottom). Only on your turn, never after the game has ended.

## Still to do (ranked)
1. **Voice relies on the browser's speech synthesis.** On devices with no voice, non-readers get silence. Record real voice-over for titles, greetings and the main prompts.
2. **Real-device pass**: tap-target sizes (bottom-edge palm touches on tablets), low-end Android frame rate (the 3D boards are heavy in software rendering), landscape on phones, and the new age picker with real children.
3. **Pass-and-play** so two children can share a device in the board games.
4. **Colors/Feelings still leave a lot of empty space on tall phones**; a dedicated portrait layout (bigger items filling the screen) would be better than scaling the landscape one.
5. **First-run sound cue**: browsers block speech until the first tap, so the very first spoken line is lost. Show a "tap to hear 🔊" nudge once.
6. **Undo/"are you sure" for Uno wild-colour and Ludo pawn picks** if testing shows slips.
