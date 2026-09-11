/* =========================================================
   DON'T USE THAT LETTER! - core game logic (MVP, no ML yet)
   ========================================================= */

/* ---------- Word list (embedded so the game works with a
   plain double-click open, no fetch/CORS needed) ---------- */
/* ---------- Word list ----------
   The full dictionary is loaded from words.json.
   This keeps the large word list out of this JavaScript file. */

let WORD_LIST = [];
let WORD_SET = new Set();
let wordsLoaded = false;

async function loadWords() {
  playBtn.disabled = true;
  playBtn.textContent = '⏳ LOADING WORDS...';

  try {
    const response = await fetch('words.json', { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const words = await response.json();

    WORD_LIST = [...new Set(
      words
        .map(w => String(w).trim().toLowerCase())
        .filter(w => /^[a-z]+$/.test(w))
    )];

    WORD_SET = new Set(WORD_LIST);
    wordsLoaded = WORD_LIST.length > 0;

    playBtn.disabled = false;
    playBtn.textContent = '▶ PLAY NOW';

    console.log(`Dictionary loaded: ${WORD_LIST.length.toLocaleString()} words`);
  } catch (error) {
    console.error('Could not load words.json:', error);

    playBtn.disabled = true;
    playBtn.textContent = 'DICTIONARY ERROR';

    feedbackMsg.textContent =
      'Dictionary could not be loaded. Please run the game with Live Server.';

    feedbackMsg.className = 'feedback-msg wrong';
  }
}

/* ---------- DOM references ---------- */
const screens = {
  home: document.getElementById('home-screen'),
  highscore: document.getElementById('highscore-screen'),
  game: document.getElementById('game-screen'),
  gameover: document.getElementById('gameover-screen'),
};

const playBtn = document.getElementById('play-btn');
const highscoreBtn = document.getElementById('highscore-btn');
const hsBackBtn = document.getElementById('hs-back-btn');
const restartBtn = document.getElementById('restart-btn');
const homeBtn = document.getElementById('home-btn');

const hudScore = document.getElementById('hud-score');
const hudCombo = document.getElementById('hud-combo');
const hudLives = document.getElementById('hud-lives');
const hudLevel = document.getElementById('hud-level');
const hudTimer = document.getElementById('hud-timer');

const forbiddenLettersEl = document.getElementById('forbidden-letters');
const forbiddenPluralEl = document.getElementById('forbidden-plural');
const forbiddenPlural2El = document.getElementById('forbidden-plural-2');
const answerForm = document.getElementById('answer-form');
const wordInput = document.getElementById('word-input');
const feedbackMsg = document.getElementById('feedback-msg');
const gameCard = document.getElementById('game-card');
const urgencyBanner = document.getElementById('urgency-banner');
const comboBanner = document.getElementById('combo-banner');

/* ---------- Messages ---------- */
const CORRECT_MESSAGES = ["BIG BRAIN! 🧠", "NICE! 🔥", "THAT WAS FAST! ⚡", "WORD MASTER! 👑", "PERFECT! ✨"];
const WRONG_MESSAGES = ["Oops! That letter was forbidden! 😭", "That letter was literally forbidden! 💀", "TRAPPED! 😈", "Your brain betrayed you 😂"];

/* ---------- Game state ---------- */
const GAME_LENGTH_SECONDS = 60;
const START_LIVES = 3;

let state = null; // fresh object created in startGame()
let timerInterval = null;

function freshState() {
  return {
    score: 0,
    combo: 0,
    bestCombo: 0,
    lives: START_LIVES,
    level: 1,
    timeLeft: GAME_LENGTH_SECONDS,
    forbidden: [],
    roundStartTime: 0,
    correctCount: 0,
    wrongCount: 0,
    running: false,
  };
}

/* ---------- Screen navigation ---------- */
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  screens[name].classList.remove('hidden');
}

/* ---------- High score (localStorage) ---------- */
const HS_KEY = 'dutl_highscore';

function loadHighScore() {
  try {
    const raw = localStorage.getItem(HS_KEY);
    return raw ? JSON.parse(raw) : { score: 0, combo: 0, accuracy: 0 };
  } catch (e) {
    return { score: 0, combo: 0, accuracy: 0 };
  }
}

function saveHighScoreIfBetter(finalStats) {
  const current = loadHighScore();
  if (finalStats.score > current.score) {
    localStorage.setItem(HS_KEY, JSON.stringify(finalStats));
    return true;
  }
  return false;
}

function renderHighScoreScreen() {
  const hs = loadHighScore();
  document.getElementById('hs-score').textContent = hs.score;
  document.getElementById('hs-combo').textContent = 'x' + hs.combo;
  document.getElementById('hs-accuracy').textContent = hs.accuracy + '%';
}

/* ---------- Letter pool ----------
   Level 1 -> 1 forbidden letter
   Level 2 -> 2 forbidden letters
   Level 3+ -> 3 forbidden letters
   Level increases every 5 correct answers (capped at 3). */
const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split('');

function pickForbiddenLetters(level) {
  const count = Math.min(level, 3);
  const pool = [...ALPHABET];
  const chosen = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    chosen.push(pool.splice(idx, 1)[0]);
  }
  return chosen;
}

