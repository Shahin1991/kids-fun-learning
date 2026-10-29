# Child development and UX review (October 2026)

This review looks at the app from two sides: **how a 2-8 year old experiences it** (development fit, motivation, feedback, emotions, self-regulation, safety) and **how well the interface works** (touch, navigation, consistency, accessibility, devices). It builds on `docs/UX_AUDIT.md`, which covered phone layout, and doesn't repeat it.

**Method.** I read the shared shell (home, headers, audio, rewards, play timer, parent area) and grepped all 71 games for cross-cutting patterns. In Chrome at phone size (500×673) I drove first launch, the age picker, the home screen, Animals, Peekaboo Farm, Feelings, Memory Match, Word Builder, Clock Time, Math Racer and Space Impact. The last nine games were play-tested when they were built.

**Not covered.** No real children, no real tablet, and no landscape: the browser window couldn't be resized, so the tablet check failed. The 3D sports and physics games were only looked at in code. Treat the severity labels as a starting point for a playtest, not a verdict.

## What already works well

These are worth keeping as the house rules for every new game:

- **No fail states in the learning games.** A wrong answer is a soft "bloop" (`tone-generator.ts:164`, "never a buzzer") plus a wobble and a spoken explanation, never a loss.
- **Good scaffolding in the shared rounds.**
  - `PickRound` explains a wrong pick and makes the right answer glow after two misses.
  - `ChoiceQuiz` repeats the question after 9 seconds of silence, because young children forget it.
- **Rewards for effort, not speed.** No learning game has a countdown or a leaderboard, and stars come from finishing, not from being fast.
- **Privacy.** The app works fully offline and makes no network calls, so there is no tracking and no ads (the only external link is the Twemoji credit in the parent area). Progress stays on the device.
- **Inclusive details.**
  - Bead Builder uses colour *and* shape, so colour-blind children can play.
  - Lunchbox and Juice Stand use a range of names (Riya, Omar, Zara…), and food and stories follow CBSE.
  - Hindi and Arabic are supported.
- **Accessibility basics.** 61 of the 67 animated files respect reduced motion. Buttons have labels, and tap targets are 56px or more.
- **Feelings validates emotions.** Its lines are warm ("It's okay to feel sad. Hugs help!").
- **Parent gate with lockout.** Wrong PINs wait 1s, 2s, 4s… up to 30s, so trying every PIN is slow.

## Findings

Severity: **High** means it can confuse, upset or endanger a child, or undermine a parent's control. **Medium** means it weakens learning or motivation. **Low** means polish.

### High

**1. The mute button also silences the voice.**
- **What happens:** `AudioManager.speak` returns early when sound is off (`src/lib/audio/AudioManager.ts:143`). 🔊 sits in every game header, within a toddler's reach.
- **Why it matters for a child:** children under about 6 can't read, so the voice is their only instructions. One stray tap leaves them in a silent game with no idea what to do, and there's no sign that anything changed.
- **Recommendation:**
  - Split the voice from the sound effects. The header button turns off effects only.
  - Muting the voice moves to the parent dashboard.
  - When a game opens with sound off, show a small "🔇 sound is off, tap to hear" chip.

**2. The play-time limit ends play suddenly, in silence, with a task many children can't do.**
- **What happens:** `PlayTimerGuard` locks the screen the moment time runs out.
  - There's no warning beforehand, the overlay isn't spoken, and it asks for a sum like 14 + 9, getting harder each time.
  - A 2-3 year old can't solve it and can't read "Ask a parent".
  - A 7 year old can solve it every time and extend forever, 5 minutes at a time.
- **Why it matters for a child:** transitions are hard for young children. A sudden stop mid-task is a classic trigger for meltdowns, while a predictable wind-down ("two more minutes, then we finish this one") builds self-regulation. A limit a child can always get around teaches them to get around limits.
- **Recommendation:**
  - Give spoken warnings at 2 minutes and 30 seconds, with a visible sand timer.
  - Let the current round finish before the lock.
  - End with a calm spoken goodbye (the owl yawns, "See you tomorrow!").
  - Add a parent setting for extra time: off, a few times a day, or unlimited.
  - Match the extra-time task to the age group, for example counting pictures for 4-6.

**3. The default PIN `1234` guards the parent area, and the 🔒 that opens it is on the child's home screen.**
- **What happens:** the dashboard says so in a banner (`src/app/parent/page.tsx:114`).
- **Why it matters for a child:** 1234 is the first thing a curious 5 year old tries. Behind it are the module switches, the play limit and the PIN itself.
- **Recommendation:**
  - The first time a parent opens the area, they set their own PIN before anything else, with no default.
  - Hide the 🔒 button on the home screen; the 3-second logo hold already opens the area.
  - Optionally add a grown-up check before the PIN, for example "hold for 3 seconds and answer 7 × 8".

