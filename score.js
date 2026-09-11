/* =====================================================
   WORDN'T — SCORE PAGE
===================================================== */


/* ================= LOAD RESULTS ================= */

const gameResults = JSON.parse(
    localStorage.getItem("wordntResults")
) || {};


/* ================= GET VALUES ================= */

const score = Number(gameResults.score) || 0;

const wordsAttempted =
    Number(gameResults.wordsAttempted) || 0;

const wordsSurvived =
    Number(gameResults.wordsSurvived) || 0;

const forbiddenCount =
    Number(gameResults.forbiddenCount) || 0;

const bestStreak =
    Number(gameResults.bestStreak) || 0;


/* ================= HTML ELEMENTS ================= */

const finalScore =
    document.getElementById("finalScore");

const attemptedElement =
    document.getElementById("wordsAttempted");

const survivedElement =
    document.getElementById("wordsSurvived");

const forbiddenElement =
    document.getElementById("forbiddenCount");

const streakElement =
    document.getElementById("bestStreak");

const scoreMessage =
    document.getElementById("scoreMessage");

const achievementName =
    document.getElementById("achievementName");

const achievementDescription =
    document.getElementById("achievementDescription");

const uselessMeter =
    document.getElementById("uselessMeter");

const uselessPercentage =
    document.getElementById("uselessPercentage");

const verdictText =
    document.getElementById("verdictText");

const potatoMessage =
    document.getElementById("potatoMessage");

const potato =
    document.getElementById("scorePotato");

const confettiContainer =
    document.getElementById("confetti-container");


/* =====================================================
   SCORE COUNTER ANIMATION
===================================================== */

function animateNumber(element, target, duration = 1200) {

    if (!element) return;

    let start = 0;

    const startTime = performance.now();

    function update(currentTime) {

        const elapsed = currentTime - startTime;

        const progress =
            Math.min(elapsed / duration, 1);

        // Smooth animation
        const eased =
            1 - Math.pow(1 - progress, 3);

        const current =
            Math.floor(start + (target - start) * eased);

        element.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(update);
        }

    }

    requestAnimationFrame(update);
}


/* =====================================================
   DISPLAY GAME STATS
===================================================== */

animateNumber(finalScore, score, 1500);

animateNumber(
    attemptedElement,
    wordsAttempted,
    900
);

animateNumber(
    survivedElement,
    wordsSurvived,
    900
);

animateNumber(
    forbiddenElement,
    forbiddenCount,
    900
);

animateNumber(
    streakElement,
    bestStreak,
    900
);


/* =====================================================
   FUNNY SCORE MESSAGE
===================================================== */

function getScoreMessage(score) {

    if (score <= 20) {

        return "Did you even try?";

    }

    if (score <= 50) {

        return "Technically, you played.";

    }

    if (score <= 100) {

        return "Suspiciously competent.";

    }

    if (score <= 200) {

        return "Okay genius, calm down.";

    }

    return "WHO GAVE YOU PERMISSION TO BE THIS GOOD?";
}


scoreMessage.textContent =
    getScoreMessage(score);


/* =====================================================
   USELESSNESS CALCULATION
===================================================== */

let uselessValue;


/*
   Higher score = less useless.

   We still keep the percentage
   intentionally silly.
*/

if (score <= 20) {

    uselessValue = 99;

} else if (score <= 50) {

    uselessValue = 95;

} else if (score <= 100) {

    uselessValue = 87;

} else if (score <= 200) {

    uselessValue = 72;

} else {

    uselessValue = 61;

}


/* =====================================================
   USELESS METER ANIMATION
===================================================== */

setTimeout(() => {

    if (uselessMeter) {

        uselessMeter.style.width =
            uselessValue + "%";

    }

}, 500);


if (uselessPercentage) {

    uselessPercentage.textContent =
        uselessValue + "% USELESS";

}


/* =====================================================
   FUNNY VERDICT
===================================================== */

function getVerdict(score) {

    if (score <= 20) {

        return "You had one job. Type words. You somehow made it worse.";

    }

    if (score <= 50) {

        return "Not impressive. But technically, this is a result.";

    }

    if (score <= 100) {

        return "You survived the alphabet. Barely.";

    }

    if (score <= 200) {

        return "Okay, that's actually decent. Don't let it go to your head.";

    }

    return "WHO ARE YOU? The forbidden letter fears you.";

}