// Make sure at least one valid word exists for the chosen letters;
// if not (extremely unlikely with this word list), re-pick.
function pickSolvableForbiddenLetters(level) {
  // Sample random words instead of scanning all 275,000+ words.
  for (let attempt = 0; attempt < 50; attempt++) {
    const letters = pickForbiddenLetters(level);

    for (let sample = 0; sample < 250; sample++) {
      const word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];

      if (!letters.some(l => word.includes(l))) {
        return letters;
      }
    }
  }

  // Safe fallback
  return ['q'];
}

/* ---------- Round / challenge generation ---------- */
function newRound() {
  state.level = Math.min(3, 1 + Math.floor(state.correctCount / 5));
  state.forbidden = pickSolvableForbiddenLetters(state.level);
  state.roundStartTime = Date.now();

  forbiddenLettersEl.textContent = state.forbidden.join(' + ').toUpperCase();
  const plural = state.forbidden.length > 1 ? 's' : '';
  forbiddenPluralEl.textContent = plural;
  forbiddenPlural2El.textContent = plural;

  wordInput.value = '';
  feedbackMsg.textContent = '';
  feedbackMsg.className = 'feedback-msg';
  wordInput.focus();
  updateHUD();
}

/* ---------- Validation ----------
   - not empty
   - only alphabetic characters
   - lowercase for comparison
   - must be in the local word list
   - must not contain any forbidden letter */
function validateWord(raw) {
  const word = (raw || '').trim().toLowerCase();

  if (word.length === 0) {
    return { ok: false, reason: 'empty' };
  }
  if (!/^[a-z]+$/.test(word)) {
    return { ok: false, reason: 'invalid_chars' };
  }
  if (!WORD_SET.has(word)) {
    return { ok: false, reason: 'not_a_word' };
  }
  const usedForbidden = state.forbidden.find(l => word.includes(l));
  if (usedForbidden) {
    return { ok: false, reason: 'forbidden_letter', letter: usedForbidden };
  }
  return { ok: true, word };
}

/* ---------- Scoring ---------- */
function scoreForWord(word, elapsedSeconds) {
  let points = 10; // base
  if (word.length > 3) points += (word.length - 3) * 2; // length bonus
  let speedBonus = 0;
  if (elapsedSeconds <= 3) speedBonus = 10;
  return { base: points, speedBonus, total: points + speedBonus };
}

function showScorePopup(text) {
  const popup = document.createElement('div');
  popup.className = 'score-popup';
  popup.textContent = text;
  gameCard.appendChild(popup);
  setTimeout(() => popup.remove(), 900);
}

/* ---------- Combo banner ---------- */
function maybeShowComboBanner() {
  const messages = { 5: "🔥 YOU'RE ON FIRE!", 10: "⚡ UNSTOPPABLE!", 15: "👑 WORD MASTER!" };
  if (messages[state.combo]) {
    comboBanner.textContent = messages[state.combo];
    comboBanner.classList.remove('hidden');
    setTimeout(() => comboBanner.classList.add('hidden'), 1400);
  }
}

