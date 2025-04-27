import { beatmaps } from "./beatmaps.js";
import {fishData} from "./fishData.js";

const noteContainer = document.getElementById("note-container");
const scoreDisplay = document.getElementById("score");
const beatmapDisplay = document.getElementById("beatmap-name");
const bgMusic = document.getElementById("bg-music");

const pauseBtn = document.getElementById("pause-btn");
const pauseOverlay = document.getElementById("pause-overlay");
const retryBtn = document.getElementById("retry-btn");
const songSelectBtn = document.getElementById("song-select-btn");
const mainMenuBtn = document.getElementById("main-menu-btn");
const mainMenu = document.getElementById("main-menu");
const gameContainer = document.getElementById("game-container");
const body = document.body;
const backBtn = document.getElementById("back-btn");

const resultsScreen = document.getElementById("results-screen");
const finalScoreDisplay = document.getElementById("final-score");
const retryFromResultsBtn = document.getElementById("retry-from-results-btn");
const mainMenuFromResultsBtn = document.getElementById("main-menu-from-results-btn");
const goBackSongSelectBtn = document.getElementById("go-back-song-select-btn");
const beatmapNameResult = document.getElementById("beatmap-name-result");
const highScoreResult   = document.getElementById("high-score-result");
const fishContainer     = document.getElementById("fish-image-container");
const fishImageEl       = document.getElementById("fish-image");
const fishSizeEl        = document.getElementById("fish-size-display");

// Don and Ka sounds
const donSfx = document.getElementById("don-sfx");
const kaSfx = document.getElementById("ka-sfx");

let score = 0;
let notes = [];
let noteSpeed = 4;
let beatmapName = "";
let musicSrc = "";
let currentBeatmap = [];
let kaTimings = [];
let notesInHitzone = [];
let missCount = 0;
let missDisplay = document.getElementById("miss-count");
const maxMisses = 5; // or whatever threshold you like

let isPaused = false;
let animationFrame;
let selectedMap = null;
let selectedDifficulty = "";
let spawnTimeouts = [];
let isCountdownActive = false;

// stopwatch / timing
let gameStartTime = 0;
let pauseStartTime = 0;
let totalPausedTime = 0;
let stopwatchInterval = null;
let beatmapDuration = 0;

const hitzoneWidth = 45;
const hitzoneStartX = 190;

// Home Page reference (fixed)
const homePage = document.getElementById("home-page");

document.getElementById("easy-btn").addEventListener("click", () => setDifficulty("easy"));
document.getElementById("medium-btn").addEventListener("click", () => setDifficulty("medium"));
document.getElementById("hard-btn").addEventListener("click", () => setDifficulty("hard"));


function setDifficulty(level) {
    selectedDifficulty = level;
    mainMenu.style.display = "none";
    document.getElementById("song-menu").style.display = "block";

    // 🔁 Smooth background transition instead of class switching
    let bgImage = "";
    if (level === "easy") bgImage = "images/easy-bg.gif";
    if (level === "medium") bgImage = "images/medium-bg.png";
    if (level === "hard") bgImage = "images/hard-bg.png";
    changeBackground(bgImage);  // <<— animated transition

    showSongMenu(level);
}