**4. One tap on 🏠 leaves a game mid-play.**
- **What happens:** `HomeButton` is a plain link. `HoldToExitButton` (hold for 1 second, with a ring) exists, but only Balloon Pop uses it.
- **Why it matters for a child:** toddlers rest their palm and grip the corners of a tablet, so they leave games by accident and lose what they made, such as a colouring page or a track half built. Unexpected exits read as "the game broke".
- **Recommendation:** use hold-to-exit in the header for every 2-3 game, and for the 4-6 games where the child builds something (Colouring, Rangoli, Train Track, Magna-Tiles, Block Tower).

**5. "Other Games" breaks the app's own rules and is open to every age.**
- **What happens:**
  - Snake, Space Impact and Bounce have lives and game over.
  - Space Impact is a shooter ("Shoot your way through space").
  - Apex Highway is endless.
  - The instructions are text only ("Drag the screen to fly and shoot…").
  - Alternate Uses needs typing against a 60-second countdown.
  - The group appears for every age and is one tap away from the toddler home.
- **Why it matters for a child:**
  - Losing and game-over loops are fine for many 7-8 year olds but frustrating for younger ones.
  - Shooting content needs a parent's decision.
  - Countdown pressure on a creativity task lowers creativity.
- **Recommendation:**
  - Turn the group off by default, with a parent switch, or show it only for 7-8.
  - Speak the instructions.
  - Make Alternate Uses untimed, with drawing or voice answers instead of typing.
  - **Naming risk:** "Space Impact", "City Bloxx" and "Bounce" are names of existing commercial games. Rename them before any public release.

### Medium

**6. The reward jingle plays twice.**
- **What happens:** 14 games play `audioManager.play("reward")` themselves and also call `finishActivity`. The star then triggers `RewardCelebration`, which plays the same jingle again (`src/components/RewardCelebration.tsx:16`).
  - Clean-Up and Lunchbox play the two copies about a second apart.
  - Train Track plays them at the same moment.
- **Why it matters for a child:** stacked sounds plus a full-screen star burst plus speech is more stimulation than needed, and the extra noise makes the spoken message harder to follow.
- **Recommendation:** let `RewardCelebration` be the only place the jingle plays. Remove `play("reward")` from games on the turns where they award a star.

**7. No natural ending: every game loops forever.**
- **What happens:** almost every game starts a new round, map, park or parade automatically. Nothing ever says "You did it, that's a good place to stop."
- **Why it matters for a child:** natural stopping points help children leave on a high note and practise ending things themselves. Endless loops are the pattern behind "just one more". This matters most when no play limit is set, which is the default.
- **Recommendation:** give each game a session arc. After a set (for example 5 rounds), show a short "Super job!" screen with three choices: play again, try something else, or all done. Even with no limit set, suggest a stretch break after about 20 minutes of play.

**8. Wrong answers are scaffolded unevenly.**
- **What happens:** a wrong answer in Math Racer only plays a sound and wobbles the car (`src/app/advanced/math-racer/page.tsx:80`). There's no explanation and no hint, and the wrong choice stays tappable, so 3 choices can be brute-forced. On a phone I couldn't see the wobble at all.
- **Why it matters for a child:** without a model to follow, a child who doesn't know 1 + 8 learns to tap every choice. With one (count on from 1 along dots), a wrong answer becomes a lesson.
- **Recommendation:** adopt `PickRound`'s rule app-wide as a checklist for every quiz-type game.
  - The first miss gets a spoken explanation and greys out that choice.
  - The second miss shows a visual model, such as dots or a number line, and the right answer glows.

**9. Stars follow different rules in different games, and Rangoli rewards the number of strokes.**
- **What happens:** most games give a star per round, others every 2 or 3 rounds. Rangoli gives one for every 15 strokes (`src/components/rangoli/Rangoli.tsx:10`).
- **Why it matters for a child:** rewarding how much a child draws in an open-ended art tool can shift them from "I'm making something" to "I'm scribbling for stars", which psychologists call the overjustification effect. Uneven cadence also makes stars feel random.
- **Recommendation:**
  - One star for one finished piece of effort, roughly 1-3 minutes of play.
  - In creative tools (Rangoli, Colouring, Music Maker), give the star when the child taps "Done" or saves the picture, not for activity.

**10. Stars lead nowhere, and badges are silent text.**
- **What happens:** there are only 5 badges, and nothing new happens after 10 stars. `BadgeToast` shows a title and description for 3.5 seconds without speaking them.
- **Why it matters for a child:** a pre-reader sees a box appear and vanish. A collection is motivating when it visibly grows: stickers, a garden, a sticker album. That works without comparison or streak pressure.
- **Recommendation:**
  - Speak each badge.
  - Add a sticker book or garden where each star becomes something the child can see, for example one plant per game.
  - Avoid daily streaks, which punish missed days.

