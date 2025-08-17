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

// 六边形网格可视化类
class HexGrid {
  constructor(containerId, hexSize = 40) {
    this.container = document.getElementById(containerId);
    this.hexSize = hexSize;
    this.scale = 1;
    this.hexagons = new Map();    // 存储当前显示的六边形
    this.animationDuration = 0.7; // 默认动画时间

    this.initSVG();
    this.setupEventListeners();
    this.resetView();

    this.data = [];
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
    this.dropHeight = 40; // 掉落高度

    this.gameOver = false;

    const a = 2;
    const b = -1;
    // 三倍大小的旋转矩阵,应用完要除以3
    // 第一个元素是向左转
    // 第二个元素是向右转
    this.rotateMatrix = [
      [ [ a, b, a ], [ a, a, b ], [ b, a, a ] ],
      [ [ a, a, b ], [ b, a, a ], [ a, b, a ] ],
    ];

    this.directions = [
      [ 1, 0, -1 ], [ 1, -1, 0 ], [ 0, -1, 1 ], [ -1, 0, 1 ], [ -1, 1, 0 ],
      [ 0, 1, -1 ]
    ];
    // 计算掉落方向往右旋转后的符号，
    // { index: 0/1/2, value: -1/1}
    this.directionsSign = this.directions.map(dir => {
      const v =
          Vector.add(this.directionRotate(dir, 1), this.directionRotate(dir, 2))
      const i = v.findIndex(x => Math.abs(x) == 2);
      return {index : i, value : v[i] / 2};
    });

    // 初始中心块
    this.data.push({
      id : getGlobalId(),
      color : this.colorBedrock,
      pos : [ 0, 0, 0 ],
      player : false
    });
    this.directions.map(dir => this.data.push({
      id : getGlobalId(),
      color : this.colorBedrock,
      pos : Vector.add([ 0, 0, 0 ], dir),
      player : false
    }));
    // 左右位移时往上还是往下，轮流
    this.parity = false;
    // 当前掉落方向
    this.nowDropDirectionIndex = 0;

    // 当前有效边界，需要在添加新六边形时更新
    this.nowValidEdges = this.validEdges();

    this.addNewHexs();

    this.updateGrid();

    // 设置定时更新
    setInterval(() => this.playerDrop(), 1000);
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
  validEdges(data = this.data.filter(d => d.player == 0)) {
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
  getValidEdge(dir, e = this.nowValidEdges) {
    return e[dir[0] + 1][dir[1] + 1][dir[2] + 1];
  }

  // 返回一个新的六边形组合
  getNewHexs() {
    const directions = this.directions;
    const color = randomValFromArray(this.colors);
    let newData =
        [ {id : getGlobalId(), color : color, pos : [ 0, 0, 0 ], player : 1} ];
    for (let i = 1; i < 6; i++) {
      let baseHex, dir, newPos;
      do {
        baseHex = newData[Math.floor(Math.random() * i)];
        // baseHex = newData[Math.floor(i - 1)];
        dir = directions[Math.floor(Math.random() * directions.length)];
        newPos = Vector.add(baseHex.pos, dir);
      } while (newData.map(d => d.pos).some(arrayValEqual(newPos)));
      newData.push(
          {id : getGlobalId(), color : color, pos : newPos, player : 1});
    }

    let c = Vector.divide(
        newData.reduce((a, b) => Vector.add(a, b.pos), [ 0, 0, 0 ]),
        newData.length);
    let dist = newData.map(d => Vector.subtract(d.pos, c)
                                    .map(x => x * x)
                                    .reduce((a, b) => a + b, 0));
    let minDist = Math.min(...dist);
    newData[dist.findIndex(x => x == minDist)].player = 2; // 设置主六边形
    return newData;
  }

  // 添加新的六边形到网格中
  // 添加成功返回true，添加失败（位置冲突）返回false
  // 返回false时表示游戏失败
  addNewHexs(
      dropHeight = this.dropHeight,
  ) {
    this.nowDropDirectionIndex =
        Math.floor(Math.random() * this.directions.length);
    const dir = this.directions[this.nowDropDirectionIndex];
    const e = this.getValidEdge(dir);
    let w = Math.floor(Math.random() * (e.max - e.min) + e.min);
    w = w > 0 ? w - 1 : w + 1; // 收缩范围
    const p =
        this.directionsSign[this.nowDropDirectionIndex].value == 1 ? 1 : 4;
    const pos = Vector.add(
        Vector.times(dir, -dropHeight / 2),
        Vector.add(
            Vector.times(Math.floor(w / 2),
                         this.directions[(this.nowDropDirectionIndex + p) % 6]),
            Vector.times(
                Math.ceil(w / 2),
                this.directions[(this.nowDropDirectionIndex + p + 1) % 6])));

    const newHexs = this.getNewHexs();
    for (let h of newHexs) {
      h.pos = Vector.add(pos, h.pos);
      // 如果新位置已经有六边形，则不添加，游戏失败
      if (this.data.map(d => d.pos).some(arrayValEqual(h.pos)))
        return false;
      this.data.push(h);
    }
    return this.updateGrid();
  }
  /*
   * 往指定方向掉落玩家的六边形
   * direction: [x, y, z] 方向向量
   * 带有防止掉落到已有六边形上的逻辑
   * 如果掉落失败，返回true，否则返回false
   * endTurn: 是否结束当前回合
   * 如果endTurn为true，则会清除玩家的六边形，并生成新的
   */
  playerDrop(direction = this.directions[this.nowDropDirectionIndex],
             endTurn = true) {
    for (let d of this.data) {
      if (d.player && this.data.filter(v => v.player == 0)
                          .map(v => v.pos)
                          .some(arrayValEqual(Vector.add(d.pos, direction)))) {
        // 掉落失败，不能移动到已有六边形上
        // 已经落地了，不能再操作
        if (endTurn) {
          for (let d of this.data)
            if (d.player)
              d.player = 0;
          // 消除环
          this.eliminateRing();
          // 更新有效边界
          this.nowValidEdges = this.validEdges();
          // 生成新的六边形
          if (!this.addNewHexs())
            this.gameOver = true;
        }
        return false;
      }
    }

    // 如果所有六边形都可以掉落到新位置，则更新位置
    for (let d of this.data)
      if (d.player)
        d.pos = Vector.add(d.pos, direction);
    return this.updateGrid();
  }
  // 类似 playerDrop() 函数
  // 掉落到指定位置
  playerMoveTo(target, baseHex = this.data.find(d => d.player == 2)) {
    for (let d of this.data)
      if (d.player) // 检查新位置是否合法
        if (this.data.filter(v => !v.player)
                .map(v => v.pos)
                .some(arrayValEqual(
                    Vector.add(Vector.subtract(d.pos, baseHex.pos), target))))
          return false; // 掉落失败，不能移动到已有六边形上

    // 如果所有六边形都可以掉落到新位置，则更新位置
    // 需要先提取出偏移量 p，否则引用类型会导致baseHex.pos偏移
    const p = Array(3).fill().map((_, i) => baseHex.pos[i] - target[i]);
    for (let d of this.data)
      if (d.player)
        d.pos = Vector.subtract(d.pos, p);
    return this.updateGrid();
  }
  /*
   * lr:
   * -1: 左边
   * 0： 往下 playerDrop()
   * 1:  右边
   */
  playerMove(lr) {
    let dir = this.directions[this.nowDropDirectionIndex];
    if (lr == 0)
      return this.playerDrop(dir);

    this.parity = !this.parity;
    let sign = this.directionsSign[this.nowDropDirectionIndex].value * lr == -1;

    // 如果未来位置在有效边界内，则移动
    if (lr * (this.nowDropDirectionIndex % 2 == 1 ? 1 : -1) *
            (this.getValidEdge(dir, this.validEdges(this.data.filter(
                                        v => v.player)))[sign ? "max" : "min"] -
             this.getValidEdge(dir)[sign ? "min" : "max"]) <
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
    const w = this.getValidEdge(dir)[sign ? "max" : "min"];
    const p =
        this.directionsSign[this.nowDropDirectionIndex].value == 1 ? 1 : 4;
    return this.playerMoveTo(
               Vector.add(
                   Vector
                       .times(dir,
                              -Math.abs(
                                  Vector.dot( // h
                                      dir,
                                      this.data.find(d => d.player == 2).pos) /
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
               ((id) => this.data.find((d => d.id == id)))(this.getValidEdge(
                   dir, this.validEdges(this.data.filter(
                            v => v.player)))[sign ? "minId" : "maxId"])) ||
           this.playerRotate(-lr, true);
  }
  /* 把一个 [0, -1, 1] 类型的方向旋转到
   * 1: 左边
   * 2: 左边的左边
   * ...
   * 5: 右边
   */
  directionRotate(direction, times) {
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
    const mainHex = this.data.find(d => d.player == 2);

    // 旋转后有重叠的话就不能旋转
    if ((!force) &&
        (arr => this.data.filter(d => !d.player)
                    .some(val => arr.some(arrayValEqual(val.pos))))(
            this.data.filter(d => d.player)
                .map(d => Vector
                              .add(Matrix.multiply(
                                       [ Vector.subtract(d.pos, mainHex.pos) ],
                                       this.rotateMatrix[(lr + 1) / 2])[0],
                                   mainHex.pos)
                              .map(Math.round))))
      return false;
    for (let d of this.data) {
      if (d.player != 1)
        continue; // 只旋转玩家的六边形
      d.pos = Vector.add(
          Vector.divide(Matrix.multiply([ Vector.subtract(d.pos, mainHex.pos) ],
                                        this.rotateMatrix[(lr + 1) / 2])[0],
                        3),
          mainHex.pos);
    }
    return force ? false : this.updateGrid(); // 旋转成功
  }

  // 若成环，消除，降落更高的
  eliminateRing() {
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
        // 现在只能消除一层环，为什么？
        // 降落更高的六边形
        let outerHex = this.data.filter(d => dist(d.pos) >= 2 * layer);
        let cornerHex = outerHex.filter(d => d.pos.some(x => x == 0));
        this.data = this.data.filter(item => !cornerHex.includes(item));
        for (let d of outerHex) {
          const pos = this.directions.map(dir => Vector.add(d.pos, dir));
          const distDPos = dist(d.pos);
          for (let p of pos)
            if (dist(p) < distDPos)
              d.pos = p;
        }
      }
    }
  }

  // 初始化SVG容器
  initSVG() {
    // 创建SVG元素
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.setAttribute("width", "100%");
    this.svg.setAttribute("height", "100%");
    this.svg.style.cursor = "grab";

    // 创建主变换组
    this.transformGroup =
        document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.transformGroup.id = "transform-group";
    this.svg.appendChild(this.transformGroup);

    // 创建坐标轴组
    this.axisGroup =
        document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.axisGroup.id = "axis-group";
    this.transformGroup.appendChild(this.axisGroup);

    // 创建六边形组
    this.hexGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.hexGroup.id = "hex-group";
    this.transformGroup.appendChild(this.hexGroup);

    this.container.appendChild(this.svg);

    // 添加拖动功能
    this.isDragging = false;
    this.lastX = 0;
    this.lastY = 0;
    this.translateX = 0;
    this.translateY = 0;

    this.svg.addEventListener('mousedown', this.startDrag.bind(this));
    this.svg.addEventListener('mousemove', this.drag.bind(this));
    this.svg.addEventListener('mouseup', this.endDrag.bind(this));
    this.svg.addEventListener('mouseleave', this.endDrag.bind(this));

    // 添加缩放功能
    this.svg.addEventListener('wheel', this.handleZoom.bind(this));
  }

  // 将立方体坐标转换为像素坐标
  cubeToPixel(q, r, _s = 0) {
    const sqrt3 = 1.732050808;
    const x = this.hexSize * (sqrt3 * q + sqrt3 / 2 * r);
    const y = this.hexSize * (3 / 2 * r);
    return [ x, y ];
  }

  // 创建单个六边形SVG元素
  createHexagonElement(hexData) {
    const [q, r, _] = hexData.pos;
    const [x, y] = this.cubeToPixel(q, r);

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.classList.add("hexagon");
    group.setAttribute("data-id", hexData.id);
    group.style.opacity = "0"; // 初始透明
    group.style.transition =
        `opacity ${this.animationDuration}s ease, transform ${
            this.animationDuration}s cubic-bezier(0.34, 1.56, 0.64, 1)`;

    // 创建六边形路径
    const hex =
        document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = 2 * Math.PI / 6 * (i + 0.5);
      const px = this.hexSize * Math.cos(angle);
      const py = this.hexSize * Math.sin(angle);
      points.push(`${px},${py}`);
    }
    hex.setAttribute("points", points.join(" "));
    hex.setAttribute("fill", hexData.color);
    hex.setAttribute("stroke", "rgba(0, 0, 0, 0.7)");
    hex.setAttribute("stroke-width", "1.5");
    group.appendChild(hex);

    // 添加ID文本
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    // text.textContent = `(${q},${r},${s})`;
    text.setAttribute("fill", "white");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("font-size", "10px");
    text.setAttribute("font-weight", "bold");
    text.setAttribute("pointer-events", "none");
    group.appendChild(text);

    // 设置位置
    group.setAttribute("transform", `translate(${x}, ${y})`);

    // 添加淡入效果
    setTimeout(() => { group.style.opacity = "1"; }, 10);

    return group;
  }

  // 更新整个网格
  updateGrid() {
    const newHexIds = new Set(this.data.map(hex => hex.id));
    const currentHexIds = new Set(this.hexagons.keys());

    // 删除不再存在的六边形
    for (const id of currentHexIds) {
      if (!newHexIds.has(id)) {
        const element = this.hexagons.get(id);
        element.style.opacity = "0";
        setTimeout(() => {
          if (element.parentNode) {
            element.parentNode.removeChild(element);
          }
        }, this.animationDuration * 1000);
        this.hexagons.delete(id);
      }
    }

    // 添加新的六边形或更新位置
    for (const hexData of this.data) {
      if (this.hexagons.has(hexData.id)) {
        // 更新现有六边形位置
        const element = this.hexagons.get(hexData.id);
        const [q, r] = hexData.pos;
        const [x, y] = this.cubeToPixel(q, r);

        // 更新文本内容
        // element.querySelector("text").textContent = `(${q},${r},${- q - r})`;

        // 使用transform实现平滑移动
        element.style.transform = `translate(${x}px, ${y}px)`;
      } else {
        // 添加新六边形
        const element = this.createHexagonElement(hexData);
        this.hexGroup.appendChild(element);
        this.hexagons.set(hexData.id, element);
      }
    }

    // 更新坐标轴
    // this.drawAxes();
    this.drawPlayerAxis();

    // 更新信息面板
    // document.getElementById("hex-count").textContent = this.data.length;

    // 计算坐标系范围
    // const maxCoord =
    //     Math.max(...this.data.flatMap(hex => hex.pos.map(Math.abs)));
    // document.getElementById("grid-range").textContent = `±${maxCoord}`;

    return true;
  }

  // 设置缩放级别
  setScale(scale) {
    this.scale = scale;
    this.transformGroup.setAttribute(
        "transform",
        `translate(${this.translateX}, ${this.translateY}) scale(${scale})`);
  }

  // 重置视图
  resetView() {
    this.translateX = this.container.clientWidth / 2;
    this.translateY = this.container.clientHeight / 2;
    this.scale = 1;
    this.setScale(1);
    document.getElementById("zoom").value = 1;
    document.getElementById("zoom-value").textContent = "1.00";
  }

  // 设置事件监听
  setupEventListeners() {
    // 缩放控制
    const zoomSlider = document.getElementById("zoom");
    zoomSlider.addEventListener("input", () => {
      const zoomValue = parseFloat(zoomSlider.value);
      document.getElementById("zoom-value").textContent = zoomValue.toFixed(2);
      this.setScale(zoomValue);
    });

    // 动画速度控制
    const animationSlider = document.getElementById("animation");
    animationSlider.addEventListener("input", () => {
      const speedValue = parseFloat(animationSlider.value);
      document.getElementById("speed-value").textContent =
          `${speedValue.toFixed(1)}s`;
      this.animationDuration = speedValue;

      // 更新所有六边形的动画时长
      document.querySelectorAll(".hexagon").forEach(hex => {
        hex.style.transition = `opacity ${speedValue}s ease, transform ${
            speedValue}s cubic-bezier(0.34, 1.56, 0.64, 1)`;
      });
    });

    // 随机变换按钮
    // document.getElementById("randomize")
    //     .addEventListener("click", () => { this.randomizeData(); });

    // 重置视图按钮
    document.getElementById("reset").addEventListener(
        "click", () => { this.resetView(); });

    // 玩家操作
    document.addEventListener("keydown", (event) => {
      if ([ "ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " " ].includes(
              event.key,
              )) {
        event.preventDefault();
      }

      switch (event.key) {
      case "ArrowLeft":
      case "a":
      case "A":
      case "h":
        this.playerMove(-1);
        break;
      case "ArrowRight":
      case "d":
      case "D":
      case "l":
        this.playerMove(1);
        break;
      case "ArrowDown":
      case "s":
      case "S":
      case "j":
        this.playerDrop();
        break;
      case "ArrowUp":
      case "w":
      case "W":
      case "k":
        this.playerRotate();
        break;
      }
    });
  }

  // 拖动功能
  startDrag(e) {
    this.isDragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.svg.style.cursor = "grabbing";
  }

  drag(e) {
    if (!this.isDragging)
      return;

    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;

    this.translateX += dx;
    this.translateY += dy;

    this.transformGroup.setAttribute(
        "transform", `translate(${this.translateX}, ${this.translateY}) scale(${
                         this.scale})`);

    this.lastX = e.clientX;
    this.lastY = e.clientY;
  }

  endDrag() {
    this.isDragging = false;
    this.svg.style.cursor = "grab";
  }

  // 缩放功能
  handleZoom(e) {
    e.preventDefault();

    const zoomIntensity = 0.1;
    const wheel = e.deltaY < 0 ? 1 : -1;
    const newScale =
        Math.max(0.1, Math.min(3, this.scale + wheel * zoomIntensity));

    this.setScale(newScale);

    // 更新UI
    document.getElementById("zoom").value = newScale;
    document.getElementById("zoom-value").textContent = newScale.toFixed(2);
  }

  // 绘制指向的轴
  drawPlayerAxis() {
    // 清除旧轴
    while (this.axisGroup.firstChild) {
      this.axisGroup.removeChild(this.axisGroup.firstChild);
    }

    const xys =
        this.data.filter(d => d.player).map(d => this.cubeToPixel(...d.pos));
    const d = this.cubeToPixel(...this.directions[this.nowDropDirectionIndex]);
    const fromXy = xys.map(xy => Vector.add(xy, Vector.times(-0.3, d)));
    const toXy = xys.map(xy => Vector.add(xy, Vector.times(100, d)));

    for (let i = 0; i < fromXy.length; i++)
      this.drawAxis(...fromXy[i], ...toXy[i], "#88888822", 10 * this.scale);
  }
  // 绘制一条坐标轴
  drawAxis(x1, y1, x2, y2, color, strokeWidth) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", strokeWidth);
    line.setAttribute("marker-end", "url(#arrow)");
    line.classList.add("axis");
    this.axisGroup.appendChild(line);
  }
}

// 页面加载完成后初始化
window.addEventListener("DOMContentLoaded",
                        () => { new HexGrid("grid-container", 10); });
