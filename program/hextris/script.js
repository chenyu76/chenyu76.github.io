let globalId = 0;
let getGlobalId = () => globalId++;
const arrayValEqual = (b) =>
    ((a) => a.length === b.length && a.every((val, i) => val === b[i]));
const randomValFromArray = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 向量操作类
class Vector {
  static add(a, b, f = (x, y) => x + y) {
    if (typeof a === 'number' && typeof b === 'number')
      return f(a, b);
    if (typeof a === 'number')
      return b.map(val => f(val, a));
    if (typeof b === 'number')
      return a.map(val => f(val, b));
    return a.map((val, i) => f(val, b[i]));
  }
  static subtract(a, b) { return Vector.add(a, b, (x, y) => x - y); }
  static dot(a, b) { return a.reduce((sum, val, i) => sum + val * b[i], 0); }
  // 向量的模
  static norm(a) {
    return Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  }
  // 标量乘法
  static times(a, b) {
    if (Array.isArray(a))
      return a.map(val => val * b);
    return b.map(val => val * a);
  }
  // 标量除法
  static divide(a, b) { return a.map(val => val / b); }
  // 绝对值后求和
  static absSum(a) { return a.reduce((sum, val) => sum + Math.abs(val), 0); }
}
// 矩阵操作类
class Matrix {
  static add(a, b) {
    return a.map((row, i) => row.map((val, j) => val + b[i][j]));
  }
  static subtract(a, b) {
    return a.map((row, i) => row.map((val, j) => val - b[i][j]));
  }
  static multiply(a, b) {
    return a.map(row => b[0].map((_, j) => row.reduce(
                                     (sum, val, k) => sum + val * b[k][j], 0)));
  }
  static transpose(matrix) {
    return matrix[0].map((_, i) => matrix.map(row => row[i]));
  }
}

let ht = null;

const bgmSoundEffect = new SoundEffect();
document.getElementById("settings-bgm").addEventListener("click", () => bgmSoundEffect.toggleBGM());

// Settings sliders — game config

function getGameOptions() {
  return {
    blockCount: parseInt(document.getElementById("settings-blocks").value),
    baseDropInterval: parseInt(document.getElementById("settings-drop-speed").value),
    dropHeight: parseInt(document.getElementById("settings-height").value),
  };
}

function startGame() {
  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("end-screen").classList.add("hidden");
  const options = getGameOptions();
  ht = new HexTris("grid-container", 10, options, bgmSoundEffect);
}

// Settings sliders — game config
document.getElementById("settings-blocks").addEventListener("input", (e) => {
  document.getElementById("settings-blocks-value").textContent = e.target.value;
});
document.getElementById("settings-drop-speed").addEventListener("input", (e) => {
  document.getElementById("settings-speed-value").textContent = e.target.value + "ms";
});
document.getElementById("settings-height").addEventListener("input", (e) => {
  document.getElementById("settings-height-value").textContent = e.target.value;
});

// Start button
document.getElementById("start-btn").addEventListener("click", startGame);

// Restart button
document.getElementById("restart-btn").addEventListener("click", () => {
  const options = getGameOptions();
  if (ht) {
    ht.restart(options);
  } else {
    ht = new HexTris("grid-container", 10, options, bgmSoundEffect);
  }
  document.getElementById("end-screen").classList.add("hidden");
});

// Settings restart button
document.getElementById("settings-restart").addEventListener("click", () => {
  const options = getGameOptions();
  document.getElementById("settings-screen").classList.add("hidden");
  document.getElementById("end-screen").classList.add("hidden");
  if (ht) {
    ht.restart(options);
  } else {
    ht = new HexTris("grid-container", 10, options, bgmSoundEffect);
  }
});

// Settings navigation
let settingsReturnTo = "start";

function openSettings(from) {
  settingsReturnTo = from;
  if (from === "game" && ht) ht.pause();
  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("end-screen").classList.add("hidden");
  document.getElementById("settings-screen").classList.remove("hidden");
}

function closeSettings() {
  document.getElementById("settings-screen").classList.add("hidden");
  if (settingsReturnTo === "start") {
    document.getElementById("start-screen").classList.remove("hidden");
  } else if (ht) {
    ht.resume();
  }
}

document.getElementById("start-settings-btn").addEventListener("click", () => openSettings("start"));
document.getElementById("sidebar-settings-btn").addEventListener("click", () => openSettings("game"));
document.getElementById("settings-back").addEventListener("click", closeSettings);

// Settings sliders sync with UI
document.getElementById("settings-zoom").addEventListener("input", (e) => {
  document.getElementById("settings-zoom-value").textContent = parseFloat(e.target.value).toFixed(2);
});
document.getElementById("settings-animation").addEventListener("input", (e) => {
  document.getElementById("settings-anim-value").textContent = parseFloat(e.target.value).toFixed(1) + "s";
});

// Resize handler
function handleResize() {
  if (ht) ht.resetView();
}
function debounce(func, delay = 250) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}
window.addEventListener("resize", debounce(handleResize));