**11. The home screen is built for parents, not for the youngest child.**
- **What happens:**
  - On a phone, the first screen is the title, four round toggles (theme, music, sound, lock), the welcome card, the jump bar and "Keep playing". The toddler games start below the fold.
  - "Keep playing" isn't filtered by the chosen age. With 2-3 picked, it showed Tally & Charts, My Lunchbox and Catapult.
  - The age picker offers "Show everything" to the child.
- **Why it matters for a child:** under-4s don't scroll purposefully. Whatever is on the first screen is the app to them, and toggles they don't understand get tapped.
- **Recommendation:**
  - In the 2-3 view, put big game tiles first.
  - Move the theme and music toggles into the parent area.
  - Filter "Keep playing" by age.
  - Make "Show everything" a parent option.

**12. Pre-readers can't hear the names of the games.**
- **What happens:**
  - Home cards show an emoji and a title, and tapping one opens the game straight away; nothing speaks the name (`ModuleCard.tsx`).
  - Some icons are weak signs: 🧽 for Car Wash, ☂️ for Dress for the Weather, 🙈 for Peekaboo Farm.
  - Memory Match's levels are the words Easy, Medium and Hard.
- **Recommendation:**
  - Speak the game's name when its card is pressed and held, or add a small 🔊 to each card.
  - Over time, replace the emoji with illustrated thumbnails that show the activity.
  - Name the Memory levels aloud with the card count ("6 cards").

**13. System emoji as artwork look different on every device, and some are missing.**
- **What happens:**
  - Game art is mostly system emoji, which differ by platform. Emoji cars faced different ways depending on the glyph, which led to the switch to drawn cars in Road Safety.
  - Emoji 15 characters show as blank boxes on iOS below 16.4 and Android below 14: 🫛 (peas, `src/lib/lunchbox/lunch.ts:47`) and 🪭 (fan, `src/data/cvc-words.ts:24`).
  - 🪭 is also the wrong picture for most children: "fan" means an electric fan.
- **Recommendation:**
  - Draw game art from the Twemoji SVGs already in `public/art` (through `ItemArt`), so it's the same everywhere.
  - Short-term: swap 🫛 for 🥬 or another vegetable, and change the "fan" word or its picture.

**14. Feelings names emotions but doesn't practise coping.**
- **What happens:** the Angry line is "Take a deep breath. You are doing great."
- **Why it matters for a child:** the second sentence skips validation. Toddlers learn emotion regulation through a name → validate → cope sequence they can act out.
- **Recommendation:**
  - "You feel angry. That's okay. Let's blow out the candles together", with an animated candle the child blows out by tapping slowly, and similar short coping actions for sad and scared.
  - This connects to the Calm Corner idea on the roadmap. Social-emotional learning (SEL) is still the thinnest area for 4-8.

### Low

**15. Low-contrast text in the dark theme.**
- `text-ink/70` on the dark page background makes Train Track's hint line almost invisible (`src/components/train-track/TrainTrack.tsx:190`).
- The same issue was fixed in Tally & Charts during play-testing.
- Recommendation: add a `text-muted` token that adapts to the theme, and avoid raw `text-ink/NN` outside light cards.

**16. Mixed spelling.** The game titles are "Colors" (US) but "Colouring" and "Colour Mixer" (UK/Indian English, which the rest of the app uses). Rename "Colors" to "Colours".

**17. The parent dashboard is hard to scan.**
- What happens: 71 module checkboxes sit in one flat list with no age groups and no "turn all off", and progress is only stars and play counts.
- Recommendation: group modules by age, with switches for a whole group. Add a "what they practised this week" view in skill terms (counting, letters, telling the time), which the roadmap already lists.

**18. Every spoken line uses the browser voice.** This is already item 1 of the UX audit's to-do list, and it's still the biggest risk for non-readers on devices without a good voice. Also see finding 1.

## Suggested order

1. **Quick fixes (done, October 2026):**
   - Split voice and effects muting (#1).
   - Remove the duplicate jingle (#6).
   - Speak badges and the time-up screen (#10, #2).
   - Spelling, contrast and emoji swaps (#13, #15, #16).
   - Filter "Keep playing" by age (#11).
2. **Safety and control:**
   - Parent sets their own PIN on first use (#3).
   - Hold-to-exit for toddler games (#4).
   - "Other Games" off by default and renamed (#5).
3. **Play-limit redesign:** warnings, finish the round, calm goodbye, and parent control over extra time (#2).
4. **Learning-design pass:**
   - One scaffolding checklist for all quiz games, starting with Math Racer (#8).
   - One star rule (#9).
   - A session arc with natural endings (#7).
5. **Motivation and SEL:**
   - Sticker book or garden (#10).
   - Coping actions in Feelings, then Calm Corner (#14).
   - Spoken card names and illustrated thumbnails (#12).
6. **Playtest with real 3, 5 and 7 year olds on a tablet**, focused on #1, #2, #4, #7 and #11, before tuning anything further.