function showSongMenu(level) {
    const songList = document.getElementById("song-list");
    songList.innerHTML = "";  // Clear the existing song list

    beatmaps[level].forEach(map => {
        const wrapper = document.createElement("div");
        wrapper.classList.add("beatmap-item");

        // Get the current high score for this map and difficulty level
        const bestScore = getHighScore(map.name, level);
        const maxScore = calculateMaxScore(map);
        const grade = getScoreGrade(bestScore, maxScore, level);

        // Create button styled with an image background
        const btn = document.createElement("button");
        btn.classList.add("image-button"); // apply custom button styles

        // Background image and layout styling
        btn.style.backgroundImage = `url('/images/LongbuttonBG.png')`;
        btn.style.backgroundSize = "fill";
        btn.style.backgroundRepeat = "no-repeat";
        btn.style.backgroundPosition = "center";
        btn.style.width = "536px";  // adjust to match your PNG dimensions
        btn.style.height = "150px";
        btn.style.border = "none";
        btn.style.padding = "0";
        btn.style.margin = "0";
        btn.style.cursor = "pointer";
        btn.style.position = "relative";
        btn.style.display = "flex";
        btn.style.alignItems = "center";
        btn.style.justifyContent = "center";
        btn.style.backgroundColor = "transparent";

        // Create label text overlay
        const label = document.createElement("span");
        label.classList.add("button-label");
        label.textContent = `${map.name} — Best: ${bestScore} (${grade})`;

        // Style the label for clarity on top of image
        label.style.position = "absolute";
        label.style.top = "50%";
        label.style.left = "50%";
        label.style.transform = "translate(-50%, -50%)";
        label.style.color = "#ffffff";
        label.style.fontFamily = "'Montserrat', sans-serif";
        label.style.fontWeight = "600";
        label.style.textTransform = "uppercase";
        label.style.pointerEvents = "none"; // allows clicking through label to button

        btn.appendChild(label);
        btn.addEventListener("click", () => selectSong(map));
        wrapper.appendChild(btn);

        // Add fish info preview
        const info = document.createElement("div");
        info.classList.add("beatmap-info");

        const fish = fishData[map.name];
        if (fish) {
            info.innerHTML = `
                <h4><strong>${map.name}</strong></h4>
                <br>
                <img src="${map.fishImage}" alt="${map.name}" class="fish-preview">
                <p><strong>Scientific Name:</strong> ${fish.scientificName}</p>
                <br>
                <strong>Description:</strong> ${fish.description}</p>
                <br>
                <p><strong>Size:</strong> ${fish.size || 'Unknown'}</p>
            `;
        } else {
            info.innerHTML = `
                <h4>${map.name}</h4>
                <p>Fish data not available</p>
            `;
        }

        wrapper.appendChild(info);
        songList.appendChild(wrapper);
    });
}



// Calculate max score based on don and ka notes
function calculateMaxScore(map) {
    let totalNotes = 0;

    // Count don beats
    if (map["beats-don"]) {
        totalNotes += map["beats-don"].length;
    } else if (map.beats) {
        totalNotes += map.beats.length;
    }

    // Count ka beats
    if (map["beats-ka"]) {
        totalNotes += map["beats-ka"].length;
    }

    return totalNotes * 100;
}

document
    .getElementById("reset-scores-btn")
    .addEventListener("click", () => {
        if (
            !confirm(
                "Are you sure you want to reset all high‑scores?"
            )
        )
            return;

        // Remove the entire highScores entry
        localStorage.removeItem("highScores");
        console.log("All high-scores cleared from localStorage.");

        // Refresh the song menu display so "Best: 0" appears everywhere
        if (selectedDifficulty) {
            showSongMenu(selectedDifficulty);
        }

        alert("All high‑scores have been reset!");
    });

function selectSong(map) {
    selectedMap     = map;
    beatmapName     = map.name;
    musicSrc        = map.music;

    // compute ms-per-beat & offset
    const beatDuration = map.bpm ? 60000 / map.bpm : 0;
    const offset       = map.offset  || 0;

    // convert don-taps (formerly `beats`) into ms timings
    // if you still want to support `map.beats` use that as a fallback:
    const donBeats = map["beats-don"] || map.beats || [];
    currentBeatmap = donBeats.map(b => offset + b * beatDuration);

    // convert ka-taps into ms timings
    kaTimings = (map["beats-ka"] || []).map(b => offset + b * beatDuration);

    // load the audio and get duration
    const audio = document.getElementById("bg-music");
    audio.src = map.music;
    audio.addEventListener("loadedmetadata", () => {
        beatmapDuration = Math.floor(audio.duration);
        resetStopwatch();
    }, { once: true });

    // switch UIs
    document.getElementById("song-menu").style.display    = "none";
    gameContainer.style.display                          = "block";

    // set speed based on difficulty
    if (selectedDifficulty === "easy")   noteSpeed = 2;
    if (selectedDifficulty === "medium") noteSpeed = 4;
    if (selectedDifficulty === "hard")   noteSpeed = 4;

    beatmapDisplay.textContent = `Currently Catching: ${beatmapName}`;
    startGame();
}

