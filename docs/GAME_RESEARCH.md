# What helps kids under 10 learn: research notes and how the app uses them

Compiled October 2026 from web research. Evidence strength is noted honestly; treat the weaker items as bets, not facts.

## Game types, ranked by evidence

| Type | Evidence | In the app | Next |
|---|---|---|---|
| **Linear number board games** (roll, count aloud while moving along a numbered path) | Strongest. A University of Oregon review of 18 studies (preschool to grade 2) found ~10 minute sessions improve counting, number recognition and quantity sense ([UO press summary](https://nbc16.com/news/local/playing-number-board-games-boosts-early-math-skills-in-young-children-uo-university-of-oregon-research-reveals)); a K-1 numeracy meta-analysis points to short frequent sessions, several skills at once and concrete-to-abstract sequencing ([UO HEDCO](https://hedcoinstitute.uoregon.edu/sites/default/files/2026-04/feature-of-effective-k-1-early-numeracy-interventions_508-compliant-1.pdf)) | **Number Path** (new), Numbers (Counting Garden), Balance Scale | Number line to 100 with skip counting; "Make Ten" frames |
| **Phonics / letter-sound games with adaptive feedback** | Strong for the GraphoGame family; works as a supplement to teaching, not a replacement ([EEF trial summary](https://www.cne.psychol.cam.ac.uk/files/graphogame_eef_teachers_handbookoct2018.pdf), [PMC study](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8455992/)) | Alphabet (Letter Land), Letter Parade, **First Sound** (new) | Rhyme Time, Word Builder (drag letters), blends |
| **Spatial play: blocks, puzzles** | Correlational; causal evidence mixed ([APS](https://www.psychologicalscience.org/observer/blocks-and-puzzles-may-help-children-learn-spatial-skills)) | Block Tower, Magna Tiles, Shapes | Jigsaw, Tangram, "build what you see" |
| **Patterns** | Promising but tentative; simple abstract shapes work better than real objects ([OSU](https://kb.osu.edu/items/e4be9f22-ea9f-4b8b-9b9e-ee3d599c3dcb), [review](https://theeducationhub.org.nz/wp-content/uploads/2023/05/The-role-of-pattern-in-childrens-early-mathematical-understanding-2.pdf)) | **Pattern Parade** (new) | Growing patterns (1,2,3...), pattern-making mode |
| **Unplugged coding** (sequencing, debugging with arrows or floor robots) | Plausible; many small studies, no proven edge over plugged ([2025 review of 30 studies](https://so13.tci-thaijo.org/index.php/J_IAMSTEM/article/view/419)) | **Robot Path** (new) | Loops ("repeat 3x"), Bee-Bot style turn commands, debugging a broken program |
| **Telling time / money** | Curriculum staples at 6-8; no strong game-specific trials found | **Clock Time** (new) | Coin Shop (counting money, giving change) |

## UX findings for ages 2-8 and what changed

Sources: [Google Building for Kids](https://developers.google.com/building-for-kids/designing-engaging-apps), [Joan Ganz Cooney Center](https://joanganzcooneycenter.org/?p=19607), [UF touchscreen recommendations](https://init.cise.ufl.edu/?p=2368), [UCI preschool-app study](https://news.uci.edu/2018/09/19/most-preschool-math-literacy-apps-not-designed-to-help-children-learn-uci-study-finds). Specific pixel sizes in blogs conflict; use them as starting points and test with real children.

- **Non-readers need voice and pictures, not text.** Every page title is now read aloud on arrival and again when tapped (`SpeakTitle`); the home screen has a talking owl greeting; every new game speaks its question.
- **Repeat instructions after a pause** (only 15% of apps in one study did). `PickRound`, Choice Quiz (Animals/Colors/etc. flash-card games) repeat the question after 9 seconds of no input and make the right answer glow.
- **Wrong answers should explain, not buzz.** Instead of "try again", games now say what the child picked and what to look for ("That is the letter M. Sun starts with S."). Choice Quiz and Bubble Pop were updated too. Two misses make the answer glow, so a child is never stuck.
- **Respond to every action** with sound plus visuals; stars are never taken away. Crash/lives games stay in "Other Games" and are labelled as such.
- **Big targets, simple gestures**: taps and short drags only; new games use 160px answer buttons.
- **Intrinsic over sticker rewards**: stars exist, but the new games also unlock progression (dice grows, robot levels, clock gets harder) as the reward.
- **Short sessions**: each new game awards a star every 5 correct answers (about 2 minutes), matching the "brief and frequent" finding.
- **Adaptive difficulty**: choices grow from 2 to 4, patterns from AB to ABC, clocks from o'clock to quarter past/to, dice from 1-3 to 1-6.

## Roadmap candidates (not yet built)
See `docs/ROADMAP.md`.
