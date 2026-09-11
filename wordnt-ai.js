/* =====================================================
   🤖 WORDN'T AI — PLAYER PERSONALITY (score page)
   =====================================================

   This file does 3 things:
     1. Reads the same "wordntResults" object score.js already reads
        from localStorage (we don't touch score.js at all).
     2. Builds the ML feature vector and runs it through the trained
        K-Means model (see model.js — loaded before this file).
     3. Renders the result into the #aiPersonalityCard section.

   NOTE: This is a fun gameplay statistic, not a real personality
   or psychological assessment — the UI says so too.
===================================================== */


/* ================= PERSONALITY CONTENT ================= */

const PERSONALITY_INFO = {

    speed_demon: {
        emoji: "⚡",
        title: "SPEED DEMON",
        quote: "You don't read. You simply type.",
        description:
            "Your fingers move faster than your brain can double-check them. " +
            "You're not here to admire the alphabet — you're here to beat it.",
    },

    word_nerd: {
        emoji: "🧠",
        title: "WORD NERD",
        quote: "You brought a dictionary to a word fight.",
        description:
            "Long words, few mistakes, zero panic. While everyone else " +
            "types \"cat\", you're out here typing \"circumlocution\".",
    },

    risk_taker: {
        emoji: "😈",
        title: "RISK TAKER",
        quote: "Go big, or go home. Usually go home.",
        description:
            "You reach for the fanciest, riskiest words on the board — and " +
            "the forbidden letter catches you more than it probably should.",
    },

    careful_player: {
        emoji: "🐢",
        title: "CAREFUL PLAYER",
        quote: "Slow and steady wins... some of the time.",
        description:
            "You think before you type, which is more than can be said for " +
            "everyone else on this list. Mistakes are rare. So is speed.",
    },

    chaos_player: {
        emoji: "💀",
        title: "CHAOS PLAYER",
        quote: "The forbidden letter found you immediately. Every time.",
        description:
            "You typed with pure vibes and no plan whatsoever. The alphabet " +
            "is currently filing a restraining order against you.",
    },

};

// below this many real attempts, we don't trust the vector enough to guess
const MIN_ATTEMPTS_FOR_AI = 5;


/* ================= ML HELPERS ================= */

// scale a raw feature vector the same way the training data was scaled
// (subtract the training mean, divide by the training standard deviation)
function standardizeVector(rawVector, means, stds) {
    return rawVector.map((value, i) => {
        const std = stds[i] || 1; // guard against divide-by-zero
        return (value - means[i]) / std;
    });
}

// straight-line ("as the crow flies") distance between two points
function euclideanDistance(a, b) {
    let sumOfSquares = 0;
    for (let i = 0; i < a.length; i++) {
        sumOfSquares += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sumOfSquares);
}

/*
   Classify one player.

   rawVector must follow the exact order the model was trained on:
   [attempted, survived, avgWordLength, avgResponseTime, mistakes, longestStreak]

   Returns { personalityKey, confidence } where confidence (0-100) is
   how much closer the player is to their assigned cluster than to the
   others — a big gap = high confidence, a close call between two
   clusters = low confidence.
*/
function classifyPlayer(rawVector) {

    const [
        attempted,
        survived,
        avgWordLength,
        avgResponseTime,
        mistakes,
        longestStreak
    ] = rawVector;

    // Prevent division by zero
    const survivalRate =
        attempted > 0 ? survived / attempted : 0;

    const mistakeRate =
        attempted > 0 ? mistakes / attempted : 0;


    /* =====================================================
       GAMEPLAY PERSONALITY SCORES
       ===================================================== */

    const scores = {

        /* ⚡ SPEED DEMON
           Fast answers + decent survival
        */
        speed_demon:
            (avgResponseTime <= 2.5 ? 4 : 0) +
            (avgResponseTime <= 2.0 ? 2 : 0) +
            (survivalRate >= 0.55 ? 2 : 0) +
            (longestStreak >= 5 ? 1 : 0),


        /* 🧠 WORD NERD
           Long words + good survival + low mistakes
        */
        word_nerd:
            (avgWordLength >= 6 ? 4 : 0) +
            (avgWordLength >= 7 ? 2 : 0) +
            (survivalRate >= 0.60 ? 2 : 0) +
            (mistakeRate <= 0.20 ? 1 : 0) +
            (longestStreak >= 6 ? 1 : 0),


        /* 😈 RISK TAKER
           Attempts ambitious words but makes mistakes
        */
        risk_taker:
            (avgWordLength >= 6 ? 3 : 0) +
            (mistakeRate >= 0.25 ? 3 : 0) +
            (mistakeRate >= 0.40 ? 2 : 0) +
            (attempted >= 10 ? 1 : 0),


        /* 🐢 CAREFUL PLAYER
           Slow + accurate + low mistakes
        */
        careful_player:
            (avgResponseTime >= 3.5 ? 3 : 0) +
            (avgResponseTime >= 4.5 ? 2 : 0) +
            (mistakeRate <= 0.15 ? 3 : 0) +
            (survivalRate >= 0.65 ? 2 : 0),


        /* 💀 CHAOS PLAYER
           Lots of forbidden-letter mistakes
        */
        chaos_player:
            (mistakeRate >= 0.35 ? 4 : 0) +
            (mistakeRate >= 0.50 ? 3 : 0) +
            (survivalRate <= 0.50 ? 2 : 0) +
            (longestStreak <= 3 ? 1 : 0)
    };


    /* =====================================================
       FIND HIGHEST SCORE
       ===================================================== */

    let personalityKey = "careful_player";
    let highestScore = -1;

    for (const key in scores) {

        if (scores[key] > highestScore) {
            highestScore = scores[key];
            personalityKey = key;
        }
    }


    /* =====================================================
       CONFIDENCE
       ===================================================== */

    const sortedScores = Object.values(scores)
        .sort((a, b) => b - a);

    const best = sortedScores[0];
    const secondBest = sortedScores[1] || 0;

    let confidence = 50;

    if (best > 0) {
        confidence =
            50 +
            ((best - secondBest) / best) * 50;
    }

    confidence = Math.round(
        Math.max(50, Math.min(99, confidence))
    );


    return {
        personalityKey,
        confidence
    };
}


