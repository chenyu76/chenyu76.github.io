class Block {
  constructor({
    x, // 块中心的 x 坐标
    y, // 块中心的 y 坐标
    edge_len = EDGE_LEN, // 块边长
    edge_margin = EDGE_MARGIN, // 块间距
    edges_num, // 块边数
    init_angle = 0, // 块的旋转角度
    parent, // 视觉区域的父元素
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

    this.interactive_area = this.createInteractiveArea(
      x,
      y,
      edge_len / 2 / Math.tan(Math.PI / edges_num),
      () => {
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
