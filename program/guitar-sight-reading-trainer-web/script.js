// --- 常量配置 ---
const CONSTANTS = {
  // 基础音高: 1弦(E4) -> 64, ..., 6弦(E2) -> 40
  baseMidi : {1 : 64, 2 : 59, 3 : 55, 4 : 50, 5 : 45, 6 : 40},
  noteNames :
      [ 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B' ],
  // 指板绘制尺寸
  fretWidth : 70,
  nutWidth : 40,
  stringHeight : 45,
  totalFrets : 16
};

// --- 全局状态 ---
let CONFIG = {
  minFret : 0,
  maxFret : 3,
  inputMode : 'picker' // 'picker' | 'fretboard'
};

const STATE = {
  notes : [],       // 当前题组
  idx : 0,          // 当前进行到第几个音
  completedCnt : 0, // 总完成组数

  // Picker 模式专用状态
  currentString : 1,
  currentFret : 0,

  // 锁
  isLevelDone : false
};

// --- 音频引擎 (Web Audio API) ---
const AudioEngine = {
  ctx : null,
  init : function() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended')
      this.ctx.resume();
  },
  play : function(midi, type = 'correct') {
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (type === 'correct') {
      // 三角波模拟拨弦
      osc.type = 'triangle';
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      osc.frequency.setValueAtTime(freq, t);

      // 包络
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.4, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);

      osc.start(t);
      osc.stop(t + 1);
    } else {
      // 错误音效: 锯齿波
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, t);
      osc.frequency.linearRampToValueAtTime(60, t + 0.2);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.2);

      osc.start(t);
      osc.stop(t + 0.2);
    }
    osc.connect(gain);
    gain.connect(this.ctx.destination);
  },
  vibrate : function(ms) {
    if (navigator.vibrate)
      navigator.vibrate(ms);
  }
};

// --- 初始化 ---
window.onload = () => {
  initPicker();
  renderFretboard(); // 预先渲染指板
  applyConfigUI();   // 应用初始配置显示
  newLevel();
};

// --- 模式切换与 UI 控制 ---
function applyConfigUI() {
  const pickerCont = document.getElementById('mode-picker-container');
  const fretCont = document.getElementById('mode-fretboard-container');

  if (CONFIG.inputMode === 'picker') {
    pickerCont.style.display = 'flex';
    fretCont.style.display = 'none';
  } else {
    pickerCont.style.display = 'none';
    fretCont.style.display = 'flex';
    // 切换到指板模式时，重新计算一次滚动位置，防止渲染未完成时计算错误
    setTimeout(() => scrollToFret(CONFIG.minFret), 100);
  }
}

// --- 游戏核心逻辑 ---
function newLevel() {
  STATE.notes = [];
  STATE.idx = 0;
  STATE.isLevelDone = false;

  // 清理 UI
  document.querySelectorAll('.marker').forEach(e => e.remove());
  const btn = document.getElementById('btn-check');
  btn.innerText = "确 认";
  btn.style.background = "var(--primary)";
  btn.classList.remove('wrong-anim');

  // 生成题库
  let validMidis = new Set();
  for (let s = 1; s <= 6; s++) {
    for (let f = CONFIG.minFret; f <= CONFIG.maxFret; f++) {
      let m = CONSTANTS.baseMidi[s] + f;
      // 限制在常用吉他音域显示范围内
      if (m >= 40 && m <= 88)
        validMidis.add(m);
    }
  }
  const pool = Array.from(validMidis);

  // 随机取4个
  for (let i = 0; i < 4; i++) {
    if (pool.length > 0) {
      const m = pool[Math.floor(Math.random() * pool.length)];
      STATE.notes.push({midi : m, done : false});
    }
  }

  renderStaff();

  // 如果是指板模式，自动滚动到合适位置
  if (CONFIG.inputMode === 'fretboard') {
    scrollToFret(CONFIG.minFret);
  }
}

