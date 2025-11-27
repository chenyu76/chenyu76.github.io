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
const bpmContainer = document.getElementById('bpm-container');
const bpmInput = document.getElementById('bpm-input');
const bpmMarking = document.getElementById('bpm-marking');
const beatIndicatorSvg = document.getElementById('beat-indicator-svg');
const rippleEl = document.getElementById('ripple-layer');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const metronomeArm = document.getElementById('metronome-arm')
const metronomeArmBg = document.getElementById('metronome-arm-bg')

// 全局变量用于存储唤醒锁对象
let wakeLock = null;

let metronomeAnimationFrameId = null;
let metronomeStartTime = 0;

// 节拍器摆动最大角度
const maxAngle = 10;

// === 初始化 ===
function init() {
  drawBeatIndicators();
  updateTempoMarking();
}

/**
 * 根据给定的 BPM 数值返回对应的意大利语速度术语
 * @param {number} bpm - 每分钟拍数
 * @returns {string} 对应的意大利语术语 (例如 "Andante")
 */
function getTempoMarking(bpm) {
  // 确保输入是有效数字
  if (typeof bpm !== 'number' || bpm <= 0) {
    return "Invalid BPM";
  }

  // 定义速度范围配置表 (按最大值排序)
  // 范围参考了现代通用的节拍器标准
  const tempos = [
    {limit : 24, term : "Larghissimo"},      // 极广板
    {limit : 40, term : "Grave"},            // 庄板
    {limit : 60, term : "Largo"},            // 广板
    {limit : 66, term : "Lento"},            // 慢板
    {limit : 76, term : "Adagio"},           // 柔板
    {limit : 108, term : "Andante"},         // 行板
    {limit : 120, term : "Moderato"},        // 中板
    {limit : 156, term : "Allegro"},         // 快板
    {limit : 176, term : "Vivace"},          // 活板
    {limit : 200, term : "Presto"},          // 急板
    {limit : Infinity, term : "Prestissimo"} // 最急板
  ];

  // 使用 find 查找第一个 limit 大于等于输入 bpm 的对象
  const match = tempos.find(t => bpm <= t.limit);

  return match ? match.term : "Prestissimo";
}

function updateTempoMarking() {
  bpmMarking.textContent = getTempoMarking(parseInt(bpmDisplay.textContent));
}

function metronomeAnimateLoop(_timestamp) {
  if (!isPlaying)
    return;

  const angle = -maxAngle *
                Math.cos(Math.PI * (audioCtx.currentTime - metronomeStartTime) /
                         (60 / bpm));

  rotateMetronomeArm(angle);
  animationFrameId = window.requestAnimationFrame(metronomeAnimateLoop);
}

function rotateMetronomeArm(angle) {
  currentAngle = angle;
  metronomeArm.setAttribute('transform', `rotate(${angle}, 100, 180)`);
  metronomeArmBg.setAttribute('transform', `rotate(${angle}, 100, 180)`);
}

// === 逻辑控制 ===
function changeBpm(amount) {
  if (amount > 1 && bpm == 1)
    bpm = 0;
  bpm += amount;
  if (bpm < 1)
    bpm = 1;
  if (bpm > 600)
    bpm = 600;
  bpmDisplay.textContent = bpm;
  if (isPlaying) { // 重新启动以应用新的 BPM
    togglePlay();
    togglePlay();
  }
  updateTempoMarking();
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

// 辅助函数：封装请求唤醒锁的逻辑
async function requestWakeLock() {
  // 仅当浏览器支持 Wake Lock 且当前没有锁时才尝试获取
  if ('wakeLock' in navigator && wakeLock === null) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      // console.log('Screen Wake Lock successfully acquired.');

      // === 释放事件监听器 ===
      wakeLock.addEventListener('release', async () => {
        // console.log('Screen Wake Lock was released automatically.');

        // 检查：如果音乐仍在播放 且 页面可见，则尝试重新获取锁
        // (页面可见性检查是必要的，因为锁通常在页面隐藏时释放)
        if (isPlaying && document.visibilityState === 'visible') {
          // console.log('Music is still playing. Re-acquiring Wake Lock...');
          wakeLock = null; // 在重新请求前清除旧的引用
          await requestWakeLock();
        } else {
          wakeLock = null; // 确保状态同步
        }
      });

    } catch (err) {
      console.error(`Could not acquire wake lock: ${err.name}, ${err.message}`);
      wakeLock = null;
    }
  }
}

// 辅助函数：封装释放唤醒锁的逻辑
async function releaseWakeLock() {
  if (wakeLock !== null) {
    await wakeLock.release();
    wakeLock = null;
    // console.log('Screen Wake Lock released.');
  }
}

// **核心函数：已整合 Wake Lock 调用**
async function togglePlay() {
  isPlaying = !isPlaying;

  if (isPlaying) {
    // 播放逻辑
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    currentBeatIndex = 0;
    nextNoteTime = audioCtx.currentTime;
    metronomeStartTime = nextNoteTime;
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';

    // 在开始播放时请求唤醒锁
    await requestWakeLock();

    if (metronomeAnimationFrameId !== null) {
      window.cancelAnimationFrame(metronomeAnimationFrameId);
    }
    // 启动动画循环
    metronomeAnimationFrameId =
        window.requestAnimationFrame(metronomeAnimateLoop);

    scheduler();
  } else {
    // 停止逻辑
    window.clearTimeout(timerID);
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
    resetVisuals();

    if (metronomeAnimationFrameId !== null) {
      window.cancelAnimationFrame(metronomeAnimationFrameId);
      metronomeAnimationFrameId = null; // 清空 ID
    }

    // 在停止播放时释放唤醒锁
    await releaseWakeLock();
  }
}

// 当用户从其他标签页切回当前播放页面时，需要重新获取锁
document.addEventListener('visibilitychange', async () => {
  if (isPlaying && document.visibilityState === 'visible') {
    // 如果音乐正在播放 且 页面重新可见，则尝试获取锁
    await requestWakeLock();
  }
  // 注意：在页面隐藏时，浏览器通常会自动释放锁，无需手动调用 release。
});

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
  // 触发视觉效果
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

// 点击BPM显示区域切换到输入模式
bpmContainer.addEventListener('click', function() {
  // 隐藏显示值，显示输入框
  bpmDisplay.style.display = 'none';
  bpmInput.style.display = 'block';
  bpmMarking.style.display = 'none';

  // 设置输入框的值
  bpmInput.value = bpm;

  // 自动聚焦并选择文本
  bpmInput.focus();
  bpmInput.select();
});
// 当输入框失去焦点时保存
bpmInput.addEventListener('blur', saveBPM);
// 按Enter键保存
bpmInput.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    saveBPM();
  }
});
// 使用输入框保存BPM值的函数
function saveBPM() {
  const newBPM = parseInt(bpmInput.value);

  // 验证输入
  if (isNaN(newBPM) || newBPM < 1 || newBPM > 600) {
    // 如果输入无效，恢复原值
    bpmInput.value = bpm;
  } else {
    // 更新BPM值
    bpm = newBPM;
    bpmDisplay.textContent = bpm;
  }

  // 切换回显示模式
  bpmDisplay.style.display = 'block';
  bpmInput.style.display = 'none';
  bpmMarking.style.display = 'block';
  updateTempoMarking();

  if (isPlaying) { // 重新启动以应用新的 BPM
    togglePlay();
    togglePlay();
  }
}

init();