if (verdictText) {

    verdictText.textContent =
        getVerdict(score);

}


/* =====================================================
   ACHIEVEMENTS
===================================================== */

const achievements = [

    {
        name: "Letter Dodger",
        description:
            "You successfully avoided the alphabet."
    },

    {
        name: "Almost Useful",
        description:
            "You contributed absolutely nothing to society."
    },

    {
        name: "Suspiciously Smart",
        description:
            "We weren't expecting this level of competence."
    },

    {
        name: "Alphabet Criminal",
        description:
            "You broke the rules. Repeatedly."
    },

    {
        name: "Professional Word Waster",
        description:
            "Congratulations. Your talent is questionable."
    },

    {
        name: "Keyboard Menace",
        description:
            "Somewhere, a keyboard is filing a complaint."
    },

    {
        name: "Forbidden Letter Survivor",
        description:
            "The alphabet tried. You survived."
    },

    {
        name: "Certified Time Waster",
        description:
            "You spent your valuable time doing this."
    }

];


/* ================= CHOOSE ACHIEVEMENT ================= */

let achievement;


/*
   Give better achievements
   for better performance.
*/

if (score > 200) {

    achievement = achievements[2];

} else if (score > 100) {

    achievement = achievements[0];

} else if (score > 50) {

    achievement = achievements[6];

} else {

    achievement =
        achievements[
            Math.floor(
                Math.random() * achievements.length
            )
        ];

}


if (achievementName) {

    achievementName.textContent =
        achievement.name;

}


if (achievementDescription) {

    achievementDescription.textContent =
        achievement.description;

}


/* =====================================================
   POTATO REACTIONS
===================================================== */

const potatoMessages = [

    "I don't know what you did, but I'm proud.",

    "Your score is higher than my IQ.",

    "Please don't play again.",

    "I have absolutely no idea what is happening.",

    "That was... certainly a game.",

    "You avoided a letter. Humanity is saved.",

    "I witnessed everything.",

    "This is probably your greatest achievement today.",

    "I'm just a potato. Why am I judging you?",

    "Honestly? I expected worse."

];


/* ================= RANDOM POTATO MESSAGE ================= */

if (potatoMessage) {

    potatoMessage.textContent =
        potatoMessages[
            Math.floor(
                Math.random() * potatoMessages.length
            )
        ];

}


/* =====================================================
   POTATO CLICK
===================================================== */

if (potato) {

    potato.addEventListener("click", () => {

        potato.classList.add("potato-shake");

        setTimeout(() => {

            potato.classList.remove(
                "potato-shake"
            );

        }, 500);


        if (potatoMessage) {

            potatoMessage.textContent =
                potatoMessages[
                    Math.floor(
                        Math.random() *
                        potatoMessages.length
                    )
                ];

        }

    });

}


/* =====================================================
   CONFETTI
===================================================== */

function createConfetti() {

    if (!confettiContainer) return;


    const numberOfPieces = 70;


    for (
        let i = 0;
        i < numberOfPieces;
        i++
    ) {

        const piece =
            document.createElement("div");


        piece.classList.add(
            "confetti-piece"
        );


        piece.style.left =
            Math.random() * 100 + "%";


        piece.style.animationDelay =
            Math.random() * 2 + "s";


        piece.style.animationDuration =
            2 + Math.random() * 3 + "s";


        piece.style.transform =
            `rotate(${Math.random() * 360}deg)`;


        confettiContainer.appendChild(piece);

    }

}


/* =====================================================
   START CONFETTI
===================================================== */

setTimeout(() => {

    createConfetti();

}, 700);


/* =====================================================
   CLEAR OLD RESULTS
===================================================== */

/*
   We don't immediately remove the results
   from localStorage because the score page
   needs them.

   They will be replaced automatically
   when the next game finishes.
*/


/* =====================================================
   DEBUG
===================================================== */

console.log("WORDN'T SCORE PAGE");

console.log({
    score,
    wordsAttempted,
    wordsSurvived,
    forbiddenCount,
    bestStreak
});