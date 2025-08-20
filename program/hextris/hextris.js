class HexTris {
  constructor(containerId, hexSize = 40) {
    this.container = document.getElementById(containerId);
    this.hexSize = hexSize;
    this.scale = 1;
    this.hexagons = new Map(); // 存储当前显示的六边形
    this.animationDuration = parseFloat(
        document.getElementById("animation").value); // 默认动画时间(s)

    this.initSVG();
    this.setupEventListeners();
    this.resetView();

    // 设置定时更新
    this.dropTimer = null;
    this.updateDropInterval = (newInterval) => {
      this.dropInterval = newInterval;
      if (this.dropTimer) {
        clearInterval(this.dropTimer);
      }
      this.dropTimer = setInterval(() => this.update(), this.dropInterval);
    };

    this.soundEffect = new SoundEffect(); // 初始化音效
    this.game =
        new Game(this.updateDropInterval, this.soundEffect); // 初始化游戏

    this.updateDropInterval(this.game.dropInterval);
    this.updateGrid();
  }

  update() { this.game.playerDrop() && this.updateGrid(); }

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

    // 创建外层容器（用于位置）
    const container =
        document.createElementNS("http://www.w3.org/2000/svg", "g");
    container.classList.add("hexagon-container");
    container.setAttribute("data-id", hexData.id);
    container.style.transform = `translate(${x}px, ${y}px)`;
    container.style.transition = `transform ${this.animationDuration}s ease`;

    // 创建内部组（用于抖动动画）
    const innerGroup =
        document.createElementNS("http://www.w3.org/2000/svg", "g");
    innerGroup.classList.add("hexagon-inner");

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
    innerGroup.appendChild(hex);

    // 添加ID文本
    // const text = document.createElementNS("http://www.w3.org/2000/svg",
    // "text"); text.textContent = `(${q},${r},${s})`; text.setAttribute("fill",
    // "white"); text.setAttribute("text-anchor", "middle");
    // text.setAttribute("dominant-baseline", "middle");
    // text.setAttribute("font-size", "10px");
    // text.setAttribute("font-weight", "bold");
    // text.setAttribute("pointer-events", "none");
    // innerGroup.appendChild(text);

    // 添加淡入效果
    container.style.opacity = "0";
    setTimeout(() => { container.style.opacity = "1"; }, 10);

    container.appendChild(innerGroup);
    return container;
  }

  // 更新整个网格
  updateGrid() {
    const newHexIds = new Set(this.game.data.map(hex => hex.id));
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
    for (const hexData of this.game.data) {
      if (this.hexagons.has(hexData.id)) {
        // 更新现有六边形位置
        const element = this.hexagons.get(hexData.id);
        const [q, r] = hexData.pos;
        const [x, y] = this.cubeToPixel(q, r);

        // 更新文本内容
        // element.querySelector("text").textContent = `(${q},${r},${- q - r})`;

        // 检查颜色是否需要更新
        const polygon = element.querySelector("polygon");
        if (polygon.getAttribute("fill") !== hexData.color) {
          polygon.setAttribute("fill", hexData.color);
        }

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
    document.getElementById("reset").addEventListener("click",
                                                      () => this.resetView());

    // 音乐按钮

    document.getElementById('toggleBGM')
        .addEventListener('click', () => this.soundEffect.toggleBGM());

    // 玩家操作
    document.addEventListener("keydown", async (event) => {
      if ([ "ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " " ].includes(
              event.key,
              )) {
        event.preventDefault();
      }
      const updateOrNot = (bool) => {
        if (bool) {
          this.soundEffect.playMoveSound();
          this.updateGrid();
        } else {
          this.soundEffect.playExplosionSound();
          this.shakeHexagons();
        }
      };

      switch (event.key) {
      case "ArrowLeft":
      case "a":
      case "A":
      case "h":
        updateOrNot(this.game.playerMove(-1));
        break;
      case "ArrowRight":
      case "d":
      case "D":
      case "l":
        updateOrNot(this.game.playerMove(1));
        break;
      case "ArrowDown":
      case "s":
      case "S":
      case "j":
      case " ":
        updateOrNot(this.game.playerDrop());
        break;
      case "ArrowUp":
      case "w":
      case "W":
      case "k":
      case "e":
        updateOrNot(this.game.playerRotate(1));
        break;
      case "q":
        updateOrNot(this.game.playerRotate(-1));
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

    const xys = this.game.data.filter(d => d.player > 0)
                    .map(d => this.cubeToPixel(...d.pos));
    const d = this.cubeToPixel(
        ...this.game.directions[this.game.nowDropDirectionIndex]);
    const fromXy = xys.map(xy => Vector.add(xy, Vector.times(-0.3, d)));
    const toXy = xys.map(xy => Vector.add(xy, Vector.times(100, d)));

    for (let i = 0; i < fromXy.length; i++)
      this.drawAxis(...fromXy[i], ...toXy[i], "#88888822", 10);
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

  /**
   * 使指定六边形产生抖动动画效果
   * @param {Array} hexesToShake - 需要抖动的六边形数组（this.data的子集）
   */
  shakeHexagons(hexes = this.game.data.filter(d => d.player > 0)) {
    // 清除所有现有的抖动类
    this.hexGroup.querySelectorAll(".shake").forEach(
        el => { el.classList.remove("shake"); });

    // 应用抖动动画到选定的六边形
    hexes.forEach(hex => {
      const element = this.hexagons.get(hex.id);
      if (element) {
        const innerGroup = element.querySelector(".hexagon-inner");
        innerGroup.classList.add("shake");

        // 动画结束后移除类
        setTimeout(() => { innerGroup.classList.remove("shake"); }, 300);
      }
    });
  }
}