function startGame() {
    const countdownElem = document.getElementById("countdown");
    let count = 3;

    countdownElem.textContent = count;
    countdownElem.style.display = "block";
    isPaused = true; // Pause the game during countdown
    isCountdownActive = true;  // Set countdown active

    // Disable pause button during countdown
    pauseBtn.disabled = true;

    const durationMs = (currentBeatmap[currentBeatmap.length - 1] + 2) * 1000;
    startStopwatch(durationMs);

    const countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownElem.textContent = count;
        } else if (count === 0) {
            countdownElem.textContent = "Start!";
        } else {
            clearInterval(countdownInterval);
            countdownElem.style.display = "none";
            isPaused = false; // Unpause when countdown finishes
            isCountdownActive = false;  // Set countdown inactive

            // Enable pause button after countdown ends
            pauseBtn.disabled = false;

            beginGameplay();  // Start the actual game
        }
    }, 1000);
}

function beginGameplay() {
    if (musicSrc) {
        bgMusic.src = musicSrc;
        bgMusic.currentTime = 0;
        bgMusic.play();
        startStopwatch();
    }

    // Start spawning don notes at the correct timings
    currentBeatmap.forEach((time) => {
        const timeout = setTimeout(() => {
            if (!isPaused) spawnNote("don");
        }, time);
        spawnTimeouts.push(timeout);
    });

    // Start spawning ka notes at the correct timings
    kaTimings.forEach((time) => {
        const timeout = setTimeout(() => {
            if (!isPaused) spawnNote("ka");
        }, time);
        spawnTimeouts.push(timeout);
    });

    animationFrame = requestAnimationFrame(gameLoop);  // Start game loop
}

function gameLoop() {
    if (isPaused) return;

    for (let i = notes.length - 1; i >= 0; i--) {
        const note = notes[i];
        note.x -= noteSpeed;
        note.elem.style.left = note.x + "px";

        // mark that this note has entered the hit-zone
        if (!note.inHitzone && note.x <= hitzoneStartX + hitzoneWidth) {
            note.inHitzone = true;
        }

        // if it slipped past without being hit...
        if (note.inHitzone && !note.counted && note.x < hitzoneStartX) {
            note.counted = true;          // only count once
            missCount++;
            document.getElementById("miss-count").textContent = missCount;

            if (missCount >= maxMisses) {
                return endGame();           // immediately stop
            }
        }

        // finally, remove it once fully off-screen
        if (note.x < -20) {
            note.elem.remove();
            notes.splice(i, 1);
        }
    }

    animationFrame = requestAnimationFrame(gameLoop);
}

function spawnNote(type = "don") {
    const note = document.createElement("div");
    note.classList.add("note");

    // Add specific class and label based on note type
    if (type === "ka") {
        note.classList.add("note-ka");
        note.textContent = "E";
    } else {
        note.classList.add("note-don");
        note.textContent = "W";
    }

    note.style.left = "800px";  // Initial position of the note
    noteContainer.appendChild(note);

    // Push the note object into the notes array with its DOM element, initial position, and type
    notes.push({
        elem: note,
        x: 800,
        type: type
    });
}


document.addEventListener("keydown", (e) => {
    if (isPaused) return;

    // W for don notes, E for ka notes
    if (e.code === "KeyW" || e.code === "KeyE") {
        const pressedType = e.code === "KeyW" ? "don" : "ka";
        let noteHandled = false;

        for (let i = 0; i < notes.length; i++) {
            let note = notes[i];
            if (note.x > hitzoneStartX && note.x < hitzoneStartX + hitzoneWidth) {
                if (note.type === pressedType) {
                    // ✅ Correct key
                    if (note.type === "don") {
                        donSfx.currentTime = 0;
                        donSfx.play();
                    } else {
                        kaSfx.currentTime = 0;
                        kaSfx.play();
                    }

                    score += 100;
                    showFeedback("HIT!", "#4CAF50"); // green for hit
                } else {
                    // ❌ Wrong key (wrong note type)
                    incrementMiss();
                    showFeedback("MISS!", "#f44336"); // red for miss
                }

                // Update score display
                scoreDisplay.textContent = score;

                // Remove the note
                const hitzoneIndex = notesInHitzone.indexOf(note);
                if (hitzoneIndex > -1) {
                    notesInHitzone.splice(hitzoneIndex, 1);
                }

                note.elem.remove();
                notes.splice(i, 1);
                noteHandled = true;
                break;
            }
        }

        // ❌ If player pressed and NO note was in the hitzone at all
        if (!noteHandled) {
            incrementMiss();
            showFeedback("MISS!", "#f44336");
        }
    }

    if (e.code === "Escape") {
        if (
            gameContainer.style.display === "block" &&
            !isPaused &&
            !isCountdownActive
        ) {
            pauseGame();
        }
    }
});