function handleSuccess() {
  const target = STATE.notes[STATE.idx];
  target.done = true;
  STATE.idx++;
  renderStaff();

  if (STATE.idx >= STATE.notes.length) {
    STATE.isLevelDone = true;
    STATE.completedCnt++;
    document.getElementById('completed-number').innerText = STATE.completedCnt;
    document.getElementById('completed-number-2').innerText =
        STATE.completedCnt;

    // UI 反馈
    const btn = document.getElementById('btn-check');
    if (CONFIG.inputMode === 'picker') {
      btn.innerText = `第${STATE.completedCnt}组完成! 下一组...`;
      btn.style.background = "var(--success)";
    }

    setTimeout(newLevel, 800);
  }
}

// 1. Picker 模式的检查逻辑
function checkAnswerPicker() {
  if (STATE.isLevelDone)
    return;
  AudioEngine.init();

  const target = STATE.notes[STATE.idx];
  const userMidi = CONSTANTS.baseMidi[STATE.currentString] + STATE.currentFret;

  AudioEngine.play(userMidi, userMidi === target.midi ? 'correct' : 'wrong');

  if (userMidi === target.midi) {
    handleSuccess();
  } else {
    // 错误反馈
    const btn = document.getElementById('btn-check');
    btn.classList.add('wrong-anim');
    setTimeout(() => btn.classList.remove('wrong-anim'), 400);
    AudioEngine.vibrate(100);
  }
}

// 2. Fretboard 模式的检查逻辑
function handleFretClick(e, string, fret, zoneElement) {
  if (STATE.isLevelDone)
    return;

  const target = STATE.notes[STATE.idx];
  const clickedMidi = CONSTANTS.baseMidi[string] + fret;

  // 计算 Marker 位置
  const rect = zoneElement.getBoundingClientRect();
  // 因为 overflow 容器的关系，我们需要把 marker 放到 inner 里，用
  // offsetLeft/Top
  const markerX = zoneElement.offsetLeft + zoneElement.offsetWidth / 2;
  const markerY = zoneElement.offsetTop + zoneElement.offsetHeight / 2;

  // 播放声音
  AudioEngine.play(clickedMidi,
                   clickedMidi === target.midi ? 'correct' : 'wrong');

  if (clickedMidi === target.midi) {
    showMarker(markerX, markerY, 'correct', getNoteName(clickedMidi));
    handleSuccess();
  } else {
    showMarker(markerX, markerY, 'wrong', 'X');
    AudioEngine.vibrate(100);
  }
}

function showMarker(x, y, type, text) {
  const boardInner = document.getElementById('fretboard-inner');
  const m = document.createElement('div');
  m.className = `marker ${type}`;
  m.innerText = text;
  m.style.left = x + 'px';
  m.style.top = y + 'px';
  boardInner.appendChild(m);
  setTimeout(() => m.remove(), 800);
}

// --- Picker (滚轮) 逻辑 ---
function initPicker() {
  const colString = document.getElementById('col-string');
  const colFret = document.getElementById('col-fret');

  // 生成内容
  for (let i = 1; i <= 6; i++) {
    const li = document.createElement('li');
    li.className = 'picker-item';
    li.innerText = i;
    colString.appendChild(li);
  }
  for (let i = 0; i <= 15; i++) {
    const li = document.createElement('li');
    li.className = 'picker-item';
    li.innerText = i;
    colFret.appendChild(li);
  }

  // 绑定滚动事件
  const handleScroll = (e) => {
    const target = e.target;
    const itemHeight = 50; // 对应 CSS --item-height
    const index = Math.round(target.scrollTop / itemHeight);

    if (target.id === 'col-string') {
      STATE.currentString = Math.max(1, Math.min(6, index + 1));
    } else {
      STATE.currentFret = Math.max(0, Math.min(15, index));
    }

    updateSelectionDisplay();

    // 视觉高亮
    Array.from(target.children).forEach((li, idx) => {
      if (idx === index) {
        li.style.color = '#000';
        li.style.fontWeight = 'bold';
        li.style.transform = 'scale(1.1)';
      } else {
        li.style.color = '#bbb';
        li.style.fontWeight = 'normal';
        li.style.transform = 'scale(1)';
      }
    });
  };

  colString.addEventListener('scroll', handleScroll);
  colFret.addEventListener('scroll', handleScroll);

  // 简单的滚轮支持
  [colString, colFret].forEach(el => {
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const dir = e.deltaY > 0 ? 1 : -1;
      const current = Math.round(el.scrollTop / 50);
      el.scrollTo({top : (current + dir) * 50, behavior : 'smooth'});
    }, {passive : false});
  });

  updateSelectionDisplay();
}

