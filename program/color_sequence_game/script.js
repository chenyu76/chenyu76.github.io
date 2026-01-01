
// Game Constants
const COLORS_COUNT = 6; // Total available colors
let SEQUENCE_LENGTH = 4;
const MAX_ATTEMPTS = 99;

// State
let secretSequences = [];
let currentGuess = [ null, null, null, null ];
let attemptsCount = 0;
let activeSlotIndex = 0;
let isGameOver = false;

// Difficulty
// 0: Secret sequence is fixed and can be guessed
// 1: Secret sequence can be changed.
//    One must use his guess to exclude other any other prosibility.
// 2: Any guess result in obtain minimum amount of information.
let difficulty = 0;

// DOM Elements
const board = document.getElementById("game-board");
let currentSlots = document.querySelectorAll("#current-slots .slot");
const overlay = document.getElementById("overlay");
const resultIcon = document.getElementById("result-icon");
const answerReveal = document.getElementById("answer-reveal");
const inputSlotsContainer = document.getElementById("current-slots");
const diffBtn = document.getElementById("difficulty-btn");

function cycleDifficulty() {
  difficulty = (difficulty + 1) % 3;
  let diffIcons =
      [ 0, 1, 2 ].map(i => document.getElementById(`difficulty-icon-${i}`));
  diffIcons.forEach(v => v.style.display = "none");
  diffIcons[difficulty].style.display = "inline-block";
  diffBtn.style.background = `var(--color-difficulty-${difficulty})`;
}

function changeSlotsLength(newLength) {
  SEQUENCE_LENGTH = newLength;
  initGame();
}

function increaseSlotsLength(delta) {
  SEQUENCE_LENGTH =
      Math.min(Math.max(2, SEQUENCE_LENGTH + delta), COLORS_COUNT);
  initGame();
}

function getAllArragement(set = [ 1, 2 ]) {
  return set.length == 1
             ? [ set ]
             : set.map((_v,
                        idx) => [...set.slice(0, idx), ...set.slice(idx + 1)])
                   .map(getAllArragement)
                   .map((subsets, index) => subsets.map(
                            (subset, _i) => [set[index], ...subset]))
                   .flat();
}

function randomlizeList(list = [ 1, 2, 3, 4 ]) {
  let remainList = Array.from(list);
  let newList = [];
  for (let i = 0; i < list.length; i++) {
    let idx = Math.floor(Math.random() * remainList.length);
    newList.push(remainList[idx]);
    remainList = [...remainList.slice(0, idx), ...remainList.slice(idx + 1) ];
  }
  return newList;
}

/*
 * global secretSequences will be change
 * Return: right num
 */
function checkAnswer(answer = []) {
  var numMatch = (l) => {
    let num = 0;
    for (let i = 0; i < answer.length; i++)
      if (answer[i] == l[i])
        num++;
    return num;
  };
  var s0numMatch = numMatch(secretSequences[0]);
  if (difficulty == 2) {
    let numMatchSeq = secretSequences.map(numMatch);
    let counts = Array(answer.length + 1).fill(0);
    numMatchSeq.forEach(v => counts[v]++);
    let max = -1;
    for (let i = 0; i < counts.length; i++)
      if (max < counts[i])
        max = counts[i];
    let po = [];
    for (let i = 0; i < counts.length; i++)
      if (max == counts[i])
        po.push(i);
    let choose = Math.floor(Math.random() * po.length);
    secretSequences =
        secretSequences.filter((_, i) => numMatchSeq[i] == po[choose]);
    s0numMatch = numMatch(secretSequences[0]);
  } else if (difficulty == 1) {
    if (s0numMatch == answer.length && secretSequences.length > 1) {
      secretSequences = secretSequences.slice(1);
      s0numMatch = numMatch(secretSequences[0]);
    }
    secretSequences =
        secretSequences.filter((list, _) => numMatch(list) == s0numMatch);
  }
  return s0numMatch;
}

function initGame() {
  // Reset State
  secretSequences = randomlizeList(getAllArragement(generateSequence()));
  currentGuess = Array(SEQUENCE_LENGTH).fill(null);
  attemptsCount = 0;
  activeSlotIndex = 0;
  isGameOver = false;

  // Reset UI
  board.innerHTML = ""; // Clear history
  overlay.classList.remove("show");
  updateCurrentRowUI();
  updateInputUI();

  // Generate empty slots for history visualization
  // Optional: we could pre-render empty rows, but dynamic is fine.
}

function generateSequence(random = false) {
  let pool = Array.from({length : SEQUENCE_LENGTH}, (_, i) => i);
  if (!random)
    return pool;
  // Fisher-Yates shuffle for uniqueness
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [ pool[j], pool[i] ];
  }
  return pool;
}

function selectSlot(index) {
  if (isGameOver)
    return;
  activeSlotIndex = index;

  // Handle color cycling on click if already selected
  // But logic says: Click to select. If we want click to cycle, we check if
  // active. Let's keep it simple: Click sets focus. If you click again, it
  // cycles.
  if (document.activeElement !== document.body)
    document.body.focus();

  updateCurrentRowUI();
}

