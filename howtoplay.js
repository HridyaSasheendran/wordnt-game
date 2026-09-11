// ================================
// HOW TO PLAY JAVASCRIPT
// ================================

document.addEventListener("DOMContentLoaded", () => {

    const potato = document.querySelector(".potato");
    const speech = document.querySelector(".speech");
    const playButton = document.querySelector("button");

    // Extra 3D movement when the mouse moves
    document.addEventListener("mousemove", (event) => {

        const x = (event.clientX / window.innerWidth - 0.5) * 2;
        const y = (event.clientY / window.innerHeight - 0.5) * 2;

        potato.style.transform = `
            translateY(${-y * 8}px)
            rotateY(${x * 5 - 3}deg)
            rotateZ(${x * 2 - 2}deg)
        `;

        speech.style.transform = `
            translateZ(150px)
            rotateY(${-x * 5 - 5}deg)
            rotateX(${y * 3}deg)
        `;
    });

    // Button click effect
    playButton.addEventListener("click", () => {

        playButton.innerText = "GOOD LUCK 😭";

        playButton.style.transform = "scale(0.9)";

        setTimeout(() => {
            window.location.href = "index.html";
        }, 300);
    });

});