function updateSelectionDisplay() {
  document.getElementById('disp-string').innerText = STATE.currentString + "弦";
  document.getElementById('disp-fret').innerText =
      STATE.currentFret == 0 ? "空弦" : STATE.currentFret + "品";

  const midi = CONSTANTS.baseMidi[STATE.currentString] + STATE.currentFret;
  document.getElementById('disp-note').innerText = getNoteName(midi, true);
}

// --- Fretboard (指板) 绘制逻辑 ---
function renderFretboard() {
  const boardInner = document.getElementById('fretboard-inner');
  boardInner.innerHTML = '';

  const totalW =
      CONSTANTS.nutWidth + (CONSTANTS.totalFrets * CONSTANTS.fretWidth) + 50;
  const totalH = (6 * CONSTANTS.stringHeight) + 40; // 上下留白

  boardInner.style.width = totalW + 'px';
  boardInner.style.height = totalH + 'px'; // 确保高度撑开

  // 绘制弦
  for (let s = 1; s <= 6; s++) {
    const y = getFretStringY(s);
    const line = document.createElement('div');
    line.className = 'guitar-string';
    line.style.top = y + 'px';
    line.style.height = (1 + (s - 1) * 0.4) + 'px'; // 6弦粗一点
    boardInner.appendChild(line);
  }

  // 绘制品丝和格子
  let currentX = 0;
  for (let f = 0; f <= CONSTANTS.totalFrets; f++) {
    const w = (f === 0) ? CONSTANTS.nutWidth : CONSTANTS.fretWidth;

    // 品数数字
    if (f > 0) {
      const num = document.createElement('div');
      num.className = 'fret-number';
      num.innerText = f;
      num.style.left = (currentX + w / 2) + 'px';
      boardInner.appendChild(num);
    }

    // 记号点 (3, 5, 7, 9, 12)
    if ([ 3, 5, 7, 9, 12, 15 ].includes(f)) {
      const centerY = (getFretStringY(1) + getFretStringY(6)) / 2;
      const inlay = document.createElement('div');
      inlay.className = 'inlay';
      const size = (f === 12 ? 14 : 10);
      inlay.style.width = size + 'px';
      inlay.style.height = size + 'px';
      inlay.style.left = (currentX + w / 2) + 'px';

      if (f === 12) {
        // 12品两个点
        const i1 = inlay.cloneNode();
        const i2 = inlay.cloneNode();
        i1.style.top = (centerY - 35) + 'px';
        i2.style.top = (centerY + 35) + 'px';
        boardInner.appendChild(i1);
        boardInner.appendChild(i2);
      } else {
        inlay.style.top = centerY + 'px';
        boardInner.appendChild(inlay);
      }
    }

    // 品丝线
    const wire = document.createElement('div');
    wire.className = 'fret-wire';
    wire.style.left = (currentX + w) + 'px';
    // 0品右边是弦枕
    if (f === 0) {
      wire.style.width = '6px';
      wire.style.background = '#ddd';
    }
    boardInner.appendChild(wire);

    // 点击区域生成
    for (let s = 1; s <= 6; s++) {
      const zone = document.createElement('div');
      zone.className = 'touch-zone';
      zone.style.left = currentX + 'px';
      zone.style.width = w + 'px';
      // 区域高度覆盖弦的上下
      zone.style.top = (getFretStringY(s) - CONSTANTS.stringHeight / 2) + 'px';
      zone.style.height = CONSTANTS.stringHeight + 'px';

      zone.onclick = (e) => handleFretClick(e, s, f, zone);
      boardInner.appendChild(zone);
    }

    currentX += w;
  }
}

