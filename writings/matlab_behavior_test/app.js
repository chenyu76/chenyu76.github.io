let currentIndex = 0;
let userAnswers =
    new Array(questions.length).fill(null); // stores {selectedIndex, isCorrect}

const questionTextEl = document.getElementById('question-text');
const optionsContainerEl = document.getElementById('options-container');
const explanationAreaEl = document.getElementById('explanation-area');
const progressEl = document.getElementById('progress');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const quizContainer = document.getElementById('quiz-container');
const summaryContainer = document.getElementById('summary-container');
const scoreTextEl = document.getElementById('score-text');
/**
 * Simple Markdown Parser
 * Supports: ```block```, `code`, **bold**, __italic__
 */
function parseMarkdown(text) {
  if (!text)
    return '';
  return text.replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<em>$1</em>')
      .replace("\n", "<br>");
}

function renderQuestion() {
  const q = questions[currentIndex];
  const answerData = userAnswers[currentIndex];

  // Update progress
  progressEl.textContent = `${currentIndex + 1}/${questions.length}`;

  // Render question text
  questionTextEl.innerHTML = parseMarkdown(q.question);

  // Render options
  optionsContainerEl.innerHTML = '';
  q.options.forEach((opt, index) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = parseMarkdown(opt);

    if (answerData) {
      btn.disabled = true;
      if (index === q.answer) {
        btn.classList.add('correct');
      } else if (index === answerData.selectedIndex) {
        btn.classList.add('wrong');
      }
    } else {
      btn.onclick = () => handleSelect(index);
    }
    optionsContainerEl.appendChild(btn);
  });

  // Render explanation
  if (answerData && !answerData.isCorrect && q.explanation) {
    explanationAreaEl.innerHTML = `${parseMarkdown(q.explanation)}`;
    explanationAreaEl.classList.remove('hidden');
  } else {
    explanationAreaEl.classList.add('hidden');
  }

  // Navigation buttons
  prevBtn.disabled = currentIndex === 0;
  nextBtn.textContent =
      currentIndex === questions.length - 1 ? "View results" : "Next";
}

function handleSelect(index) {
  const q = questions[currentIndex];
  const isCorrect = index === q.answer;

  userAnswers[currentIndex] = {selectedIndex : index, isCorrect : isCorrect};

  renderQuestion();
}

prevBtn.onclick = () => {
  if (currentIndex > 0) {
    currentIndex--;
    renderQuestion();
  }
};

nextBtn.onclick = () => {
  if (currentIndex < questions.length - 1) {
    currentIndex++;
    renderQuestion();
  } else {
    showSummary();
  }
};

function showSummary() {
  const total = questions.length;
  const answered = userAnswers.filter(a => a !== null).length;
  const correct = userAnswers.filter(a => a && a.isCorrect).length;

  quizContainer.classList.add('hidden');
  summaryContainer.classList.remove('hidden');

  scoreTextEl.innerHTML = `
        You completed ${answered}/${total}  questions.<br>
        Accuracy: <strong>${Math.round((correct / total) * 100)}%</strong> (${
      correct}/${total})
    `;
}

// Initial render
renderQuestion();