/* ================= RENDER ================= */

function renderAiPersonality() {

    const card = document.getElementById("aiPersonalityCard");
    if (!card) return; // section not on this page, bail quietly

    const results = JSON.parse(localStorage.getItem("wordntResults")) || {};

    const attempted = Number(results.wordsAttempted) || 0;
    const survived = Number(results.wordsSurvived) || 0;
    const avgWordLength = Number(results.avgWordLength) || 0;
    const avgResponseTime = Number(results.avgResponseTime) || 0;
    const mistakes = Number(results.forbiddenCount) || 0;
    const longestStreak = Number(results.bestStreak) || 0;

    /* ---- not enough data: AI shrugs ---- */
    if (attempted < MIN_ATTEMPTS_FOR_AI) {
        card.innerHTML = `
            <div class="ai-confused">
                <div class="ai-confused-emoji">🤖</div>
                <h3>AI IS CONFUSED</h3>
                <p>Not enough evidence. Please play another round.</p>
            </div>
        `;
        return;
    }

    // exact order the model expects
    const featureVector = [
        attempted,
        survived,
        avgWordLength,
        avgResponseTime,
        mistakes,
        longestStreak,
    ];

    const { personalityKey, confidence } = classifyPlayer(featureVector);
    const info = PERSONALITY_INFO[personalityKey];

    card.innerHTML = `
        <p class="ai-eyebrow">🤖 WORDN'T AI</p>
        <p class="ai-heading">YOUR PLAYING PERSONALITY</p>

        <div class="ai-result-emoji">${info.emoji}</div>
        <h3 class="ai-result-title">${info.emoji} ${info.title}</h3>
        <p class="ai-result-quote">"${info.quote}"</p>
        <p class="ai-result-description">${info.description}</p>

        <div class="ai-confidence">
            <div class="ai-confidence-label">
                AI CONFIDENCE / MATCH STRENGTH
            </div>
            <div class="ai-confidence-bar">
                <div class="ai-confidence-fill" style="width: ${confidence}%"></div>
            </div>
            <div class="ai-confidence-value">${confidence}%</div>
        </div>

        <div class="ai-stat-grid">
            <div class="ai-stat"><span>${attempted}</span><label>ATTEMPTED</label></div>
            <div class="ai-stat"><span>${survived}</span><label>SURVIVED</label></div>
            <div class="ai-stat"><span>${avgWordLength.toFixed(1)}</span><label>AVG WORD LENGTH</label></div>
            <div class="ai-stat"><span>${avgResponseTime.toFixed(1)}s</span><label>AVG RESPONSE TIME</label></div>
            <div class="ai-stat"><span>${mistakes}</span><label>FORBIDDEN MISTAKES</label></div>
            <div class="ai-stat"><span>${longestStreak}</span><label>BEST STREAK</label></div>
        </div>

        <p class="ai-disclaimer">
            🎮 This is just a fun gameplay statistic based on how you played
            this round — not a real psychological assessment.
        </p>
    `;
}

renderAiPersonality();