// Pause and resume
pauseBtn.addEventListener("click", () => {
    // ✅ Only allow pausing if game container is visible
    if (gameContainer.style.display === "block" && !isPaused && !isCountdownActive) {
        pauseGame();
    }
});

function pauseGame() {
    isPaused = true;
    bgMusic.pause();  // Pause the background music
    pauseStopwatch();
    pauseOverlay.style.display = "flex";  // Show pause overlay
    cancelAnimationFrame(animationFrame);  // Stop the game loop

    // Clear spawn timeouts so no new notes are spawned
    spawnTimeouts.forEach(timeout => clearTimeout(timeout));
    spawnTimeouts = [];

    // Clear notes from the screen
    notes.forEach(note => note.elem.remove());
    notes = [];

    // Hide countdown during pause
    document.getElementById("countdown").style.display = "none";
}

// FULL reset logic for retry
function resetGame() {
    // Cancel game loop and reset animation frame
    cancelAnimationFrame(animationFrame);
    resetStopwatch();

    // Stop and reset music
    bgMusic.pause();
    bgMusic.currentTime = 0;

    // Clear all notes from the screen
    notes.forEach(note => note.elem.remove());
    notes = [];

    // Clear pending timeouts
    spawnTimeouts.forEach(timeout => clearTimeout(timeout));
    spawnTimeouts = [];

    // Reset score
    score = 0;
    scoreDisplay.textContent = score;

    // Reset miss counter
    missCount = 0;
    if (missDisplay) {
        missDisplay.textContent = missCount;
    }
    notesInHitzone = [];

    // Hide overlays
    pauseOverlay.style.display = "none";

    // Reset game state
    isPaused = false;

    // Make sure visual elements are restored
    document.getElementById("countdown").style.display = "none";
    document.getElementById("note-bar").style.display = "block";
    document.getElementById("hitzone").style.display = "block";
    document.getElementById("note-container").style.display = "block";

    resetStopwatch();
    // Start game again
    startGame();
}

// Retry button to reset the game
retryBtn.addEventListener("click", () => {
    resetGame();  // Full reset and start the game from the beginning
});

// Song select from pause menu
songSelectBtn.addEventListener("click", () => {
    stopGame();  // Stop the game completely
    document.getElementById("song-menu").style.display = "block";  // Show song select menu
    pauseOverlay.style.display = "none";  // Hide the pause overlay
    gameContainer.style.display = "none";  // Hide the game container
});

// Main menu from pause menu
mainMenuBtn.addEventListener("click", () => {
    stopGame();  // Stop the game completely
    mainMenu.style.display = "block";  // Show the main menu
    gameContainer.style.display = "none";  // Hide the game container
    body.classList.remove("easy-bg", "medium-bg", "hard-bg");
});

// Back button from song menu to go to main menu
backBtn.addEventListener("click", () => {
    document.getElementById("song-menu").style.display = "none";
    mainMenu.style.display = "block";
    document.body.classList.remove("easy-bg", "medium-bg", "hard-bg");
    changeBackground("images/background.gif");
});

function stopGame() {
    // Call the pauseGame function to stop all game-related processes
    pauseGame();

    // Reset all game-specific state
    isPaused = false;  // Just to ensure it's reset
    score = 0;  // Reset score
    scoreDisplay.textContent = score;

    // Hide game container and pause overlay
    gameContainer.style.display = "none";
    pauseOverlay.style.display = "none";

    // Clear all notes and spawn timeouts
    spawnTimeouts.forEach(timeout => clearTimeout(timeout));
    spawnTimeouts = [];
    notes.forEach(note => note.elem.remove());
    notes = [];
}

