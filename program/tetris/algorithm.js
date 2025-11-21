// 算法相关
var algorithmActive = false;
var algorithmMovePending = false;

const algorithmMoveDelay = 50; // AI移动延迟时间（毫秒）
const algorithmRotateDelay = algorithmMoveDelay; // AI旋转延迟时间（毫秒）

// 对称性信息, 和方块定义顺序相同, 旋转群大小
const symmetryInfo = [null, 2, 4, 4, 1, 2, 4, 2];

class TetrisAlgorithm {
  constructor(game) {
    this.game = game;
    this.weights = {
      contacts: 10, // 接触面权重
      clearedLines: 85, // 消除行权重
      holes: 8, // 空隙权重
      height: 7, // 高度权重
    };
  }

  // 评估游戏板状态
  evaluateHoles(board) {
    let holes = 0;

    // 计算空隙
    for (let x = 0; x < board[0].length; x++) {
      var columnHasBlock = false;
      for (let y = 0; y < board.length; y++) {
        if (board[y][x] !== 0) {
          columnHasBlock = true;
        } else if (columnHasBlock) {
          holes++;
        }
      }
    }

    return holes;
  }

  // 评估块高度， 0 是最高点
  evaluateHeight(piece) {
    return (
      piece.matrix
        .map((r, i) => r.reduce((a, b) => a + b) * i)
        .reduce((a, b) => a + b) /
        4.0 +
      piece.pos.y
    );
  }

  evaluateContacts(board, piece) {
    return piece.matrix
      .map((row, y) =>
        row
          .map((cell, x) => {
            let gx = piece.pos.x + x;
            let gy = piece.pos.y + y;
            if (
              cell !== 0 &&
              gy >= 0 &&
              gy < board.length &&
              gx >= 0 &&
              gx < board[0].length
            ) {
              let contacts = 0;
              // 检查上方
              if (gy > 0 && board[gy - 1][gx] !== 0) contacts++;
              // 检查下方
              if (gy === board.length - 1) contacts += 2;
              else if (board[gy + 1][gx] !== 0) contacts++;
              // 检查左方
              if (gx === 0 || board[gy][gx - 1] !== 0) contacts++;
              // 检查右方
              if (gx === board[0].length - 1 || board[gy][gx + 1] !== 0)
                contacts++;
              return contacts;
            }
            return 0;
          })
          .reduce((a, b) => a + b, 0),
      )
      .reduce((a, b) => a + b, 0);
  }

  // 模拟方块下落
  // 两个JSON参数用于预先序列化，减小循环开销，应该可以不传递
  simulateDrop(
    board,
    piece,
    x,
    rotation,
    boardJSON = JSON.stringify(board),
    pieceMatrixJSON = JSON.stringify(piece.matrix),
  ) {
    // 创建游戏板副本
    const testBoard = JSON.parse(boardJSON);
    // const testBoard = structuredClone(board);
    const testPiece = {
      matrix: JSON.parse(pieceMatrixJSON),
      pos: { x, y: 0 },
    };

    // 应用旋转
    for (let i = 0; i < rotation; i++) {
      this.rotateMatrix(testPiece.matrix, 1);
    }

    // 下落到底部
    while (!this.collide(testBoard, testPiece)) {
      testPiece.pos.y++;
    }
    testPiece.pos.y--;

    const avgHeight = this.evaluateHeight(testPiece);
    const contacts = this.evaluateContacts(testBoard, testPiece);

    // 合并到游戏板
    this.merge(testBoard, testPiece);

    // 消除完整的行
    const clearedLines = this.clearLines(testBoard);
    const holes = this.evaluateHoles(testBoard);

    return {
      board: testBoard,
      clearedLines,
      evaluation: {
        contacts,
        holes,
        avgHeight,
      },
    };
  }