function cycleColor(direction) {
  let val = currentGuess[activeSlotIndex];
  if (val === null) {
    val = 0;
  } else {
    val = (val + direction + SEQUENCE_LENGTH) % SEQUENCE_LENGTH;
  }
  currentGuess[activeSlotIndex] = val;
  updateCurrentRowUI();
}

function updateInputUI() {
  inputSlotsContainer.innerHTML = "";
  for (let i = 0; i < SEQUENCE_LENGTH; i++) {
    const slot = document.createElement("div");
    slot.className = "slot" + (i === activeSlotIndex ? " active" : "");
    slot.id = `input-slot-${i}`;
    slot.onclick = () => selectSlot(i);
    inputSlotsContainer.appendChild(slot);
  }

  currentSlots = document.querySelectorAll("#current-slots .slot");
  // Enhanced Click Logic: Cycle color if clicking the active slot
  currentSlots.forEach((slot, index) => {
    slot.addEventListener("click", () => {
      if (activeSlotIndex === index) {
        cycleColor(1);
      } else {
        activeSlotIndex = index;
        updateCurrentRowUI();
      }
    });
  });
}

function updateCurrentRowUI() {
  currentSlots.forEach((slot, index) => {
    // Clear classes
    slot.className = "slot";
    if (index === activeSlotIndex)
      slot.classList.add("active");

    // Set color
    if (currentGuess[index] !== null) {
      slot.classList.add(`color-${currentGuess[index]}`);
    }
  });
}

function submitGuess() {
  if (isGameOver)
    return;
  // Validate: All slots must be filled
  if (currentGuess.includes(null)) {
    // Shake animation or visual feedback could go here
    return;
  }
  // no allow same color more than once
  var appearColor = [];
  for (let i = 0; i < currentGuess.length; i++) {
    if (appearColor.includes(currentGuess[i])) {
      document.getElementById(`input-slot-${i}`)
          .classList.remove("color-" + currentGuess[i]);
      currentGuess[i] = null;
    } else {
      appearColor.push(currentGuess[i]);
    }
  }
  if (appearColor.length < currentGuess.length) {
    return;
  }

  // Check logic
  let correctPosition = checkAnswer(currentGuess);

  // Create History Row
  const rowDiv = document.createElement("div");
  rowDiv.className = "row";

  const slotsDiv = document.createElement("div");
  slotsDiv.className = "slots-container";

  currentGuess.forEach((color) => {
    const s = document.createElement("div");
    s.className = `slot color-${color}`;
    s.style.cursor = "default";
    slotsDiv.appendChild(s);
  });

  // Feedback Dots
  const feedbackDiv = document.createElement("div");
  feedbackDiv.className = "feedback";
  for (let i = 0; i < SEQUENCE_LENGTH; i++) {
    const dot = document.createElement("div");
    dot.className = "dot";
    if (i < correctPosition)
      dot.classList.add("correct");
    feedbackDiv.appendChild(dot);
  }

  rowDiv.appendChild(slotsDiv);
  rowDiv.appendChild(feedbackDiv);
  board.appendChild(rowDiv);

  // Scroll to bottom
  window.scrollTo(0, document.body.scrollHeight);

  attemptsCount++;

  // Win Condition
  if (correctPosition === SEQUENCE_LENGTH) {
    endGame(true);
  } else if (attemptsCount >= MAX_ATTEMPTS) {
    endGame(false);
  } else {
    // Clear input for next turn? Or keep it?
    // Prompt says: "保留在屏幕上" (History kept).
    // Usually input stays to modify easily. Let's keep input but focus first
    // slot. activeSlotIndex = 0; updateCurrentRowUI();
  }
}

function endGame(win) {
  isGameOver = true;
  setTimeout(() => {
    overlay.classList.add("show");

    // Icon
    if (win) {
      resultIcon.innerHTML =
          '<svg class="win-color" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
    } else {
      resultIcon.innerHTML =
          '<svg class="lose-color" viewBox="0 0 24 24"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>';
    }

    // Show Answer
    answerReveal.innerHTML = "";
    if (!win) {
      secretSequences[0].forEach((color) => {
        const s = document.createElement("div");
        s.className = `slot color-${color}`;
        answerReveal.appendChild(s);
      });
    }
  }, 500);
}

// Keyboard Controls
document.addEventListener("keydown", (e) => {
  if (isGameOver)
    return;

  switch (e.key) {
  case "ArrowLeft":
    activeSlotIndex = (activeSlotIndex - 1 + SEQUENCE_LENGTH) % SEQUENCE_LENGTH;
    updateCurrentRowUI();
    break;
  case "ArrowRight":
    activeSlotIndex = (activeSlotIndex + 1) % SEQUENCE_LENGTH;
    updateCurrentRowUI();
    break;
  case "ArrowUp":
    cycleColor(1);
    break;
  case "ArrowDown":
    cycleColor(-1);
    break;
  case "Backspace":
    currentGuess[activeSlotIndex] = null;
    updateCurrentRowUI();
    break;
  case "Enter":
    submitGuess();
    break;
  }
});

// Initialize on load
initGame();
// Set difficulty to 0 and cycle to 1 to ensure proper UI setup
difficulty = 0;
cycleDifficulty();
