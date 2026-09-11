# Don't Use That Letter! — MVP

A fast-paced word game: you're shown 1–3 forbidden letters and must type a real
English word that avoids all of them before the timer runs out.

This is the **core playable version** (Step 1). No ML yet — that comes next,
as a separate, additive step, per the plan.

## What's included
- `frontend/index.html` — Home, Game, High Score, and Game Over screens
- `frontend/style.css` — dark modern game styling, animations (shake, score
  popups, combo banner, timer urgency)
- `frontend/script.js` — all game logic: timer, lives, score, combo, level
  progression (1 → 2 → 3 forbidden letters), word validation against a local
  724-word dictionary, localStorage high score

## How to run it

No build step, no server required strictly, but a local server avoids any
browser quirks with `autofocus`/inputs on `file://` URLs:

```bash
cd dont-use-that-letter/frontend
python3 -m http.server 8000
```

Then open: **http://localhost:8000**

(Alternatively you can just double-click `index.html` — everything is
self-contained in the three frontend files, no fetch calls, no dependencies.)

## How the game works
- 60-second timer, 3 lives, score starts at 0.
- Level 1 = 1 forbidden letter. After 5 correct answers → level 2 (2 letters).
  After 10 correct → level 3 (3 letters, capped there).
- Every generated letter combo is checked against the word list to guarantee
  a valid word exists (verified with 6,000 randomized trials, 0 unsolvable
  combos).
- Scoring: +10 base, +2 per letter beyond length 3, +10 speed bonus if
  answered within 3 seconds.
- Wrong answer (forbidden letter used, not a real word, empty, or
  non-alphabetic input) costs a life and resets your combo.
- Combo milestones at x5 / x10 / x15 show a banner message.
- Game ends on 0 lives or 0 time; final stats shown with a lightweight
  "AI Player Analysis" panel (currently just your real stats — the ML
  classification layer will plug into this same panel next).
- High score (best score/combo/accuracy) is saved in `localStorage`, no
  backend needed.

## Verified before handoff
- `node -c script.js` — syntax OK
- Word list: 724 unique valid words
- Validation tested: empty input, numeric input, unknown strings, correct
  rejection of forbidden-letter words, correct acceptance of valid words,
  case-insensitivity, whitespace trimming
- Forbidden-letter generator: 6,000 randomized trials across levels 1–3,
  zero unsolvable combinations, zero duplicate-letter combinations

## Next steps (not built yet, by design — see plan)
1. Trap rounds, bonus rounds, shield power-up
2. ML player-skill classifier (scikit-learn, synthetic training data) +
   adaptive difficulty
3. Confetti/extra polish on high score