  // 旋转矩阵
  rotateMatrix(matrix, dir) {
    const n = matrix.length;
    // 转置矩阵
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        [matrix[i][j], matrix[j][i]] = [matrix[j][i], matrix[i][j]];
      }
    }

    // 水平翻转
    if (dir > 0) {
      for (let i = 0; i < n; i++) {
        matrix[i].reverse();
      }
    } else {
      matrix.reverse();
    }
  }

  // 碰撞检测
  collide(board, player) {
    const matrix = player.matrix;
    const pos = player.pos;

    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (matrix[y][x] !== 0) {
          const boardY = y + pos.y;
          const boardX = x + pos.x;

          // 添加边界检查
          if (
            boardY < 0 ||
            boardY >= board.length ||
            boardX < 0 ||
            boardX >= board[0].length ||
            board[boardY][boardX] !== 0
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // 合并方块
  merge(board, player) {
    const matrix = player.matrix;
    const pos = player.pos;

    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (matrix[y][x] !== 0) {
          const boardY = y + pos.y;
          const boardX = x + pos.x;

          // 添加边界检查
          if (
            boardY >= 0 &&
            boardY < board.length &&
            boardX >= 0 &&
            boardX < board[0].length
          ) {
            board[boardY][boardX] = matrix[y][x];
          }
        }
      }
    }
  }

  // 消除行
  clearLines(board) {
    let linesCleared = 0;

    for (let y = board.length - 1; y >= 0; y--) {
      const isRowFull = board[y].every((value) => value !== 0);

      if (isRowFull) {
        board.splice(y, 1);
        board.unshift(Array(board[0].length).fill(0));
        linesCleared++;
        y++; // 重新检查当前行
      }
    }
    return linesCleared;
  }

  // 计算损失值
  calculateLoss(evaluation, clearedLines) {
    // 损失 = -接触面权重*接触面 - 消除行权重*消除行数 + 空隙权重*空隙数 - 高度权重*平均高度
    // 越低越好
    return (
      -this.weights.contacts * evaluation.contacts -
      this.weights.clearedLines * clearedLines +
      this.weights.holes * evaluation.holes -
      this.weights.height * evaluation.avgHeight
    );
  }

  // 寻找最佳移动
  findBestMove() {
    const board = this.game.board;
    const currentPiece = this.game.player;
    const nextPiece = this.game.nextPiece;

    let bestLoss = Infinity;
    let bestMove = null;
    let bestClearedLines = 0;

    // 尝试所有可能的旋转和位置
    const boardJSON = JSON.stringify(board);
    const pieceMatrixJSON = JSON.stringify(currentPiece.matrix);
    for (
      let rotation = 0;
      rotation < symmetryInfo[currentPiece.type];
      rotation++
    ) {
      // 从-1 开始，否则会跳过左侧边界，因为块定义时可能有一个偏移
      for (let x = -1; x <= board[0].length; x++) {
        // 模拟当前方块下落
        const result = this.simulateDrop(
          board,
          currentPiece,
          x,
          rotation,
          boardJSON,
          pieceMatrixJSON,
        );

        const loss = this.calculateLoss(result.evaluation, result.clearedLines);
        // 模拟已知的下一个方块下落
        const boardJSON2 = JSON.stringify(result.board);
        const pieceMatrixJSON2 = JSON.stringify(nextPiece.matrix);
        for (
          let rotation2 = 0;
          rotation2 < symmetryInfo[nextPiece.type];
          rotation2++
        ) {
          for (let x2 = -1; x2 <= board[0].length; x2++) {
            const result2 = this.simulateDrop(
              result.board,
              nextPiece,
              x2,
              rotation2,
              boardJSON2,
              pieceMatrixJSON2,
            );

            // 计算损失
            const loss2 = this.calculateLoss(
              result2.evaluation,
              result2.clearedLines,
            );

            // 更新最佳移动
            if (loss + loss2 < bestLoss) {
              bestLoss = loss + loss2;
              bestMove = { x, rotation };
              bestClearedLines = result.clearedLines;
            }
          }
        }
      }
    }

    return {
      move: bestMove,
      loss: bestLoss,
      clearedLines: bestClearedLines,
    };
  }

  // 比较接下来出现的不同类型的方块的优劣
  // 需要在玩家放下方块，更新地图后，但是还没有将下一个方块放下时调用
  // 先把下一个方块按最好情况放下，然后再评估接下来出不同方块的效果
  // 调用时board, nextPiece, x, rotation 都是当前玩家的状态
  // player 就没有用了
  rankDifferentTypes() {
    this.game.player = this.game.nextPiece;
    const bestMove = this.findBestMove();
    const result = this.simulateDrop(
      this.game.board,
      this.game.nextPiece,
      bestMove.move.x,
      bestMove.move.rotation,
    );
    const resultBoardJSON = JSON.stringify(result.board);
    var lossByType = Array(SHAPES.length).fill(Infinity);
    for (let i = 1; i < SHAPES.length; i++) {
      let piece = {
        matrix: SHAPES[i],
        type: i,
      };
      // 遍历所有位置
      for (
        let rotation = 0;
        rotation < symmetryInfo[piece.type];
        rotation++
      ) {
        for (let x = -1; x <= result.board[0].length; x++) {
          const result2 = this.simulateDrop(
            result.board,
            piece,
            x,
            rotation,
            resultBoardJSON,
          );

          const loss = this.calculateLoss(
            result2.evaluation,
            result2.clearedLines,
          );

          if (loss < lossByType[i]) {
            lossByType[i] = loss;
          }
        }
      }
    }
    return lossByType;
  }

  getWorstType() {
    const arr = this.rankDifferentTypes();
    let minIndex = 1;
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] > arr[minIndex]) {
        minIndex = i;
      }
    }
    return minIndex;
  }
  getBestType() {
    const arr = this.rankDifferentTypes();
    let minIndex = 1;
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] < arr[minIndex]) {
        minIndex = i;
      }
    }
    return minIndex;
  }
}

// 执行算法移动
function executeAlgorithmMove(
  board,
  player,
  nextPiece,
  playerRotate,
  playerHardDrop,
  playerMove,
) {
  if (!algorithmActive || algorithmMovePending) return;

  algorithmMovePending = true;

  setTimeout(async () => {
    let ai = new TetrisAlgorithm({
      board,
      player,
      nextPiece,
    });

    const bestMove = ai.findBestMove();
    //console.log("最佳移动:", bestMove.move.x);

    if (bestMove && bestMove.move) {
      // 应用旋转
      // const currentRotation = 0;
      for (let i = 0; i < bestMove.move.rotation; i++) {
        playerRotate(1);
        await delay(algorithmRotateDelay);
      }

      // 应用水平移动
      // player.pos.x = bestMove.move.x;
      var moveX = bestMove.move.x - player.pos.x;
      var times = 0;
      while (times < 10 && bestMove.move.x !== player.pos.x) {
        if (moveX > 0) {
          playerMove(1); // 向右移动
        } else if (moveX < 0) {
          playerMove(-1); // 向左移动
        }
        await delay(algorithmMoveDelay);
        moveX = bestMove.move.x - player.pos.x; // 更新水平移动量
        times++;
      }
      if (player.pos.x !== bestMove.move.x) {
        //player.pos.x = bestMove.move.x;
        console.warn("AI移动失败，位置不匹配:", player.pos.x, bestMove.move.x);
      }

      // 立即下落
      await playerHardDrop();

      // 更新AI状态
      // aiStatusText.textContent = `已执行 (损失: ${bestMove.loss.toFixed(2)})`;
    }
    algorithmMovePending = false;
  }, 100);
}
