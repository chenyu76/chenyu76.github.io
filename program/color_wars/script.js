/*
- 给每个方块添加内部的圆形的点击事件，点击后会触发更新当前玩家的状态
- 给每个方块添加拥有边,形式为[{x, y, angle}, ...] 如果方块是两倍的长度 边数要记两个
- 一个连接所有方块的函数，通过上面的边来连接方块（这样是O(n^2)的复杂度,能否简单一点？）
- 一个开始游戏按钮，一个重玩按钮，
- 一个设置
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
];

const MAX_ITERATION = 20; // 最大迭代次数
const VALUE_DOT_RADIUS = 5; // 点的半径
let EDGE_LEN = 50; // 方块的边长
const EDGE_MARGIN = 5; // 方块之间的间距

var now_player = 1; // 当前玩家编号
var player_num = 2; // 玩家数量，0号阵营是空的
var player_allow_click_blank = Array(player_num + 1).fill(true); // 是否允许点击空白处
var map_type = "square"; // 地图类型，默认是方形地图

class Block {
  constructor({
    x, // 块中心的 x 坐标
    y, // 块中心的 y 坐标
    edge_len = EDGE_LEN, // 块边长
    edge_margin = EDGE_MARGIN, // 块间距
    edges_num, // 块边数
    init_angle = 0, // 块的旋转角度
    parent,
  }) {
    this.container = document.createElement("div");
    this.shapeCanvas = document.createElement("canvas");
    this.valueCanvas = document.createElement("canvas");
    this.container.className = "block";
    this.container.appendChild(this.shapeCanvas);
    this.container.appendChild(this.valueCanvas);
    this.sctx = this.shapeCanvas.getContext("2d");
    this.vctx = this.valueCanvas.getContext("2d");
    this.canvas_size =
      this.valueCanvas.height =
      this.valueCanvas.width =
      this.shapeCanvas.height =
      this.shapeCanvas.width =
        Math.ceil(edge_len / Math.sin(Math.PI / edges_num));

    this.shapeCanvas.style.position = this.valueCanvas.style.position =
      "absolute";
    this.valueCanvas.style.left =
      this.shapeCanvas.style.left = `${x - this.canvas_size / 2}px`;
    this.valueCanvas.style.top =
      this.shapeCanvas.style.top = `${y - this.canvas_size / 2}px`;

    this.x = x;
    this.y = y;
    this.edge_len = edge_len;
    this.edge_margin = edge_margin;
    this.edges_num = edges_num;
    this.init_angle = init_angle;

    this.camp = 0; // 阵营编号

    this.value = 0; // 当前方块的值

    this.neighbors = [];

    this.container.addEventListener("click", () => {
      if (
        this.camp === now_player ||
        (this.camp === 0 && player_allow_click_blank[now_player])
      ) {
        // 如果当前方块是空的或者是当前玩家的
        player_allow_click_blank[now_player] = false;
        this.update(now_player);
        now_player++;
        if (now_player > player_num) now_player = 1;

        change_background_color(CAMPS_COLORS[now_player] + "88");
      }
    });

    parent.appendChild(this.container);

    this.draw_polygon();

    this.nodes = []; // 用于存储边的节点的位置，是全局坐标

    const len = this.edge_len / Math.sin(Math.PI / this.edges_num) / 2;
    for (let i = 0; i < edges_num; i++) {
      const angle = this.init_angle + (i * 2 * Math.PI) / edges_num;
      const x = this.x + len * Math.cos(angle);
      const y = this.y + len * Math.sin(angle);
      this.nodes.push({ x, y });
    }
  }

  // 添加潜在的邻居方块
  add_potential_neighbors(blocks) {
    for (const block of blocks) {
      if (block === this) continue;
      for (let i = 0; i < this.nodes.length; i++) {
        for (let j = 0; j < block.nodes.length; j++) {
          if (
            approx2d(this.nodes[i], block.nodes[j]) &&
            approx2d(this.nodes_next(i), block.nodes_prev(j))
          ) {
            // 如果两个方块的边相交
            this.add_neighbor(block);
            break;
          }
        }
      }
    }
  }
  nodes_next(i) {
    return this.nodes[(i + 1) % this.nodes.length];
  }
  nodes_prev(i) {
    return this.nodes[(i - 1 + this.nodes.length) % this.nodes.length];
  }

  add_neighbor(block) {
    if (!this.neighbors.includes(block)) {
      this.neighbors.push(block);
      block.add_neighbor(this); // 确保双向连接
    }
  }

  // 更新当前玩家的状态
  update(player, iter = 0) {
    if (iter >= MAX_ITERATION) return;
    // 更新当前玩家的状态
    this.camp = player;

    this.value += 1;

    if (this.value >= this.neighbors.length) {
      this.value = 0; // 如果当前方块的值超过了邻居数量，则重置为0
      this.camp = 0;
      let n;
      for (n of this.neighbors) {
        n.update(player, iter + 1); // 更新所有邻居方块
      }
    }

    // 更新方块外貌
    this.draw_polygon();
    this.draw_value();
  }

  draw_polygon() {
    this.sctx.clearRect(0, 0, this.shapeCanvas.width, this.shapeCanvas.height);
    this.sctx.beginPath();
    const angle_step = (2 * Math.PI) / this.edges_num;
    const len =
      this.edge_len / Math.sin(Math.PI / this.edges_num) / 2 - this.edge_margin;
    let angle = this.init_angle;
    for (let i = 0; i < this.edges_num; i++) {
      const x = this.canvas_size / 2 + len * Math.cos(angle);
      const y = this.canvas_size / 2 + len * Math.sin(angle);
      if (i === 0) {
        this.sctx.moveTo(x, y);
      } else {
        this.sctx.lineTo(x, y);
      }
      angle += angle_step;
    }
    this.sctx.closePath();
    this.sctx.fillStyle = CAMPS_COLORS[this.camp];
    this.sctx.fill();
  }
  draw_value() {
    this.vctx.clearRect(0, 0, this.valueCanvas.width, this.valueCanvas.height);
    this.vctx.fillStyle = "#FFFFFF";
    const draw_circle = (x, y, radius = VALUE_DOT_RADIUS) => {
      this.vctx.beginPath();
      this.vctx.arc(x, y, radius, 0, 2 * Math.PI);
      this.vctx.fill();
    };
    if (this.value > 0) {
      if (this.value == 1)
        draw_circle(this.canvas_size / 2, this.canvas_size / 2);
      else
        for (let i = 0; i < this.value; i++) {
          const angle = (i * 2 * Math.PI) / this.value;
          const x =
            this.canvas_size / 2 + (this.canvas_size * Math.cos(angle)) / 5;
          const y =
            this.canvas_size / 2 + (this.canvas_size * Math.sin(angle)) / 5;
          draw_circle(x, y);
        }
    }
  }
}

function change_background_color(color) {
  // const mainElement = document.querySelector("main");
  // if (mainElement) {
  //   mainElement.style.backgroundColor = color;
  // }
  const game_board = document.getElementById("game-board");
  game_board.style.backgroundColor = color;
}

function square_game_board(game_board) {
  let blocks = [];
  const rows = 10;
  const cols = 10;
  const edges_num = 4;
  game_board.style.width = `${cols * EDGE_LEN + 2 * EDGE_MARGIN}px`;
  game_board.style.height = `${rows * EDGE_LEN + 2 * EDGE_MARGIN}px`;
  // 创建方块
  for (let i = 0; i < rows; i++) {
    blocks.push([]);
    for (let j = 0; j < cols; j++) {
      const x = j * EDGE_LEN + EDGE_LEN / 2 + EDGE_MARGIN;
      const y = i * EDGE_LEN + EDGE_LEN / 2 + EDGE_MARGIN;
      const block = new Block({
        x,
        y,
        edges_num,
        init_angle: Math.PI / 4, // 旋转45度
        parent: game_board,
      });
      blocks[i].push(block);
    }
  }
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const block = blocks[i][j];
      // 添加邻居
      if (i < rows - 1) block.add_neighbor(blocks[i + 1][j]); // 下
      if (j < cols - 1) block.add_neighbor(blocks[i][j + 1]); // 右
    }
  }
}

function hex_game_board(game_board) {
  let blocks = [];
  const rows = 6;
  const cols = 8;
  const width = (EDGE_LEN * 3) / 2;
  const height = EDGE_LEN * Math.sqrt(3);
  const edges_num = 6;

  game_board.style.width = `${cols * width + EDGE_LEN * 1 + 2 * EDGE_MARGIN}px`;
  game_board.style.height = `${rows * height + EDGE_LEN + 2 * EDGE_MARGIN}px`;
  for (let i = 0; i < cols; i++) {
    blocks.push([]);
    const offset = (i % 2) * (height / 2);
    for (let j = 0; j < rows; j++) {
      const y = j * height + height / 2 + offset + EDGE_MARGIN;
      const x = i * width + width / 2 + EDGE_LEN / 2;
      const block = new Block({
        x,
        y,
        edges_num,
        parent: game_board,
      });
      block.add_potential_neighbors(blocks.flat());
      blocks[i].push(block);
    }
  }
}

function triangle_game_board(game_board) {
  let blocks = [];
  const rows = 12;
  const cols = 12;
  const width = EDGE_LEN / 2; // 三角形的边长
  const height = (EDGE_LEN * Math.sqrt(3)) / 2; // 三角形的高度
  const edges_num = 3;

  game_board.style.width = `${cols * width + EDGE_LEN * 1 + 2 * EDGE_MARGIN}px`;
  game_board.style.height = `${rows * height + EDGE_LEN + 2 * EDGE_MARGIN}px`;
  for (let i = 0; i < cols; i++) {
    blocks.push([]);
    const offset_angle = (i % 2) * Math.Pi;
    for (let j = 0; j < rows; j++) {
      const y = j * height + height / 2  + EDGE_MARGIN;
      const x = i * width + width / 2 + EDGE_LEN / 2;
      const block = new Block({
        x,
        y,
        edges_num,
        parent: game_board,
        init_angle: offset_angle, // 旋转角度
      });
      block.add_potential_neighbors(blocks.flat());
      blocks[i].push(block);
    }
  }
}

function approx(a, b, tolerance = 0.01) {
  return Math.abs(a - b) < tolerance;
}
function approx2d(p1, p2, tolerance = 0.01) {
  return approx(p1.x, p2.x, tolerance) && approx(p1.y, p2.y, tolerance);
}


// 游戏重置函数
function resetGame() {
  now_player = 1; // 当前玩家编号
  player_allow_click_blank = Array(player_num + 1).fill(true); // 是否允许点击空白处
  change_background_color(CAMPS_COLORS[now_player] + "88");

  const game_board = document.getElementById("game-board");
  clearContainer(game_board);
  switch (map_type) {
    case "square":
      square_game_board(game_board);
      break;
    case "hexgon":
      hex_game_board(game_board);
      break;
    case "triangle":
      triangle_game_board(game_board);
      break;
    case "random":
      console.log("暂不支持随机地图。");
      break;
    default:
      console.warn("未知地图类型，使用默认方形地图。");
      square_game_board(game_board);
      break;
  }
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

  // 保存设置按钮点击事件
  saveSettingsButton.addEventListener("click", () => {
    player_num = Number(playerCountSelect.value);
    EDGE_LEN = Number(edgeLenSlider.value);
    map_type = gameMapSelect.value;

    settingsModal.style.display = "none"; // 保存后关闭模态框
    resetGame();
  });

  resetGame();
});

