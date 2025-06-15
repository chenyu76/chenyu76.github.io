class Block {
  constructor({
    x, // 块中心的 x 坐标
    y, // 块中心的 y 坐标
    edge_len = EDGE_LEN, // 块边长
    edge_margin = EDGE_MARGIN, // 块间距
    edges_num, // 块边数
    init_angle = 0, // 块的旋转角度
    parent, // 父元素
  }) {
    this.parent = parent;
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

    this.waiting_animation = false; // 是否正在等待动画完成

    this.interactive_area = this.createInteractiveArea(
      x,
      y,
      edge_len / 2 / Math.tan(Math.PI / edges_num),
      async () => {
        if (
          this.camp === now_player ||
          (this.camp === 0 && player_allow_click_blank[now_player])
        ) {
          // 如果当前方块是空的或者是当前玩家的
          if (player_allow_click_blank[now_player])
            player_allow_click_blank[now_player] = false;
          await this.update(now_player);
          do {
            // 切换到下一个活着的玩家
            now_player++;
            if (now_player > player_num) now_player = 1;
          } while (
            player_owned[now_player] <= 0 &&
            player_allow_click_blank[now_player] === false
          );

          change_background_color(CAMPS_COLORS[now_player] + "88");
        }
      },
    );
    //this.container.addEventListener("click", );

    // 获取父元素的所有子元素
    // 有两个，一个用于显示，一个用于交互
    const childrenElements = parent.children;
    childrenElements[0].appendChild(this.container);
    childrenElements[1].appendChild(this.interactive_area);

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
  async update(player, iter = 0) {
    if (iter >= MAX_ITERATION) return;
    while (this.waiting_animation) {
      // 如果正在等待动画完成，则暂停更新
      await delay(50);
    }
    // 更新当前玩家的状态
    player_owned[this.camp]--; // 减少当前阵营的拥有方块数量
    player_owned[player]++;
    this.camp = player;

    this.value += 1;

    if (this.value >= this.neighbors.length) {
      this.draw_polygon();
      this.draw_value();
      this.waiting_animation = true; // 设置为正在等待动画完成

      this.create_animation(this.x, this.y, CAMPS_COLORS[player], "#FFFFFF");

      await delay(250); // 等待一段时间以便视觉效果更明显

      this.value = 0; // 如果当前方块的值超过了邻居数量，则重置为0

      player_owned[this.camp]--;
      player_owned[0]++;
      this.camp = 0;
      // 更新方块外貌
      this.draw_polygon();
      this.draw_value();

      this.waiting_animation = false;

      // 并行执行所有 update() 调用
      const updatePromises = this.neighbors.map((n) =>
        n.update(player, iter + 1),
      );

      // 等待所有 update() 完成
      await Promise.all(updatePromises);
    } else {
      // 更新方块外貌
      this.draw_polygon();
      this.draw_value();
    }
  }

  /**
   * 创建并播放两层圆环扩张动画
   * @param {number} x - 中心点X坐标
   * @param {number} y - 中心点Y坐标
   * @param {string} color1 - 第一层圆环颜色
   * @param {string} color2 - 第二层圆环颜色
   * @param {number} [duration=1000] - 动画持续时间(毫秒)
   * @param {number} [maxSize=200] - 最大扩张尺寸(像素)
   */
  create_animation(
    x,
    y,
    color1,
    color2,
    duration = 400,
    maxSize = (this.canvas_size * 3) / 2,
  ) {
    // 辅助函数：创建圆环元素
    const createCircle = (color) => {
      const circle = document.createElement("div");
      circle.style.position = "absolute";
      circle.style.borderRadius = "50%";
      circle.style.border = `${this.edge_margin}px solid ${color}`;
      circle.style.backgroundColor = "transparent";
      circle.style.transform = "translate(-50%, -50%)";
      circle.style.left = "50%";
      circle.style.top = "50%";
      return circle;
    };

    // 辅助函数：更新圆环样式
    const updateCircleStyle = (circle, size, opacity) => {
      circle.style.width = `${size}px`;
      circle.style.height = `${size}px`;
      circle.style.opacity = opacity;
    };
    // 创建容器元素
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = `${x}px`;
    container.style.top = `${y}px`;
    container.style.transform = "translate(-50%, -50%)";
    container.style.pointerEvents = "none"; // 防止干扰鼠标事件

    // 创建两个圆环
    const circle1 = createCircle(color1);
    const circle2 = createCircle(color2);

    // 添加到容器
    container.appendChild(circle1);
    container.appendChild(circle2);

    // 添加到文档
    this.parent.appendChild(container);

    // 动画时间线
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const sqrtprogress = Math.sqrt(progress); // 使用平方根函数使动画更平滑

      // 计算当前尺寸
      const size1 = sqrtprogress * maxSize;
      const size2 = Math.max(0, sqrtprogress - 0.2) * (maxSize / 0.8);

      // 更新圆环样式
      updateCircleStyle(circle1, size1, 1 - progress);
      updateCircleStyle(circle2, size2, 1 - progress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // 动画结束，移除元素
        this.parent.removeChild(container);
      }
    };

    // 开始动画
    requestAnimationFrame(animate);
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
    let p = 5;
    if (this.edges_num == 3) p = 9; // 三角形太小了有个特判
    if (this.value > 0) {
      if (this.value == 1)
        draw_circle(this.canvas_size / 2, this.canvas_size / 2);
      else
        for (let i = 0; i < this.value; i++) {
          const angle = (i * 2 * Math.PI) / this.value;
          const x =
            this.canvas_size / 2 + (this.canvas_size * Math.cos(angle)) / p;
          const y =
            this.canvas_size / 2 + (this.canvas_size * Math.sin(angle)) / p;
          draw_circle(x, y);
        }
    }
  }

  createInteractiveArea(x, y, radius, onClickCallback) {
    const circleDiv = document.createElement("div");

    // 设置基本样式，使其成为圆形并视觉上不可见
    circleDiv.style.width = `${radius * 2}px`;
    circleDiv.style.height = `${radius * 2}px`;
    circleDiv.style.borderRadius = "50%"; // 使其成为圆形
    circleDiv.style.backgroundColor = "transparent"; // 视觉上不可见
    circleDiv.style.position = "absolute";
    circleDiv.style.left = `${x - radius}px`; // 设置圆心位置
    circleDiv.style.top = `${y - radius}px`; // 设置圆心位置

    // 添加事件监听器
    if (typeof onClickCallback === "function") {
      circleDiv.addEventListener("click", (event) => {
        onClickCallback(event);
      });
    }

    return circleDiv;
  }
}