function getFretStringY(stringNum) {
  // 1弦在最下方 (视觉上), 6弦在最上方? 通常 TAB 谱 1弦在最上.
  // 这里我们按物理位置：1弦细在下(高音)，6弦粗在上(低音) 或者反过来均可
  // 采用：1弦(高音)在页面最下方(Y值最大)，6弦(低音)在最上方(Y值最小) ->
  // 符合抱吉他视角 但 Index2 的逻辑是 1弦Y值大。我们保持一致。 修正：Index2
  // 的逻辑: startY + (s-1)*height. s=1 -> y=30; s=6 -> y大. 这意味着 s=1
  // (高音E) 在顶部。这符合 Tab 谱习惯。
  const startY = 30;
  return startY + (stringNum - 1) * CONSTANTS.stringHeight;
}

function scrollToFret(fretNum) {
  const viewport = document.getElementById('fretboard-viewport');
  const targetX = (fretNum * CONSTANTS.fretWidth);
  const scrollX =
      targetX - (viewport.offsetWidth / 2) + CONSTANTS.fretWidth / 2;
  viewport.scrollTo({left : Math.max(0, scrollX), behavior : 'smooth'});
}

// --- SVG 五线谱渲染 (公用) ---
function renderStaff() {
  const svgEl = document.getElementById('staff-svg');
  const startX = 90;
  const spacing = 70;
  const lineY = [ 50, 60, 70, 80, 90 ];
  let html = '';

  // 五线谱背景
  lineY.forEach(y => html += `<line x1="10" y1="${y}" x2="340" y2="${
                    y}" stroke="#999" stroke-width="1" />`);

  // 高音谱号 path
  const gClef =
      `m12.049 3.5296c0.305 3.1263-2.019 5.6563-4.0772 7.7014-0.9349 0.897-0.155 0.148-0.6437 0.594-0.1022-0.479-0.2986-1.731-0.2802-2.11 0.1304-2.6939 2.3198-6.5875 4.2381-8.0236 0.309 0.5767 0.563 0.6231 0.763 1.8382zm0.651 16.142c-1.232-0.906-2.85-1.144-4.3336-0.885-0.1913-1.255-0.3827-2.51-0.574-3.764 2.3506-2.329 4.9066-5.0322 5.0406-8.5394 0.059-2.232-0.276-4.6714-1.678-6.4836-1.7004 0.12823-2.8995 2.156-3.8019 3.4165-1.4889 2.6705-1.1414 5.9169-0.57 8.7965-0.8094 0.952-1.9296 1.743-2.7274 2.734-2.3561 2.308-4.4085 5.43-4.0046 8.878 0.18332 3.334 2.5894 6.434 5.8702 7.227 1.2457 0.315 2.5639 0.346 3.8241 0.099 0.2199 2.25 1.0266 4.629 0.0925 6.813-0.7007 1.598-2.7875 3.004-4.3325 2.192-0.5994-0.316-0.1137-0.051-0.478-0.252 1.0698-0.257 1.9996-1.036 2.26-1.565 0.8378-1.464-0.3998-3.639-2.1554-3.358-2.262 0.046-3.1904 3.14-1.7356 4.685 1.3468 1.52 3.833 1.312 5.4301 0.318 1.8125-1.18 2.0395-3.544 1.8325-5.562-0.07-0.678-0.403-2.67-0.444-3.387 0.697-0.249 0.209-0.059 1.193-0.449 2.66-1.053 4.357-4.259 3.594-7.122-0.318-1.469-1.044-2.914-2.302-3.792zm0.561 5.757c0.214 1.991-1.053 4.321-3.079 4.96-0.136-0.795-0.172-1.011-0.2626-1.475-0.4822-2.46-0.744-4.987-1.116-7.481 1.6246-0.168 3.4576 0.543 4.0226 2.184 0.244 0.577 0.343 1.197 0.435 1.812zm-5.1486 5.196c-2.5441 0.141-4.9995-1.595-5.6343-4.081-0.749-2.153-0.5283-4.63 0.8207-6.504 1.1151-1.702 2.6065-3.105 4.0286-4.543 0.183 1.127 0.366 2.254 0.549 3.382-2.9906 0.782-5.0046 4.725-3.215 7.451 0.5324 0.764 1.9765 2.223 2.7655 1.634-1.102-0.683-2.0033-1.859-1.8095-3.227-0.0821-1.282 1.3699-2.911 2.6513-3.198 0.4384 2.869 0.9413 6.073 1.3797 8.943-0.5054 0.1-1.0211 0.143-1.536 0.143z`;
  html += `<path d="${gClef}" transform="scale(1.6) translate(10,25)" />`;

  STATE.notes.forEach((note, i) => {
    const cx = startX + (i * spacing);
    const {y, ledgerLines} = getNoteY(note.midi);

    let color = '#ccc';
    if (note.done)
      color = '#34C759';
    else if (i === STATE.idx)
      color = '#000';

    // 当前音符高亮背景
    if (i === STATE.idx) {
      html += `<rect x="${
          cx -
          25}" y="10" width="50" height="120" fill="rgba(0,122,255,0.08)" rx="8" />`;
    }

    // 加线
    ledgerLines.forEach(ly => {
      html += `<line x1="${cx - 14}" y1="${ly}" x2="${cx + 14}" y2="${
          ly}" stroke="${color}" stroke-width="1" />`;
    });

    // 符头
    html += `<ellipse cx="${cx}" cy="${y}" rx="6" ry="5" fill="${color}" />`;

    // 符干
    const stemDir = y < 70 ? 1 : -1;
    const stemX = stemDir === 1 ? cx - 5 : cx + 5;
    html += `<line x1="${stemX}" y1="${y}" x2="${stemX}" y2="${
        y + 35 * stemDir}" stroke="${color}" stroke-width="1.5" />`;

    // 升号 (简化：非C调自然音都标升号)
    const isNatural = [ 0, 2, 4, 5, 7, 9, 11 ].includes(note.midi % 12);
    if (!isNatural) {
      html += `<text x="${cx - 20}" y="${y + 5}" font-size="18" fill="${
          color}" font-family="Arial">♯</text>`;
    }
  });
  svgEl.innerHTML = html;
}

