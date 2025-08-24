class Game {
  constructor(updateDropInterval, soundEffect) {
    this.updateDropInterval = updateDropInterval;
    this.soundEffect = soundEffect;

    this.colorBedrock = "#BDBDBD"; // 基岩颜色
    this.colors = [
      "#FF9800",
      "#4CAF50",
      "#2196F3",
      "#9C27B0",
      "#00BCD4",
      "#FF5252",
      "#448AFF",
      "#69F0AE",
      "#FFD740",
      "#FF4081",
      "#7C4DFF",
      "#18FFFF",
    ];
    this.dropHeight = 30;                      // 掉落高度
    this.baseDropInterval = 1250;              // 基础掉落间隔时间(ms)
    this.dropInterval = this.baseDropInterval; // 实际掉落间隔时间(ms)
    this.score = 0;                            // 玩家得分
    this.gameOver = false;                     // 游戏是否结束

    // 三倍大小的旋转矩阵,应用完要除以3
    // 第一个元素是向左转
    // 第二个元素是向右转
    this.rotateMatrix = [
      [ [ 2, -1, 2 ], [ 2, 2, -1 ], [ -1, 2, 2 ] ],
      [ [ 2, 2, -1 ], [ -1, 2, 2 ], [ 2, -1, 2 ] ],
    ];
    // 六边形的6个方向
    this.directions = [
      [ 1, 0, -1 ], [ 1, -1, 0 ], [ 0, -1, 1 ], [ -1, 0, 1 ], [ -1, 1, 0 ],
      [ 0, 1, -1 ]
    ];
    // 计算掉落方向往右旋转后的符号，
    // { index: 0/1/2, value: -1/1}
    this.directionsSign = this.directions.map(dir => {
      const v = Vector.add(this.#directionRotate(dir, 1),
                           this.#directionRotate(dir, 2))
      const i = v.findIndex(x => Math.abs(x) == 2);
      return {index : i, value : v[i] / 2};
    });

    /*
     * id: 全局唯一id
     * color: 方块颜色
     * pos: 方块位置 [x, y, z]
     * player:
     *   0: 已经放置的方块，
     *   1, 2: 玩家六边形，2是主六边形(用于旋转)
     *   -1, -2：下一个六边形，-2是主六边形
     */
    this.data = [];
    // 初始中心块
    this.data.push({
      id : getGlobalId(),
      color : this.colorBedrock,
      pos : [ 0, 0, 0 ],
      player : 0
    });
    this.directions.map(dir => this.data.push({
      id : getGlobalId(),
      color : this.colorBedrock,
      pos : Vector.add([ 0, 0, 0 ], dir),
      player : 0
    }));
    this.#classifyData();

    // 左右位移时偏上还是偏下，轮流
    this.parity = false;
    // 当前掉落方向
    this.nowDropDirectionIndex = 0;
    // 下一个掉落方向
    this.nextDropDirectionIndex = 0;

    // 当前有效边界，需要在添加新六边形时更新
    this.nowValidEdges = this.#validEdges();

    this.#addNewHexs(); // 添加初始六边形
    this.#addNewHexs(); // 添加未来的六边形
  }
  // 分类数据到 this.dataPlayer, this.dataNext, this.dataMap
  #classifyData() {
    this.dataPlayer = []; // 玩家六边形
    this.dataNext = [];   // 下一个六边形
    this.dataMap = [];    // 已经放置的六边形
    for (let d of this.data) {
      if (d.player > 0)
        this.dataPlayer.push(d);
      else if (d.player < 0)
        this.dataNext.push(d);
      else
        this.dataMap.push(d);
    }
  }

  /*
   * 返回一个array
   * [
   *   [[a,b,c],[d,e,f],[g,h,l]],
   *   [[.,.,.],[.,.,.],[.,.,.]],
   *   [[.,.,.],[.,.,.],[.,.,.]]
   * ]
   * 表示在array[x][y][z] 方向上可以偏移的格子数以及对应的块id的字典
   * {min, max, minId, maxId}
   * 索引要加一，即
   * 0 -> x/y/z=-1
   * 1 -> x/y/z=0
   * 2 -> x/y/z=1
   * 这个函数不好用，建议使用封装的 getValidEdges() 函数
   */
  #validEdges(data = this.dataMap) {
    let r = Array(3).fill().map(
        () => Array(3).fill().map(
            () => Array(3).fill().map(
                () => (
                    {min : Infinity, minId : 0, max : -Infinity, maxId : 0}))));
    for (let d of data) {
      for (let dir of this.directions) {
        const ind = dir.map(j => j + 1);
        const i0 = ind.findIndex(x => x == 1);
        const rr = ind.reduce((a, b) => a[b], r);
        if (d.pos[i0] > rr.max) {
          rr.max = d.pos[i0];
          rr.maxId = d.id;
        }
        if (d.pos[i0] < rr.min) {
          rr.min = d.pos[i0];
          rr.minId = d.id;
        }
      }
    }
    return r;
  }

  // 通过 direction 获取有效边界
  // dir: [x, y, z] 方向向量
  // validEdges: 可选参数，默认为当前网格的有效边界
  // 返回该方向上的有效边界 { min, max }
  // 注意this.nowValidEdges 需要在this.data变化时更新
  #getValidEdge(dir, e = this.nowValidEdges) {
    return e[dir[0] + 1][dir[1] + 1][dir[2] + 1];
  }

  // 返回一个新的六边形组合
  // 如果next为true，则返回下一个六边形组合
  // 否则返回当前六边形组合
  #getNewHexs(next = false) {
    const directions = this.directions;
    let player = next ? -1 : 1; // 下一个六边形的玩家标识
    let color = randomValFromArray(this.colors) + (next ? "08" : "");
    let newData = [
      {id : getGlobalId(), color : color, pos : [ 0, 0, 0 ], player : player}
    ];
    for (let i = 1; i < 6; i++) {
      let baseHex, dir, newPos;
      do {
        baseHex = newData[Math.floor(Math.random() * i)];
        // baseHex = newData[Math.floor(i - 1)];
        dir = directions[Math.floor(Math.random() * directions.length)];
        newPos = Vector.add(baseHex.pos, dir);
      } while (newData.map(d => d.pos).some(arrayValEqual(newPos)));
      newData.push(
          {id : getGlobalId(), color : color, pos : newPos, player : player});
    }

    let c = Vector.divide(
        newData.reduce((a, b) => Vector.add(a, b.pos), [ 0, 0, 0 ]),
        newData.length);
    let dist = newData.map(d => Vector.subtract(d.pos, c)
                                    .map(x => x * x)
                                    .reduce((a, b) => a + b, 0));
    let minDist = Math.min(...dist);
    newData[dist.findIndex(x => x == minDist)].player *= 2; // 设置主六边形
    return newData;
  }

  // 添加新的六边形到网格中
  // 添加成功返回true，添加失败（位置冲突）返回false
  // 返回false时表示游戏失败
  #addNewHexs(
      dropHeight = this.dropHeight,
  ) {
    // 将下一个六边形变为现在的六边形
    for (let d of this.dataNext) {
      d.player *= -1;
      d.color = d.color.slice(0, -2); // 去掉透明度
    }
    this.#classifyData();
    this.nowDropDirectionIndex = this.nextDropDirectionIndex;
    // 生成新的六边形组合
    let rn = 0;
    do
      rn = Math.floor(Math.random() * this.directions.length);
    while (rn == this.nowDropDirectionIndex);
    this.nextDropDirectionIndex = rn;
    const dir = this.directions[this.nextDropDirectionIndex];
    const e = this.#getValidEdge(dir);
    let w = Math.floor(Math.random() * (e.max - e.min) + e.min);
    w = w > 0 ? w - 1 : w + 1; // 收缩范围
    const p =
        this.directionsSign[this.nextDropDirectionIndex].value == 1 ? 1 : 4;
    const pos = Vector.add(
        Vector.times(dir, -dropHeight / 2),
        Vector.add(
            Vector.times(
                Math.floor(w / 2),
                this.directions[(this.nextDropDirectionIndex + p) % 6]),
            Vector.times(
                Math.ceil(w / 2),
                this.directions[(this.nextDropDirectionIndex + p + 1) % 6])));

    const newHexs = this.#getNewHexs(true);
    for (let h of newHexs) {
      h.pos = Vector.add(pos, h.pos);
      // 如果新位置已经有六边形，则不添加，游戏失败
      if (this.dataMap.map(d => d.pos).some(arrayValEqual(h.pos)))
        return false;
      this.data.push(h);
    }
    this.#classifyData();
    return true;
  }
  // 每个回合结束时需要执行的操作
  #endTurnUpdate() {
    for (let d of this.data)
      if (d.player > 0)
        d.player = 0;
    this.#classifyData();
    let score = 0;
    // 消除环
    score += this.#eliminateRing();
    // 消除大坨方块
    score += this.#eliminateBlocks();
    this.#classifyData();
    if (score > 0) {
      this.score += score;
      document.getElementById("score").textContent = this.score;
      // 减小掉落间隔
      // this.updateDropInterval(
      //     (this.baseDropInterval - 500) / Math.max(1, score / 30) + 500);
      this.updateDropInterval(
          Math.max(this.baseDropInterval - 3 * this.score, 300));
      // 播放消除音效
      this.soundEffect.playVanishSound();
    }

    // 更新有效边界
    this.nowValidEdges = this.#validEdges();
    // 生成新的六边形
    // 如果添加新六边形失败，则游戏结束
    if (!this.#addNewHexs()) {
      this.gameOver = true;
    }
    if (this.gameOver) {
      this.soundEffect.stopBGM();
      document.getElementById("is-game-over").style.visibility = "visible";
    }

    return true;
  }
  /*
   * 往指定方向掉落玩家的六边形
   * direction: [x, y, z] 方向向量
   * 带有防止掉落到已有六边形上的逻辑
   * 如果有方块更新，返回true，否则返回false
   * endTurn: 是否结束当前回合
   * 如果endTurn为true，则会清除玩家的六边形，并生成新的
   */
  playerDrop(direction = this.directions[this.nowDropDirectionIndex],
             endTurn = true) {
    if (this.gameOver)
      return false; // 游戏结束了，不能再操作
    const poses = this.dataMap.map(v => v.pos);
    for (let d of this.dataPlayer) {
      if (poses.some(arrayValEqual(Vector.add(d.pos, direction)))) {
        // 掉落失败，不能移动到已有六边形上
        // 已经落地了，不能再操作
        if (endTurn)
          return this.#endTurnUpdate(); // 添加了新方块
        return false;
      }
    }

    // 如果所有六边形都可以掉落到新位置，则更新位置
    for (let d of this.dataPlayer)
      d.pos = Vector.add(d.pos, direction);
    return true;
  }
  // 以baseHex为基准移动到指定位置
  playerMoveTo(target, baseHex = this.data.find(d => d.player == 2)) {
    const poses = this.dataMap.map(v => v.pos);
    for (let d of this.data)
      if (d.player > 0) // 检查新位置是否合法
        if (poses.some(arrayValEqual(
                Vector.add(Vector.subtract(d.pos, baseHex.pos), target))))
          return false; // 掉落失败，不能移动到已有六边形上

    // 如果所有六边形都可以掉落到新位置，则更新位置
    // 需要先提取出偏移量 p，否则引用类型会导致baseHex.pos偏移
    const p = Array(3).fill().map((_, i) => baseHex.pos[i] - target[i]);
    for (let d of this.data)
      if (d.player > 0)
        d.pos = Vector.subtract(d.pos, p);
    return true;
  }
  /*
   * lr:
   * -1: 左边
   * 0： 往下 playerDrop()
   * 1:  右边
   */
  playerMove(lr) {
    if (this.gameOver)
      return false; // 游戏结束了，不能再操作
    let dir = this.directions[this.nowDropDirectionIndex];
    if (lr == 0)
      return this.playerDrop(dir);

    this.parity = !this.parity;
    let sign = this.directionsSign[this.nowDropDirectionIndex].value * lr == -1;

    // 如果未来位置在有效边界内，则移动
    if (lr * (this.nowDropDirectionIndex % 2 == 1 ? 1 : -1) *
            (this.#getValidEdge(
                 dir, this.#validEdges(this.dataPlayer))[sign ? "max" : "min"] -
             this.#getValidEdge(dir)[sign ? "min" : "max"]) <
        0)
      return this.playerDrop(
          this.directions[(this.nowDropDirectionIndex +
                           (lr == 1 ? 1 + (this.parity ? 1 : 0)
                                    : 5 + (this.parity ? -1 : 0))) %
                          6],
          false);

    // 如果未来位置不在有效边界内，则旋转掉落方向，并移动到对应方向
    this.playerRotate(lr, true);
    this.nowDropDirectionIndex = (this.nowDropDirectionIndex - lr + 6) % 6;

    dir = this.directions[this.nowDropDirectionIndex];
    sign = this.directionsSign[this.nowDropDirectionIndex].value * lr == -1
    const w = this.#getValidEdge(dir)[sign ? "max" : "min"];
    const p =
        this.directionsSign[this.nowDropDirectionIndex].value == 1 ? 1 : 4;
    return this.playerMoveTo(
               Vector.add(
                   Vector
                       .times(dir,
                              -Math.abs(
                                  Vector.dot( // h
                                      dir,
                                      this.dataPlayer.find(d => d.player == 2)
                                          .pos) /
                                  1.414213562)) // sqrt 2
                       .map(Math.round),
                   Vector.add( // w1 + w2
                       Vector.times(
                           Math.floor(w / 2),
                           this.directions[(this.nowDropDirectionIndex + p) %
                                           6]),
                       Vector.times(
                           Math.ceil(w / 2),
                           this.directions
                               [(this.nowDropDirectionIndex + p + 1) % 6]))),
               // 边缘的六边形
               ((id) => this.data.find((d => d.id == id)))(this.#getValidEdge(
                   dir, this.#validEdges(
                            this.dataPlayer))[sign ? "minId" : "maxId"])) ||
           this.playerRotate(-lr, true); // 移动失败就转回去
  }
  /* 把一个 [0, -1, 1] 类型的方向旋转到
   * 1: 左边
   * 2: 左边的左边
   * ...
   * 5: 右边
   */
  #directionRotate(direction, times) {
    return this
        .directions[(this.directions.findIndex(arrayValEqual(direction)) +
                     times + 6) %
                    6];
  }
  /*
   * 旋转玩家的六边形
   * lr:
   * -1 左边
   * 1 右边
   * 返回是否旋转成功
   * force: 是否强制旋转, 为true时不检查重叠
   * 同时强制返回false
   */
  playerRotate(lr = 1, force = false) {
    // x = Ax'
    const mainHex = this.dataPlayer.find(d => d.player == 2);

    // 旋转后有重叠的话就不能旋转
    if ((!force) &&
        (arr => this.dataMap.some(val => arr.some(arrayValEqual(val.pos))))(
            this.dataPlayer.map(
                d => Vector.add(
                    Vector.divide(
                        Matrix.multiply([ Vector.subtract(d.pos, mainHex.pos) ],
                                        this.rotateMatrix[(lr + 1) / 2])[0],
                        3),
                    mainHex.pos))))
      return false;
    for (let d of this.dataPlayer) {
      d.pos = Vector.add(
          Vector.divide(Matrix.multiply([ Vector.subtract(d.pos, mainHex.pos) ],
                                        this.rotateMatrix[(lr + 1) / 2])[0],
                        3),
          mainHex.pos);
    }
    return !force; // 旋转成功
  }

  // 若成环，消除，降落更高的
  #eliminateRing() {
    let score = 0;
    let layer = 1;
    const dist = pos => pos.reduce((a, b) => a + Math.abs(b), 0);
    while (true) {
      layer++;
      let ring = this.data.filter(d => dist(d.pos) == 2 * layer);
      let num = ring.length;
      if (num == 0)
        break; // 没有六边形了，退出循环
      if (num >= layer * 6) {
        // 成环，消除
        this.data = this.data.filter(item => !ring.includes(item));
        // 降落更高的六边形
        let outerHex = this.data.filter(d => dist(d.pos) >= 2 * layer);
        for (let d of outerHex) {
          const pos = this.directions.map(dir => Vector.add(d.pos, dir));
          const distDPos = dist(d.pos);
          for (let p of pos)
            if (dist(p) < distDPos)
              d.pos = p;
        }
        // 消除重叠的六边形
        let possible = outerHex.filter(d => d.pos.some(x => Math.abs(x) <= 1));
        let duplicates = [];
        for (let d of possible) {
          if (possible.some(v => v != d && arrayValEqual(v.pos)(d.pos))) {
            duplicates.push(d);
          }
        }
        this.data = this.data.filter(item => !duplicates.includes(item));

        score += layer * 6; // 增加分数
      }
    }
    return score;
  }
  // 消除一大坨方块
  // 感觉没有消除环好，不用了
  #eliminateBlocks() {
    let score = 0;
    let maps = this.dataMap;
    let dataByH = {};
    let hMax = 0;
    for (let d of maps) {
      const h = d.pos.reduce((a, b) => a + Math.abs(b), 0);
      if (h > hMax)
        hMax = h;
      if (!dataByH[h])
        dataByH[h] = [];
      dataByH[h].push(d);
    }
    const sizeCount = (size) => 1 + 3 * size * (size + 1);
    const dist = pos => pos.reduce((a, b) => a + Math.abs(b), 0);
    for (let hexSize = Math.ceil(hMax / 4) * 2 + 2; hexSize > 2; hexSize -= 2) {
      for (let h in dataByH) {
        if (parseInt(h) <= hMax / 2 + 2 && parseInt(h) > 6) {
          for (let d of dataByH[h]) {
            if (d) {
              let blocks = maps.filter(
                  d2 => dist(Vector.subtract(d2.pos, d.pos)) <= hexSize &&
                        dist(d2.pos) > 1);
              if (blocks.length >= sizeCount(hexSize / 2)) {
                // 消除
                this.data = this.data.filter(item => !blocks.includes(item));
                score += blocks.length;
              }
            }
          }
        }
      }
    }
    return score;
  }
}