/* ---------- HUD update ---------- */
function updateHUD() {
  hudScore.textContent = state.score;
  hudCombo.textContent = state.combo;
  hudLevel.textContent = state.level;
  hudTimer.textContent = '⏱️ ' + state.timeLeft;

  hudLives.textContent = '❤️'.repeat(state.lives) + '🖤'.repeat(START_LIVES - state.lives);

  hudTimer.classList.toggle('low', state.timeLeft <= 10);

  if (state.timeLeft === 10) {
    urgencyBanner.textContent = '⚠️ HURRY!';
    urgencyBanner.classList.remove('hidden');
    setTimeout(() => urgencyBanner.classList.add('hidden'), 1200);
  } else if (state.timeLeft === 5) {
    urgencyBanner.textContent = '🔥 FINAL SECONDS!';
    urgencyBanner.classList.remove('hidden');
    setTimeout(() => urgencyBanner.classList.add('hidden'), 1200);
  }
}

/* ---------- Submit handler ---------- */
function handleSubmit(e) {
  e.preventDefault();
  if (!state.running) return;

  const elapsed = (Date.now() - state.roundStartTime) / 1000;
  const result = validateWord(wordInput.value);

  if (result.ok) {
    const { total } = scoreForWord(result.word, elapsed);
    state.score += total;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.correctCount += 1;

    feedbackMsg.textContent = CORRECT_MESSAGES[Math.floor(Math.random() * CORRECT_MESSAGES.length)];
    feedbackMsg.className = 'feedback-msg correct';
    showScorePopup('+' + total + ' ⭐');
    maybeShowComboBanner();
    newRound();
  } else {
    state.combo = 0;
    state.wrongCount += 1;
    state.lives -= 1;

    let msg;
    if (result.reason === 'empty') msg = "Type something first! 😅";
    else if (result.reason === 'invalid_chars') msg = "Letters only, please! 🔤";
    else if (result.reason === 'not_a_word') msg = "That's not a word we know! 🤔";
    else msg = WRONG_MESSAGES[Math.floor(Math.random() * WRONG_MESSAGES.length)];

    feedbackMsg.textContent = msg;
    feedbackMsg.className = 'feedback-msg wrong';

    gameCard.classList.add('shake');
    setTimeout(() => gameCard.classList.remove('shake'), 350);

    updateHUD();

    if (state.lives <= 0) {
      endGame();
      return;
    }
    // keep the same round so the player can see what was wrong,
    // but give a brand new challenge after a short pause
    setTimeout(() => { if (state.running) newRound(); }, 700);
  }
}

/* ---------- Timer ---------- */
function tick() {
  state.timeLeft -= 1;
  updateHUD();
  if (state.timeLeft <= 0) {
    endGame();
  }
}

/* ---------- Start / End game ---------- */
function startGame() {
  if (!wordsLoaded) {
    feedbackMsg.textContent = 'Loading dictionary… please wait a moment.';
    feedbackMsg.className = 'feedback-msg wrong';
    return;
  }

  state = freshState();
  state.running = true;
  showScreen('game');
  updateHUD();
  newRound();

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(tick, 1000);
}

function endGame() {
  state.running = false;
  clearInterval(timerInterval);

  const totalAnswers = state.correctCount + state.wrongCount;
  const accuracy = totalAnswers > 0 ? Math.round((state.correctCount / totalAnswers) * 100) : 0;

  document.getElementById('go-score').textContent = state.score;
  document.getElementById('go-accuracy').textContent = accuracy + '%';
  document.getElementById('go-combo').textContent = 'x' + state.bestCombo;
  document.getElementById('go-solved').textContent = state.correctCount;

  const isNewRecord = saveHighScoreIfBetter({ score: state.score, combo: state.bestCombo, accuracy });
  document.getElementById('go-newrecord').classList.toggle('hidden', !isNewRecord);

  showScreen('gameover');
}

/* ---------- Wire up events ---------- */
playBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
homeBtn.addEventListener('click', () => showScreen('home'));
highscoreBtn.addEventListener('click', () => { renderHighScoreScreen(); showScreen('highscore'); });
hsBackBtn.addEventListener('click', () => showScreen('home'));
answerForm.addEventListener('submit', handleSubmit);

// initial screen
// initial screen
showScreen('home');

// Load the full dictionary
loadWords();