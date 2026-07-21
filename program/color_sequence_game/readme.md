# Color Sequence Game

A logic-based puzzle game. Test your deductive reasoning by guessing the secret color sequence within the limited attempts. This version features dynamic difficulty modes, including an adversarial AI that actively tries to hide the secret based on your guesses.

## Play Now

**[Start Game](https://chenyu76.github.io/program/color_sequence_game/index.html)**

## Features

* **Dynamic Sequence Length:** Adjust the length of the secret sequence (from 2 up to 6 colors) to change the complexity.
* **3 Difficulty Modes:** Ranging from a standard fixed puzzle to an "Evil" AI that changes the secret answer to minimize your information gain.
* **Responsive Design:** Works on mobile and desktop browsers.

## How to Play

1.  **Objective:** Guess the hidden sequence of colors.
2.  **Making a Guess:** Fill all empty slots with colors. Note that **duplicate colors are not allowed** in a single row.
3.  **Feedback:** After submitting, you will see dots representing how accurate your guess was:
    * Each **Dot** represents a color that is in the **correct position**.
    * The goal is to get all dots to appear.
4.  **Win/Loss:** You win if you guess the exact sequence. You lose if you run out of attempts (99 turns).

## Difficulty Modes

Click the icon in the top-left to cycle through modes:

1.  **Normal (Standard):** The secret sequence is generated at the start and remains fixed. Standard logic applies.
2.  **Hard (Adversarial):** The secret sequence is **not** fixed. The game eliminates possible answers based on your guess to ensure the secret remains hidden for as long as possible.
3.  **Expert (Min-Max):** The game adjusts the secret sequence to ensure your guess yields the **minimum amount of information** possible (statistically).

## Controls

* **Mouse/Touch:** Click slots to select and cycle colors.
* **Arrow Keys (Left/Right):** Move selection between slots.
* **Arrow Keys (Up/Down):** Cycle colors in the selected slot.
* **Backspace:** Clear the current slot.
* **Enter:** Submit guess.

## Acknowledgements

* **Icons:** UI icons provided by [Google Fonts Icons](https://fonts.google.com/icons).

## License 

This project is licensed under the MIT License.
