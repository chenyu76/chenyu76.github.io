/*
TODO:
- 添加更多地图
- 最好可以完全随机生成？
- 添加结算界面
*/
const CAMPS_COLORS = [
  "#FFFFFF",
  "#FF5252",
  "#448AFF",
  "#FFD740",
  "#FF4081",
  "#7C4DFF",
  "#18FFFF",
  "#69F0AE",
  "#FF9AA2", 
  "#FFB7B2", 
  "#FFDAC1", 
  "#E2F0CB", 
  "#B5EAD7", 
  "#C7CEEA", 
  "#F8C8DC"  
];

const MAX_ITERATION = 100; // 最大迭代次数
const VALUE_DOT_RADIUS = 5; // 点的半径
let EDGE_LEN = 50; // 方块的边长
let EDGE_MARGIN = EDGE_LEN / 10; // 方块之间的间距
let map_size = 6; // 地图大小，单位是方块数量

var now_player = 1; // 当前玩家编号
var player_num = 2; // 玩家数量，0号阵营是空的
var player_allow_click_blank = Array(player_num + 1).fill(true); // 是否允许点击空白处
var map_type = "random"; // 地图类型，默认是方形地图
var player_owned = Array(player_num + 1).fill(0); // 玩家拥有的方块数量


function change_background_color(color) {
  // const mainElement = document.querySelector("main");
  // if (mainElement) {
  //   mainElement.style.backgroundColor = color;
  // }
  const game_board = document.getElementById("game-board");
  game_board.style.backgroundColor = color;
}


function approx(a, b, tolerance = 0.01) {
  return Math.abs(a - b) < tolerance;
}
function approx2d(p1, p2, tolerance = 0.01) {
  return approx(p1.x, p2.x, tolerance) && approx(p1.y, p2.y, tolerance);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 游戏重置函数
function resetGame() {
  now_player = 1; // 当前玩家编号
  player_allow_click_blank = Array(player_num + 1).fill(true); // 是否允许点击空白处
player_owned = Array(player_num + 1).fill(0); // 玩家拥有的方块数量
  change_background_color(CAMPS_COLORS[now_player] + "88");

  const game_board = document.getElementById("game-board");
  const childrenElements = game_board.children;
  for (let i = 0; i < childrenElements.length; i++) {
    clearContainer(childrenElements[i]);
  }
  
  game_boards[map_type](game_board);
  console.log("游戏已重置。");
}

// 清空容器
function clearContainer(container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const restartButton = document.getElementById("restartButton");
  const settingsButton = document.getElementById("settingsButton");
  const settingsModal = document.getElementById("settingsModal");
  const closeButton = settingsModal.querySelector(".close-button");
  const saveSettingsButton = document.getElementById("saveSettings");

  // 设置界面的元素
  const playerCountSelect = document.getElementById("playerCount");
  const gameMapSelect = document.getElementById("gameMap");
  const edgeLenSlider = document.getElementById("edgeLen");
  const edgeLenValueSpan = document.getElementById("edgeLenValue");
  const mapSizeSlider = document.getElementById("mapSize");
  const mapSizeValueSpan = document.getElementById("mapSizeValue");

  // 初始化EDGE_LEN显示值
  edgeLenValueSpan.textContent = edgeLenSlider.value;

  // 重玩按钮点击事件
  restartButton.addEventListener("click", () => {
    // alert("游戏即将重玩！");
    resetGame();
  });

  // 设置按钮点击事件
  settingsButton.addEventListener("click", () => {
    settingsModal.style.display = "flex"; // 显示模态框
  });

  // 关闭按钮点击事件
  closeButton.addEventListener("click", () => {
    settingsModal.style.display = "none"; // 隐藏模态框
  });

  // 点击模态框外部关闭
  window.addEventListener("click", (event) => {
    if (event.target == settingsModal) {
      settingsModal.style.display = "none";
    }
  });

  // EDGE_LEN 滑块值改变时更新显示
  edgeLenSlider.addEventListener("input", () => {
    edgeLenValueSpan.textContent = edgeLenSlider.value;
  });

  // 地图大小滑块值改变时更新显示
  mapSizeSlider.addEventListener("input", () => {
    mapSizeValueSpan.textContent = mapSizeSlider.value;
  });

  // 保存设置按钮点击事件
  saveSettingsButton.addEventListener("click", () => {
    player_num = Number(playerCountSelect.value);
    EDGE_LEN = Number(edgeLenSlider.value);
    EDGE_MARGIN = Math.ceil(EDGE_LEN / 10); // 方块之间的间距
    map_size = Number(mapSizeSlider.value);
    map_type = gameMapSelect.value;

    settingsModal.style.display = "none"; // 保存后关闭模态框
    resetGame();
  });

  resetGame();
});
