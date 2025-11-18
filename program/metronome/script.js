// === 状态变量 ===
let bpm = 120;
let beatsPerMeasure = 4;
let isPlaying = false;
let currentBeatIndex = 0;
let audioCtx = null;

let nextNoteTime = 0.0;
let timerID = null;
const lookahead = 25.0;
const scheduleAheadTime = 0.1;

const bpmDisplay = document.getElementById('bpm-value');
const beatIndicatorSvg = document.getElementById('beat-indicator-svg');
const rippleEl = document.getElementById('ripple-layer');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');

// === 初始化 ===
function init() { drawBeatIndicators(); }

// === 逻辑控制 ===
function changeBpm(amount) {
  bpm += amount;
  if (bpm < 1)
    bpm = 1;
  if (bpm > 300)
    bpm = 300;
  bpmDisplay.textContent = bpm;
}

function changeBeats(amount) {
  beatsPerMeasure += amount;
  if (beatsPerMeasure < 1)
    beatsPerMeasure = 1;
  if (beatsPerMeasure > 64)
    beatsPerMeasure = 64; // 上限可以设置高一点

  if (currentBeatIndex >= beatsPerMeasure) {
    currentBeatIndex = 0;
  }
  drawBeatIndicators();
  // 如果正在暂停状态，且切换了模式，需要刷新一下视觉显示（例如文字模式下更新分母）
  if (!isPlaying) {
    resetVisuals();
  }
}

function togglePlay() {
  isPlaying = !isPlaying;

  if (isPlaying) {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    currentBeatIndex = 0;
    nextNoteTime = audioCtx.currentTime;
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
    scheduler();
  } else {
    window.clearTimeout(timerID);
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
    resetVisuals();
  }
}

// === 音频引擎 ===
function scheduler() {
  while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
    scheduleNote(currentBeatIndex, nextNoteTime);
    nextNote();
  }
  timerID = window.setTimeout(scheduler, lookahead);
}

function nextNote() {
  const secondsPerBeat = 60.0 / bpm;
  nextNoteTime += secondsPerBeat;
  currentBeatIndex++;
  if (currentBeatIndex === beatsPerMeasure) {
    currentBeatIndex = 0;
  }
}

function scheduleNote(beatNumber, time) {
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  if (beatNumber === 0) {
    osc.frequency.value = 1000;
  } else {
    osc.frequency.value = 600;
  }

  gainNode.gain.setValueAtTime(1, time);
  gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

  osc.start(time);
  osc.stop(time + 0.05);

  const timeUntilDraw = (time - audioCtx.currentTime) * 1000;
  setTimeout(() => { triggerVisuals(beatNumber); }, Math.max(0, timeUntilDraw));
}

// === 视觉绘制与动画 (核心更新) ===

function drawBeatIndicators() {
  beatIndicatorSvg.innerHTML = '';

  // === 模式 1: 节拍数 > 8 (文本模式 m/n) ===
  if (beatsPerMeasure > 8) {
    const textEl =
        document.createElementNS("http://www.w3.org/2000/svg", "text");
    textEl.setAttribute("x", "50%");
    textEl.setAttribute("y", "50%");
    textEl.setAttribute("class", "beat-text");
    textEl.setAttribute("id", "beat-text-el");
    // 初始显示 1 / N
    textEl.textContent = `1 / ${beatsPerMeasure}`;
    beatIndicatorSvg.appendChild(textEl);
  }
  // === 模式 2: 节拍数 <= 8 (图形模式) ===
  else {
    const spacing = 25;
    const totalWidth = (beatsPerMeasure - 1) * spacing;
    const startX = (240 - totalWidth) / 2; // 使用新宽度 240 计算居中
    const centerY = 25;                    // 垂直居中
    const size = 8;

    for (let i = 0; i < beatsPerMeasure; i++) {
      const cx = startX + i * spacing;
      let shape;

      // 第一拍方形，其余圆形
      if (i === 0) {
        shape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        shape.setAttribute("x", cx - size);
        shape.setAttribute("y", centerY - size);
        shape.setAttribute("width", size * 2);
        shape.setAttribute("height", size * 2);
      } else {
        shape =
            document.createElementNS("http://www.w3.org/2000/svg", "circle");
        shape.setAttribute("cx", cx);
        shape.setAttribute("cy", centerY);
        shape.setAttribute("r", size);
      }

      // 设置通用类名，用于处理缩放中心点
      shape.setAttribute("class", "beat-shape");
      shape.setAttribute("id", `beat-${i}`);
      beatIndicatorSvg.appendChild(shape);
    }
  }
}

function triggerVisuals(beatNumber) {
  // 1. 处理拍子指示器动画
  if (beatsPerMeasure > 8) {
    // === 文本模式更新 ===
    const textEl = document.getElementById('beat-text-el');
    if (textEl) {
      textEl.textContent = `${beatNumber + 1} / ${beatsPerMeasure}`;
      // 简单的文本跳动效果
      textEl.classList.remove('beat-text-active');
      void textEl.offsetWidth;
      textEl.classList.add('beat-text-active');
    }
  } else {
    // === 图形模式更新 ===
    const shapes = beatIndicatorSvg.getElementsByClassName('beat-shape');
    for (let i = 0; i < shapes.length; i++) {
      if (i === beatNumber) {
        // 添加 active 类触发实心 + 弹跳动画
        shapes[i].classList.add('beat-active');
      } else {
        shapes[i].classList.remove('beat-active');
      }
    }
  }

  // 2. BPM 数字跳动
  bpmDisplay.classList.remove('pulse-text');
  void bpmDisplay.offsetWidth;
  bpmDisplay.classList.add('pulse-text');

  // 3. 波纹扩散
  rippleEl.classList.remove('ripple-animate');
  void rippleEl.offsetWidth;
  rippleEl.classList.add('ripple-animate');
}

function resetVisuals() {
  // 停止时重置状态
  if (beatsPerMeasure > 8) {
    const textEl = document.getElementById('beat-text-el');
    if (textEl)
      textEl.textContent = `1 / ${beatsPerMeasure}`;
  } else {
    const shapes = beatIndicatorSvg.getElementsByClassName('beat-shape');
    for (let i = 0; i < shapes.length; i++) {
      shapes[i].classList.remove('beat-active');
    }
  }

  bpmDisplay.classList.remove('pulse-text');
  rippleEl.classList.remove('ripple-animate');
}

function toggleAbout() {
  const aboutSection = document.getElementById('about-text');
  if (aboutSection.style.display === 'block') {
    aboutSection.style.display = 'none';
  } else {
    aboutSection.style.display = 'block';
  }
}

init();
