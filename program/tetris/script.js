// 游戏常量
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
  null,
  "#FF5252", // I
  "#448AFF", // J
  "#69F0AE", // L
  "#FFD740", // O
  "#FF4081", // S
  "#7C4DFF", // T
  "#18FFFF", // Z
  // "#FF9AA2",
  // "#FFB7B2",
  // "#FFDAC1",
  // "#E2F0CB",
  // "#B5EAD7",
  // "#C7CEEA",
  // "#F8C8DC"
];

// 方块形状定义
const SHAPES = [
  [],
  [
    [ 0, 0, 0, 0 ],
    [ 1, 1, 1, 1 ],
    [ 0, 0, 0, 0 ],
    [ 0, 0, 0, 0 ],
  ], // I
  [
    [ 0, 0, 0 ],
    [ 1, 1, 1 ],
    [ 0, 0, 1 ],
  ], // J
  [
    [ 0, 0, 0 ],
    [ 1, 1, 1 ],
    [ 1, 0, 0 ],
  ], // L
  [
    [ 0, 0, 0, 0 ],
    [ 0, 1, 1, 0 ],
    [ 0, 1, 1, 0 ],
    [ 0, 0, 0, 0 ],
  ], // O
  [
    [ 0, 0, 0 ],
    [ 0, 1, 1 ],
    [ 1, 1, 0 ],
  ], // S
  [
    [ 0, 0, 0 ],
    [ 1, 1, 1 ],
    [ 0, 1, 0 ],
  ], // T
  [
    [ 0, 0, 0 ],
    [ 1, 1, 0 ],
    [ 0, 1, 1 ],
  ], // Z
];

const INITAL_POS = () =>
    JSON.parse(JSON.stringify({x : Math.floor(COLS / 2) - 2, y : 0}));

// 难度级别，-1 ~ 1
var difficulty = 0;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

