// --- 全局变量 ---
// 完成数量
let completed_num = 0;
let completed_display = document.getElementById('completed-number');

// --- 音频引擎 (Web Audio API) ---
const AudioEngine = {
  ctx : null,

  init : function() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  playTone : function(midi) {
    this.init();
    const t = this.ctx.currentTime;

    // 振荡器 (Triangle wave 比较接近拨弦)
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';

    // 频率公式
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    osc.frequency.setValueAtTime(freq, t);

    // 包络 (Envelope) 模拟拨弦感
    const gainNode = this.ctx.createGain();

    // Attack: 快速达到音量峰值
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(0.5, t + 0.02);
    // Decay: 指数衰减
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + 1.0);

    // 连接
    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 1.0);
  }
};

// --- 游戏状态 ---
let CONFIG = {minFret : 0, maxFret : 3};
const STATE = {
  notes : [],
  idx : 0,
  baseMidi : {1 : 64, 2 : 59, 3 : 55, 4 : 50, 5 : 45, 6 : 40},
  currentString : 1,
  currentFret : 0
};
const noteNames =
    [ 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B' ];

// --- DOM ---
const colString = document.getElementById('col-string');
const colFret = document.getElementById('col-fret');
const svgEl = document.getElementById('staff-svg');

window.onload = () => {
  initPicker();
  newLevel();
};

// --- 滚轮逻辑 ---
function initPicker() {
  // 弦 1-6
  for (let i = 1; i <= 6; i++) {
    const li = document.createElement('li');
    li.className = 'picker-item';
    li.innerText = i;
    colString.appendChild(li);
  }
  // 品 0-15
  for (let i = 0; i <= 15; i++) {
    const li = document.createElement('li');
    li.className = 'picker-item';
    li.innerText = i;
    colFret.appendChild(li);
  }

  colString.addEventListener('scroll', handleScroll);
  colFret.addEventListener('scroll', handleScroll);
  updateSelectionDisplay();
}

function handleScroll(e) {
  const target = e.target;
  const itemHeight = 50;
  const index = Math.round(target.scrollTop / itemHeight);

  if (target.id === 'col-string') {
    let val = index + 1;
    if (val < 1)
      val = 1;
    if (val > 6)
      val = 6;
    STATE.currentString = val;
  } else {
    let val = index;
    if (val < 0)
      val = 0;
    if (val > 15)
      val = 15;
    STATE.currentFret = val;
  }

  updateSelectionDisplay();
  updatePickerStyle(target, index);
}

function updatePickerStyle(target, activeIndex) {
  Array.from(target.children).forEach((li, idx) => {
    if (idx === activeIndex) {
      li.style.color = '#000';
      li.style.fontWeight = 'bold';
      li.style.transform = 'scale(1.1)';
    } else {
      li.style.color = '#bbb';
      li.style.fontWeight = 'normal';
      li.style.transform = 'scale(1)';
    }
  });
}

function updateSelectionDisplay() {
  document.getElementById('disp-string').innerText = STATE.currentString + "弦";
  document.getElementById('disp-fret').innerText =
      STATE.currentFret == 0 ? "空弦" : STATE.currentFret + "品";

  // 计算音名
  const midi = STATE.baseMidi[STATE.currentString] + STATE.currentFret;
  const name = noteNames[midi % 12];
  const octave = Math.floor(midi / 12) - 1;

  document.getElementById('disp-note').innerText = `${name}${octave}`;
}

// --- 游戏核心 ---
function newLevel() {
  STATE.notes = [];
  STATE.idx = 0;

  let validMidis = new Set();
  for (let s = 1; s <= 6; s++) {
    for (let f = CONFIG.minFret; f <= CONFIG.maxFret; f++) {
      let m = STATE.baseMidi[s] + f;
      if (m >= 40 && m <= 84)
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
  const btn = document.getElementById('btn-check');
  btn.innerText = "确 认";
  btn.style.background = "var(--primary)";
}

function checkAnswer() {
  // 初始化音频环境 (应对浏览器策略)
  AudioEngine.init();

  const target = STATE.notes[STATE.idx];
  const userMidi = STATE.baseMidi[STATE.currentString] + STATE.currentFret;

  // 播放目标音
  AudioEngine.playTone(userMidi);
  if (userMidi === target.midi) {
    // 正确
    target.done = true;
    STATE.idx++;
    renderStaff();

    if (STATE.idx >= STATE.notes.length) {
      const btn = document.getElementById('btn-check');
      completed_num += 1;
      completed_display.innerText = completed_num;
      btn.innerText = `第${completed_num}组完成! 下一组...`;
      btn.style.background = "#34C759";
      setTimeout(newLevel, 800);
    }
  } else {
    // 错误
    const btn = document.getElementById('btn-check');
    btn.classList.add('wrong');
    setTimeout(() => btn.classList.remove('wrong'), 400);
  }
}

// --- 设置 ---
function openSettings() {
  document.getElementById('set-min').value = CONFIG.minFret;
  document.getElementById('set-max').value = CONFIG.maxFret;
  document.getElementById('modal-overlay').style.display = 'flex';
}
function saveSettings() {
  const min = parseInt(document.getElementById('set-min').value);
  const max = parseInt(document.getElementById('set-max').value);
  if (min > max) {
    alert("范围无效");
    return;
  }
  CONFIG.minFret = min;
  CONFIG.maxFret = max;
  document.getElementById('modal-overlay').style.display = 'none';
  newLevel();
}

// --- SVG 渲染 (带升降号逻辑) ---
function renderStaff() {
  const startX = 90;
  const spacing = 70;
  const lineY = [ 50, 60, 70, 80, 90 ];
  let html = '';

  // 五线谱线
  lineY.forEach(y => html += `<line x1="10" y1="${y}" x2="340" y2="${
                    y}" stroke="#999" stroke-width="1" />`);
  // 谱号
  html += `
 <path d="m12.049 3.5296c0.305 3.1263-2.019 5.6563-4.0772 7.7014-0.9349 0.897-0.155 0.148-0.6437 0.594-0.1022-0.479-0.2986-1.731-0.2802-2.11 0.1304-2.6939 2.3198-6.5875 4.2381-8.0236 0.309 0.5767 0.563 0.6231 0.763 1.8382zm0.651 16.142c-1.232-0.906-2.85-1.144-4.3336-0.885-0.1913-1.255-0.3827-2.51-0.574-3.764 2.3506-2.329 4.9066-5.0322 5.0406-8.5394 0.059-2.232-0.276-4.6714-1.678-6.4836-1.7004 0.12823-2.8995 2.156-3.8019 3.4165-1.4889 2.6705-1.1414 5.9169-0.57 8.7965-0.8094 0.952-1.9296 1.743-2.7274 2.734-2.3561 2.308-4.4085 5.43-4.0046 8.878 0.18332 3.334 2.5894 6.434 5.8702 7.227 1.2457 0.315 2.5639 0.346 3.8241 0.099 0.2199 2.25 1.0266 4.629 0.0925 6.813-0.7007 1.598-2.7875 3.004-4.3325 2.192-0.5994-0.316-0.1137-0.051-0.478-0.252 1.0698-0.257 1.9996-1.036 2.26-1.565 0.8378-1.464-0.3998-3.639-2.1554-3.358-2.262 0.046-3.1904 3.14-1.7356 4.685 1.3468 1.52 3.833 1.312 5.4301 0.318 1.8125-1.18 2.0395-3.544 1.8325-5.562-0.07-0.678-0.403-2.67-0.444-3.387 0.697-0.249 0.209-0.059 1.193-0.449 2.66-1.053 4.357-4.259 3.594-7.122-0.318-1.469-1.044-2.914-2.302-3.792zm0.561 5.757c0.214 1.991-1.053 4.321-3.079 4.96-0.136-0.795-0.172-1.011-0.2626-1.475-0.4822-2.46-0.744-4.987-1.116-7.481 1.6246-0.168 3.4576 0.543 4.0226 2.184 0.244 0.577 0.343 1.197 0.435 1.812zm-5.1486 5.196c-2.5441 0.141-4.9995-1.595-5.6343-4.081-0.749-2.153-0.5283-4.63 0.8207-6.504 1.1151-1.702 2.6065-3.105 4.0286-4.543 0.183 1.127 0.366 2.254 0.549 3.382-2.9906 0.782-5.0046 4.725-3.215 7.451 0.5324 0.764 1.9765 2.223 2.7655 1.634-1.102-0.683-2.0033-1.859-1.8095-3.227-0.0821-1.282 1.3699-2.911 2.6513-3.198 0.4384 2.869 0.9413 6.073 1.3797 8.943-0.5054 0.1-1.0211 0.143-1.536 0.143z" 
transform="scale(1.6) translate(10,25)"
/>
`;

  STATE.notes.forEach((note, i) => {
    const cx = startX + (i * spacing);
    const {y, ledgerLines} = getNoteY(note.midi);

    let color = '#ccc';
    if (note.done)
      color = '#34C759';
    else if (i === STATE.idx)
      color = '#000';

    // 当前高亮背景
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

    // 升号逻辑 (简化：除了C大调自然音都标升号)
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
  if (absStep < 2) {
    for (let s = 0; s >= absStep; s -= 2)
      ledgerLines.push(100 - s * 5);
  }
  if (absStep > 10) {
    for (let s = 12; s <= absStep; s += 2)
      ledgerLines.push(100 - s * 5);
  }
  return {y, ledgerLines};
}