function getNoteY(midi) {
  const stepMap = {
    0 : 0,
    1 : 0,
    2 : 1,
    3 : 1,
    4 : 2,
    5 : 3,
    6 : 3,
    7 : 4,
    8 : 4,
    9 : 5,
    10 : 5,
    11 : 6
  };
  const absStep = (Math.floor(midi / 12) - 4) * 7 + stepMap[midi % 12];
  const y = 100 - (absStep * 5);

  let ledgerLines = [];
  // 低音加线
  if (absStep < 2) {
    for (let s = 0; s >= absStep; s -= 2)
      ledgerLines.push(100 - s * 5);
  }
  // 高音加线
  if (absStep > 10) {
    for (let s = 12; s <= absStep; s += 2)
      ledgerLines.push(100 - s * 5);
  }
  return {y, ledgerLines};
}

function getNoteName(midi, includeOctave = false) {
  const name = CONSTANTS.noteNames[midi % 12];
  if (!includeOctave)
    return name;
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

// --- 设置逻辑 ---
function openSettings() {
  document.getElementById('set-mode').value = CONFIG.inputMode;
  document.getElementById('set-min').value = CONFIG.minFret;
  document.getElementById('set-max').value = CONFIG.maxFret;
  document.getElementById('modal-overlay').style.display = 'flex';
}

function saveSettings() {
  const min = parseInt(document.getElementById('set-min').value);
  const max = parseInt(document.getElementById('set-max').value);
  const mode = document.getElementById('set-mode').value;

  if (min > max) {
    alert("最小品不能大于最大品");
    return;
  }

  CONFIG.minFret = min;
  CONFIG.maxFret = max;
  CONFIG.inputMode = mode;

  document.getElementById('modal-overlay').style.display = 'none';

  applyConfigUI();
  newLevel();
}