function endGame(reason = "missed") {
    bgMusic.pause();
    cancelAnimationFrame(animationFrame);
    isPaused = true;

    finalScoreDisplay.textContent = score;
    beatmapNameResult.textContent = beatmapName;

    const isNewBest = saveHighScore(beatmapName, selectedDifficulty, score);
    const best = getHighScore(beatmapName, selectedDifficulty);
    highScoreResult.innerHTML = isNewBest
        ? `🎉 New High Score! ${score}`
        : `Personal Best: ${best}`;

    resultsScreen.style.display = "block";
    gameContainer.style.display = "none";

    // Change fish message if missed too much
    if (reason === "missed") {
        fishSizeEl.innerHTML = `<strong>Oh, no! You missed too many beats. No fish this time! 🎣💨</strong>`;
        fishContainer.style.display = "none"; // Hide fish if missed
    } else {
        const size = getFishSize(score, selectedDifficulty);
        fishSizeEl.innerHTML = `You caught a <strong>${size}kg ${beatmapName}!</strong>`;

        if (selectedMap && selectedMap.fishImage) {
            fishImageEl.src = selectedMap.fishImage;
            fishContainer.style.display = "block";
            const scale = Math.min(1 + size/10, 3);
            fishImageEl.style.transform = `scale(${scale})`;
        } else {
            fishContainer.style.display = "none";
        }
    }
}


bgMusic.addEventListener("ended", endGame);

retryFromResultsBtn.addEventListener("click", () => {
    // 1) Hide the results UI & fish image
    resultsScreen.style.display   = "none";
    fishContainer.style.display    = "none";
    pauseOverlay.style.display     = "none";

    // 2) Show the main game container
    gameContainer.style.display    = "block";

    // 3) Fully reset everything (score, notes, music, stopwatch, UI) and restart the countdown
    resetGame();
});

goBackSongSelectBtn.addEventListener("click", () => {
    stopGame();
    resetStopwatch();
    resultsScreen.style.display = "none";
    fishContainer.style.display = "none";
    document.getElementById("song-menu").style.display = "block";
    showSongMenu(selectedDifficulty);
});

mainMenuFromResultsBtn.addEventListener("click", () => {
    stopGame();
    resultsScreen.style.display = "none";
    fishContainer.style.display = "none";
    homePage.style.display = "block"; // Fixed reference to homePage
});

function getFishSize(score, difficulty) {
    let fishSize = 0;

    // Adjust the fish size based on difficulty and score
    if (difficulty === "easy") {
        if (score < 500) {
            fishSize = 1;  // Small fish (1kg)
        } else if (score < 800) {
            fishSize = 2.5;  // Medium fish (2.5kg)
        } else if (score < 1000) {
            fishSize = 3;  // Large fish (5kg)
        } else {
            fishSize = 5;  // Bigger fish (5kg)
        }
    } else if (difficulty === "medium") {
        if (score < 300) {
            fishSize = 2;  // Small fish (2kg)
        } else if (score < 600) {
            fishSize = 4;  // Medium fish (4kg)
        } else if (score < 900) {
            fishSize = 6;  // Large fish (6kg)
        } else {
            fishSize = 9;  // Bigger fish (9kg)
        }
    } else if (difficulty === "hard") {
        if (score < 400) {
            fishSize = 3;  // Small fish (3kg)
        } else if (score < 700) {
            fishSize = 5;  // Medium fish (5kg)
        } else if (score < 1000) {
            fishSize = 8;  // Large fish (8kg)
        } else {
            fishSize = 12;  // Massive fish (12kg)
        }
    }

    return fishSize;
}

function _scoreKey(mapName, difficulty) {
    return `${mapName}__${difficulty}`;
}

function loadHighScores() {
    return JSON.parse(localStorage.getItem("highScores") || "{}");
}

function getHighScore(mapName, difficulty) {
    const scores = loadHighScores();
    return scores[_scoreKey(mapName, difficulty)] || 0;
}

function saveHighScore(mapName, difficulty, score) {
    const key = _scoreKey(mapName, difficulty);
    const scores = loadHighScores();
    if (!scores[key] || score > scores[key]) {
        scores[key] = score;
        localStorage.setItem("highScores", JSON.stringify(scores));
        return true; // new personal best
    }
    return false;
}

function getScoreGrade(score, maxScore, difficulty) {
    const ratio = score / maxScore;

    // Define grade thresholds for each difficulty
    const gradeThresholds = {
        easy:   { S: 0.95, A: 0.9, B: 0.8, C: 0.7, D: 0.6 },
        medium: { S: 0.97, A: 0.92, B: 0.85, C: 0.75, D: 0.65 },
        hard:   { S: 0.99, A: 0.95, B: 0.9,  C: 0.8,  D: 0.7 },
    };

    const thresholds = gradeThresholds[difficulty] || gradeThresholds.easy;

    if (ratio >= thresholds.S) return "S";
    if (ratio >= thresholds.A) return "A";
    if (ratio >= thresholds.B) return "B";
    if (ratio >= thresholds.C) return "C";
    if (ratio >= thresholds.D) return "D";
    return "F";
}

