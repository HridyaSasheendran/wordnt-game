/* =====================================================
   WORDN'T GAME
===================================================== */


let score = 0;

let lives = 3;

let time = 30;

let level = 1;


/* =====================================================
   FORBIDDEN LETTERS
===================================================== */

let forbiddenLetters = [];


/* =====================================================
   SCORE PAGE STATISTICS
===================================================== */

let wordsAttempted = 0;

let wordsSurvived = 0;

let forbiddenCount = 0;

let bestStreak = 0;

let currentStreak = 0;


/* =====================================================
   🤖 WORDN'T AI — PLAYER PERSONALITY TRACKING
   (does not affect score/lives/timer logic at all —
   it just quietly records numbers for the ML feature
   vector used on the results page)
===================================================== */

// length of every word the player successfully typed
let wordLengths = [];

// seconds-since-last-attempt for every attempt (correct or not)
let responseTimes = [];

// stopwatch: resets after every attempt so we measure the
// time between one submission and the next
let lastActionTime = Date.now();


/* =====================================================
   DICTIONARY
===================================================== */

let wordList = new Set();


/* =====================================================
   HTML ELEMENTS
===================================================== */

const wordInput =
    document.getElementById("wordInput");

const submitWord =
    document.getElementById("submitWord");

const scoreDisplay =
    document.getElementById("score");

const livesDisplay =
    document.getElementById("lives");

const timerDisplay =
    document.getElementById("timer");

const forbiddenDisplay =
    document.getElementById("forbiddenLetter");

const feedback =
    document.getElementById("feedback");

const levelDisplay =
    document.getElementById("levelNumber");


/* =====================================================
   LOAD DICTIONARY
===================================================== */

submitWord.disabled = true;


fetch("words.json")

    .then(response => {

        if (!response.ok) {

            throw new Error(
                "Could not load words.json"
            );

        }

        return response.json();

    })

    .then(words => {

        wordList = new Set(

            words.map(word =>
                word.toLowerCase()
            )

        );


        submitWord.disabled = false;


        feedback.textContent =
            "Type a word to begin...";


        console.log(
            "Dictionary loaded:",
            wordList.size,
            "words"
        );

    })

    .catch(error => {

        console.error(
            "Could not load words.json:",
            error
        );


        feedback.textContent =
            "Dictionary failed to load.";

    });


/* =====================================================
   GENERATE FORBIDDEN LETTERS
===================================================== */

/*
   Difficulty:

   0 - 2 successful words  → 1 letter
   3 - 5 successful words  → 2 letters
   6 - 8 successful words  → 3 letters
   9 - 11 successful words → 4 letters
   12+ successful words     → 5 letters
*/


const ALPHABET_LETTERS =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");


/*
   How many forbidden letters SHOULD be active right now,
   based on how many words the player has survived.
   (0-2 -> 1, 3-5 -> 2, 6-8 -> 3, 9-11 -> 4, 12+ -> 5, capped at 5.)
*/

function getTargetLetterCount() {

    let count =
        Math.floor(wordsSurvived / 3) + 1;

    if (count > 5) {
        count = 5;
    }

    return count;

}


/*
   Build a brand new random set of forbidden letters.

   - The set size is based on the current difficulty tier.
   - No duplicate letters within the set.
   - No memory of past letters is kept, so a letter that was
     forbidden before is free to come up again in a later set.
*/

function generateForbiddenLetters() {

    const targetCount =
        getTargetLetterCount();

    const newForbiddenLetters = [];


    while (
        newForbiddenLetters.length < targetCount
    ) {

        const randomLetter =
            ALPHABET_LETTERS[
                Math.floor(
                    Math.random() * ALPHABET_LETTERS.length
                )
            ];


        if (
            !newForbiddenLetters.includes(
                randomLetter
            )
        ) {

            newForbiddenLetters.push(
                randomLetter
            );

        }

    }


    forbiddenLetters = newForbiddenLetters;


    forbiddenDisplay.textContent =
        forbiddenLetters.join(" • ");

}

/* =====================================================
   START WITH ONE FORBIDDEN LETTER
===================================================== */

generateForbiddenLetters();


/* =====================================================
   CHECK WORD
===================================================== */

submitWord.addEventListener(
    "click",
    checkWord
);


wordInput.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Enter") {

            checkWord();

        }

    }
);


/* =====================================================
   CHECK WORD FUNCTION
===================================================== */