document.addEventListener("DOMContentLoaded", () => {
  // 获取Canvas元素和上下文
  const container = document.getElementById("game-board");
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");

  const playerCanvas = document.getElementById("player-canvas");
  const playerCtx = playerCanvas.getContext("2d");

  const nextCanvas = document.getElementById("next-piece-canvas");
  const nextCtx = nextCanvas.getContext("2d");

  // 游戏状态元素
  const scoreElement = document.getElementById("score");
  const levelElement = document.getElementById("level");
  const overlay = document.getElementById("game-overlay");
  const startButton = document.getElementById("start-btn");

  // 控制按钮
  const leftBtn = document.getElementById("left-btn");
  const rightBtn = document.getElementById("right-btn");
  const rotateBtn = document.getElementById("rotate-btn");
  const downBtn = document.getElementById("down-btn");
  const dropBtn = document.getElementById("drop-btn");
  const pauseBtn = document.getElementById("pause-btn");

  // 游戏状态变量
  var board = createBoard();
  var score = 0;
  var level = 1;
  var lines = 0;
  var gameOver = true;
  var paused = true;
  var dropCounter = 0;
  var dropInterval = 800;
  var lastTime = 0;
  var needResetPlayer = false; // 是否需要重置玩家位置

  // 当前方块
  let player = {
    pos : INITAL_POS(),
    matrix : null,
    type : 0,
  };

  // 下一个方块
  let nextPiece = {
    matrix : null,
    type : 0,
  };

  // 创建游戏板
  function createBoard() {
    const board = [];
    for (let y = 0; y < ROWS; y++) {
      board.push(Array(COLS).fill(0));
    }
    return board;
  }

  // 创建方块
  function createPiece(type) {
    if (type === "next") {
      var pieceType = Math.floor(Math.random() * 7) + 1;
      // 使用算法,根据难度来决定下一个方块的类型
      if (nextPiece.matrix) {
        if (difficulty > 0.01) {
          if (Math.random() < difficulty) {
            pieceType = (() => {
              let ai = new TetrisAlgorithm({
                board,
                player,
                nextPiece,
              });
              return ai.getWorstType();
            })();
          }
        } else if (difficulty < -0.01) {
          if (Math.random() < -difficulty) {
            pieceType = (() => {
              let ai = new TetrisAlgorithm({
                board,
                player,
                nextPiece,
              });
              return ai.getBestType();
            })();
          }
        }
      }
      return {
        matrix : SHAPES[pieceType],
        type : pieceType,
      };
    } else {
      if (!nextPiece.matrix) {
        nextPiece = createPiece("next");
      }

      const piece = {
        pos : INITAL_POS(),
        matrix : nextPiece.matrix,
        type : nextPiece.type,
      };

      nextPiece = createPiece("next");
      drawNextPiece();
      return piece;
    }
  }

  // 绘制下一个方块预览 - 居中显示
  function drawNextPiece() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (!nextPiece.matrix)
      return;

    nextPiece.matrix.forEach((row, y) => {
      row.forEach(
          (value, x) => drawABlock(x, y, value ? nextPiece.type : 0, nextCtx),
      );
    });
  }

  function movePlayerAnimation(duration = 100, pos = player.pos) {
    if (duration <= 0)
      playerCanvas.style.transition = "none";
    else
      playerCanvas.style.transition = `all ${duration}ms ease`;
    playerCanvas.style.transform =
        `translate(${pos.x * BLOCK_SIZE}px, ${pos.y * BLOCK_SIZE}px)`;
  }

  // 绘制单个方块的函数
  function drawABlock(x, y, type, ctx) {
    if (type !== 0) {
      ctx.fillStyle = COLORS[type];
      ctx.fillRect(
          x * BLOCK_SIZE,
          y * BLOCK_SIZE,
          BLOCK_SIZE - 1,
          BLOCK_SIZE - 1,
      );

      // 添加方块内高光效果
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, 5);
      ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, 5, BLOCK_SIZE - 1);

      ctx.fillStyle = COLORS[type];

      // 添加方块阴影效果
      ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
      ctx.fillRect(
          x * BLOCK_SIZE + BLOCK_SIZE - 5,
          y * BLOCK_SIZE,
          5,
          BLOCK_SIZE - 1,
      );
      ctx.fillRect(
          x * BLOCK_SIZE,
          y * BLOCK_SIZE + BLOCK_SIZE - 5,
          BLOCK_SIZE - 1,
          5,
      );

      ctx.fillStyle = COLORS[type];
    }
  }

  // 绘制玩家
  function drawPlayer() {
    playerCtx.clearRect(0, 0, playerCanvas.width, playerCanvas.height);
    if (player.matrix) {
      player.matrix.forEach((row, y) => {
        row.forEach(
            (value, x) => drawABlock(x, y, value ? player.type : 0, playerCtx),
        );
      });
    }
  }

  // 绘制游戏板
  function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制背景
    ctx.fillStyle = "rgba(255, 255, 255, 1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制已落下的方块
    board.forEach(
        (row,
         y) => { row.forEach((value, x) => drawABlock(x, y, value, ctx)); });
  }

  // 碰撞检测
  function collide(board, player) {
    const [m, o] = [ player.matrix, player.pos ];
    for (let y = 0; y < m.length; ++y) {
      for (let x = 0; x < m[y].length; ++x) {
        if (m[y][x] !== 0 &&
            (board[y + o.y] && board[y + o.y][x + o.x]) !== 0) {
          return true;
        }
      }
    }
    return false;
  }

  // 旋转矩阵
  function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
      for (let x = 0; x < y; ++x) {
        [matrix[x][y], matrix[y][x]] = [ matrix[y][x], matrix[x][y] ];
      }
    }

    if (dir > 0) {
      matrix.forEach((row) => row.reverse());
    } else {
      matrix.reverse();
    }
    drawPlayer();
  }

  // 玩家旋转
  function playerRotate(dir) {
    if (gameOver || paused)
      return;

    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);

    while (collide(board, player)) {
      player.pos.x += offset;
      offset = -(offset + (offset > 0 ? 1 : -1));
      if (offset > player.matrix[0].length) {
        rotate(player.matrix, -dir);
        player.pos.x = pos;
        return;
      }
    }
  }

  // 玩家移动
  function playerMove(dir) {
    if (gameOver || paused)
      return;

    player.pos.x += dir;
    if (collide(board, player)) {
      player.pos.x -= dir;
    }
  }

  // 结算游戏板（例如清除行）
  function settleBoard() {}

  // 玩家下落
  // 返回true表示方块已碰撞
  async function playerDrop(waitAnimation = false) {
    if (gameOver || paused)
      return;

    player.pos.y++;
    dropCounter = 0;
    if (collide(board, player)) {
      player.pos.y--;
      if (waitAnimation) {
        await delay(100); // 确保动画完成
      }
      merge();
      needResetPlayer = true;
      reset();
      movePlayerAnimation(0, INITAL_POS());
      clearLines();
      updateScore();
      drawPlayer();
      drawBoard();
      return true;
    }
    return false;
  }

  // 玩家硬下落（直接落到底部）
  async function playerHardDrop() {
    if (gameOver || paused)
      return;

    while (!(await playerDrop(true))) {
      // 直接下落到底部
    }
    return true;
  }

  // 合并方块到游戏板
  function merge() {
    player.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          // 检查边界，如果超出边界那游戏已经输了
          if (y + player.pos.y < 0)
            gameOverHandler();
          else
            board[y + player.pos.y][x + player.pos.x] = player.type;
        }
      });
    });
  }

  // 触发游戏结束
  function gameOverHandler() {
    gameOver = true;
    paused = true;
    overlay.classList.remove("hidden");
    overlay.querySelector(".overlay-title").textContent = "游戏结束";
    overlay.querySelector(".overlay-text").innerHTML =
        `最终得分: <strong>${score}</strong>`;
    startButton.textContent = "重新开始";
  }

  // 重置玩家位置和方块
  function reset() {
    player = createPiece();

    // 检查游戏是否结束
    if (collide(board, player))
      gameOverHandler();
  }

  // 消除完整的行
  function clearLines() {
    let linesCleared = 0;

    outer: for (let y = ROWS - 1; y >= 0; y--) {
      for (let x = 0; x < COLS; x++) {
        if (board[y][x] === 0) {
          continue outer;
        }
      }

      // 移除该行并添加新的空行在顶部
      const row = board.splice(y, 1)[0].fill(0);
      board.unshift(row);
      linesCleared++;
      clearAnimation(y); // 清除行动画效果

      y++; // 重新检查当前行
    }

    if (linesCleared > 0) {
      // 更新分数
      lines += linesCleared;
      score += [ 40, 100, 300, 1200 ][linesCleared - 1] * level;

      // 每清除10行升一级
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, (3 / (level + 2)) * 700 + 100);

      // 更新UI
      scoreElement.textContent = score;
      levelElement.textContent = level;
    }
  }

  // 更新分数显示
  function updateScore() {
    scoreElement.textContent = score;
    levelElement.textContent = level;
  }

  // 游戏主循环
  function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;

    if (!paused && !gameOver) {
      dropCounter += deltaTime;
      if (dropCounter > dropInterval) {
        playerDrop();
      }
    }

    if (needResetPlayer) {
      needResetPlayer = false;
      movePlayerAnimation(0, INITAL_POS());
    } else {
      movePlayerAnimation();
    }

    // drawBoard();
    if (!gameOver) {
      requestAnimationFrame(update);

      if (algorithmActive && !paused) {
        executeAlgorithmMove(
            board,
            player,
            nextPiece,
            playerRotate,
            playerHardDrop,
            playerMove,
        );
      }
    }
  }

  // 初始化游戏
  function init() {
    board = createBoard();
    drawBoard();
    score = 0;
    level = 1;
    lines = 0;
    dropInterval = 800;

    updateScore();
    player = createPiece();
    // 绘制玩家
    drawPlayer();
    // 绘制下一个方块
    drawNextPiece();

    gameOver = false;
    paused = false;
    overlay.classList.add("hidden");
  }

  // 暂停/继续游戏
  function togglePause() {
    if (gameOver)
      return;

    paused = !paused;
    pauseBtn.innerHTML = paused ? '<span class="control-emoji">▶️</span>'
                                : '<span class="control-emoji">⏸️</span>';

    if (!paused && !gameOver) {
      lastTime = performance.now();
      update();
    }
  }

  function clearAnimation(y) {
    // 创建canvas元素
    const ca = document.createElement("canvas");
    ca.style.zIndex = "20"; // 确保在最上层
    ca.width = canvas.width;
    ca.height = canvas.height;
    ca.style.position = "absolute";
    ca.style.top = "0";
    ca.style.left = "0";
    ca.style.pointerEvents = "none"; // 防止ca阻挡点击事件

    // 将ca添加到容器中
    container.appendChild(ca);

    const ctx = ca.getContext("2d");

    // 绘制初始状态（覆盖整个容器）
    ctx.fillStyle = "white";
    // ctx.fillRect(0, 0, ca.width, ca.height);

    // 动画参数
    const stripeWidth = BLOCK_SIZE; // 条状宽度
    let progress = 0;               // 动画进度
    const animationDuration = 500;  // 动画持续时间（毫秒）
    const startTime = performance.now();

    // 动画函数
    function animate(currentTime) {
      const elapsedTime = currentTime - startTime;
      progress = Math.min(elapsedTime / animationDuration, 1);

      // 清除ca
      ctx.clearRect(0, 0, ca.width, ca.height);

      ctx.fillStyle = "#5e35b144"; // 使用纯色填充
      ctx.fillRect(0, (y + progress) * BLOCK_SIZE, ca.width,
                   stripeWidth * (1 - progress));

      // 如果动画未完成，继续
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // 动画完成后移除ca
        setTimeout(() => { container.removeChild(ca); }, animationDuration);
      }
    }

    // 启动动画
    requestAnimationFrame(animate);
  }

  // 事件监听 - 阻止方向键滚动页面
  document.addEventListener("keydown", (event) => {
    if ([ "ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " " ].includes(
            event.key,
            )) {
      event.preventDefault();
    }

    if (gameOver && event.key === " ") {
      init();
      return;
    }

    switch (event.key) {
    case "ArrowLeft":
    case "a":
    case "A":
    case "h":
      playerMove(-1);
      break;
    case "ArrowRight":
    case "d":
    case "D":
    case "l":
      playerMove(1);
      break;
    case "ArrowDown":
    case "s":
    case "S":
    case "j":
      playerDrop();
      break;
    case "ArrowUp":
    case "w":
    case "W":
    case "k":
      playerRotate(1);
      break;
    case " ":
      playerHardDrop();
      break;
    case "p":
    case "P":
      togglePause();
      break;
    }
  });

  // 按钮事件
  startButton.addEventListener("click", () => {
    init();
    lastTime = performance.now();
    update();
  });

  leftBtn.addEventListener("click", () => playerMove(-1));
  rightBtn.addEventListener("click", () => playerMove(1));
  rotateBtn.addEventListener("click", () => playerRotate(1));
  downBtn.addEventListener("click", () => playerDrop());
  dropBtn.addEventListener("click", () => playerHardDrop());
  pauseBtn.addEventListener("click", togglePause);

  // 初始化UI
  // init(true);
  drawBoard();
  drawNextPiece();
});

// 监听可见性变化
// 如果页面不可见，暂停
// 没有用，为什么？
// document.addEventListener("visibilitychange", () => {
//   if (document.visibilityState === "hidden") {
//     if (!paused) {
//       togglePause();
//     }
//   }
// });