// Format seconds as M:SS
function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function resetStopwatch() {
    clearInterval(stopwatchInterval);
    gameStartTime = 0;
    pauseStartTime = 0;
    totalPausedTime = 0;
    document.getElementById('stopwatch').textContent =
        `0:00 / ${formatTime(beatmapDuration)}`;
}

function startStopwatch() {
    gameStartTime = Date.now();
    stopwatchInterval = setInterval(() => {
        const elapsedMs = Date.now() - gameStartTime - totalPausedTime;
        const elapsedSec = Math.min(Math.floor(elapsedMs / 1000), beatmapDuration);
        document.getElementById('stopwatch').textContent =
            `${formatTime(elapsedSec)} / ${formatTime(beatmapDuration)}`;
    }, 200);
}

function pauseStopwatch() {
    clearInterval(stopwatchInterval);
    pauseStartTime = Date.now();
}

// Home Page Elements
const startBtn = document.getElementById("start-btn");
const settingsBtn = document.getElementById("settings-btn");
const tutorialBtn = document.getElementById("tutorial-btn");
const settingsPage = document.getElementById("settings-page");
const tutorialPage = document.getElementById("tutorial-page");
const backFromSettingsBtn = document.getElementById("back-from-settings-btn");
const backFromTutorialBtn = document.getElementById("back-from-tutorial-btn");
const backFromMainBtn = document.getElementById("back-from-main-btn");

// Home Page Navigation
startBtn.addEventListener("click", () => {
    homePage.style.display = "none";
    mainMenu.style.display = "block"; // Show main menu after clicking "Start"
});

settingsBtn.addEventListener("click", () => {
    homePage.style.display = "none";
    settingsPage.style.display = "block";
});

tutorialBtn.addEventListener("click", () => {
    homePage.style.display = "none";
    tutorialPage.style.display = "block";
});

backFromSettingsBtn.addEventListener("click", () => {
    settingsPage.style.display = "none";
    homePage.style.display = "block";
});

backFromTutorialBtn.addEventListener("click", () => {
    tutorialPage.style.display = "none";
    homePage.style.display = "block";
});

backFromMainBtn.addEventListener("click", () => {
    mainMenu.style.display = "none";
    homePage.style.display = "block"; // Show the home page
    document.body.classList.remove("easy-bg", "medium-bg", "hard-bg");
    changeBackground("images/background.gif");
});

//BG transitioning
function changeBackground(imagePath) {
    const oldBg = document.getElementById("background-old");
    const newBg = document.getElementById("background-new");

    if (!oldBg || !newBg) {
        console.error("Background elements not found");
        return;
    }

    newBg.style.backgroundImage = `url(${imagePath})`;
    newBg.style.opacity = 1;

    // After fade-in, swap layers
    setTimeout(() => {
        oldBg.style.backgroundImage = `url(${imagePath})`;
        oldBg.style.opacity = 1;
        newBg.style.opacity = 0;
    }, 600); // matches the transition time
}

//Volume Control
const volumeControl = document.getElementById("volume-control");

// Load saved volume setting on startup
const savedVolume = localStorage.getItem("volume");
if (savedVolume !== null) {
    const parsedVolume = parseFloat(savedVolume);
    volumeControl.value = parsedVolume;
    bgMusic.volume = parsedVolume;
}

// Update volume in real time + save it to localStorage
volumeControl.addEventListener("input", (e) => {
    const newVolume = parseFloat(e.target.value);
    bgMusic.volume = newVolume;

    // Also update SFX volume
    if (donSfx) donSfx.volume = newVolume;
    if (kaSfx) kaSfx.volume = newVolume;

    localStorage.setItem("volume", newVolume.toString());
});

function showFeedback(text, color) {
    const feedback = document.createElement("div");
    feedback.className = "feedback";
    feedback.textContent = text;
    feedback.style.color = color;

    // No offset — fixed position from CSS
    document.body.appendChild(feedback);

    setTimeout(() => {
        feedback.remove();
    }, 500);
}

// incremental miss function
const missCountDisplay = document.getElementById("miss-count");

function incrementMiss() {
    missCount++;
    missCountDisplay.textContent = missCount;  // update miss HUD
    if (missCount >= maxMisses) {
        endGame("missed");  // pass a reason
    }
}