function checkWord() {

    const word =
        wordInput.value
            .trim()
            .toLowerCase();


    /* =================================================
       EMPTY INPUT
    ================================================= */

    if (!word) {

        feedback.textContent =
            "You typed nothing. Bold strategy.";

        return;

    }


    /* =================================================
       COUNT ACTUAL ATTEMPTS
    ================================================= */

    wordsAttempted++;


    /* =================================================
       🤖 AI TRACKING: response time for this attempt
    ================================================= */

    const secondsSinceLastAction =
        (Date.now() - lastActionTime) / 1000;

    responseTimes.push(secondsSinceLastAction);

    lastActionTime = Date.now();


    /* =================================================
       CHECK IF WORD IS A REAL ENGLISH WORD
    ================================================= */

    if (!wordList.has(word)) {

        currentStreak = 0;


        feedback.textContent =
            "That's not a word. Your imagination doesn't count.";


        wordInput.value = "";


        return;

    }


    /* =================================================
       CHECK FOR ANY FORBIDDEN LETTER
    ================================================= */

    const usedForbiddenLetter =
        forbiddenLetters.some(
            letter =>
                word.includes(
                    letter.toLowerCase()
                )
        );


    if (usedForbiddenLetter) {

        forbiddenCount++;


        currentStreak = 0;


        lives--;


        updateLives();


        feedback.textContent =
            "NOPE! You used a forbidden letter.";


        wordInput.value = "";


        /* =============================================
           GAME OVER
        ============================================= */

        if (lives <= 0) {

            feedback.textContent =
                "GAME OVER. Your vocabulary betrayed you.";


            submitWord.disabled = true;

            wordInput.disabled = true;


            setTimeout(() => {

                goToScorePage();

            }, 1000);

        }


        return;

    }


    /* =================================================
       WORD ACCEPTED
    ================================================= */

    wordsSurvived++;


    currentStreak++;


    if (
        currentStreak >
        bestStreak
    ) {

        bestStreak =
            currentStreak;

    }


    /* =================================================
       🤖 AI TRACKING: word length of successful words
    ================================================= */

    wordLengths.push(word.length);


    /* =================================================
       SCORE
    ================================================= */

    score += word.length;


    scoreDisplay.textContent =
        score;


    feedback.textContent =
        "Accepted! Unfortunately.";


    wordInput.value = "";


    /* =================================================
       UPDATE FORBIDDEN LETTERS
    ================================================= */

    const letterCountBeforeUpdate =
        forbiddenLetters.length;


    /*
       Always generate a brand new random set. If the difficulty
       tier just increased, the new set will simply be bigger.
       See generateForbiddenLetters() for the full logic.
    */

    generateForbiddenLetters();


    if (
        forbiddenLetters.length >
        letterCountBeforeUpdate
    ) {

        feedback.textContent =
            "Uh oh... another forbidden letter!";

    }


    /* =================================================
       LEVEL UP
    ================================================= */

    if (
        score >= level * 30
    ) {

        level++;


        levelDisplay.textContent =
            level;


        feedback.textContent =
            "Level up! Things are getting unnecessarily difficult.";

    }

}


/* =====================================================
   LIVES
===================================================== */

function updateLives() {

    livesDisplay.textContent =
        "❤️".repeat(lives);

}


/* =====================================================
   TIMER
===================================================== */

const timerInterval =
    setInterval(() => {

        time--;


        timerDisplay.textContent =
            time;


        if (time <= 0) {

            clearInterval(
                timerInterval
            );


            feedback.textContent =
                "TIME'S UP. Congratulations on doing something useless.";


            wordInput.disabled = true;

            submitWord.disabled = true;


            setTimeout(() => {

                goToScorePage();

            }, 1000);

        }

    }, 1000);


/* =====================================================
   GO TO SCORE PAGE
===================================================== */

function goToScorePage() {

    /* =============================================
       🤖 AI TRACKING: turn the raw arrays into the
       two averages the personality model needs
    ============================================= */

    const avgWordLength =
        wordLengths.length > 0
            ? wordLengths.reduce((a, b) => a + b, 0) / wordLengths.length
            : 0;

    const avgResponseTime =
        responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : 0;


    localStorage.setItem(

        "wordntResults",

        JSON.stringify({

            score: score,

            wordsAttempted:
                wordsAttempted,

            wordsSurvived:
                wordsSurvived,

            forbiddenCount:
                forbiddenCount,

            bestStreak:
                bestStreak,

            avgWordLength:
                avgWordLength,

            avgResponseTime:
                avgResponseTime

        })

    );


    window.location.href =
        "score.html";

}