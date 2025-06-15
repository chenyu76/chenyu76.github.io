const game_boards = {
  random: (game_board) => {
    const game_board_types = Object.keys(game_boards);
    const random_index =
      Math.floor(Math.random() * game_board_types.length - 1) + 1;
    const key = game_board_types[random_index];
    return game_boards[key](game_board);
  },
  square: (game_board, rows = map_size, cols = map_size, startx = 0) => {
    let blocks = [];
    const edges_num = 4;
    game_board.style.width = `${cols * EDGE_LEN + 2 * EDGE_MARGIN}px`;
    game_board.style.height = `${rows * EDGE_LEN + 2 * EDGE_MARGIN}px`;
    // 创建方块
    for (let j = 0; j < cols; j++) {
      blocks.push([]);
      for (let i = 0; i < rows; i++) {
        const x = j * EDGE_LEN + EDGE_LEN / 2 + EDGE_MARGIN + startx;
        const y = i * EDGE_LEN + EDGE_LEN / 2 + EDGE_MARGIN;
        const block = new Block({
          x,
          y,
          edges_num,
          init_angle: Math.PI / 4, // 旋转45度
          parent: game_board,
        });
        blocks[j].push(block);
      }
    }
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const block = blocks[j][i];
        // 添加邻居
        if (i < rows - 1) block.add_neighbor(blocks[j][i + 1]); // 下
        if (j < cols - 1) block.add_neighbor(blocks[j + 1][i]); // 右
      }
    }
    return blocks;
  },
  hexgon: (game_board, add_neighbors = true) => {
    let blocks = [];
    const rows = map_size;
    const cols = map_size;
    const width = (EDGE_LEN * 3) / 2;
    const height = EDGE_LEN * Math.sqrt(3);
    const edges_num = 6;

    game_board.style.width = `${cols * width + EDGE_LEN * 1 + 2 * EDGE_MARGIN}px`;
    game_board.style.height = `${rows * height + EDGE_LEN + 2 * EDGE_MARGIN}px`;
    for (let i = 0; i < cols; i++) {
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
        if (add_neighbors) block.add_potential_neighbors(blocks);
        blocks.push(block);
      }
    }
    return blocks;
  },
  hextri: (game_board) => {
    const sqrt3 = Math.sqrt(3);
    let blocks = game_boards.hexgon(game_board, false);
    let tri_num = Math.ceil(map_size * (0.5 + Math.random()));
    let new_blocks = [];
    for (let i = 0; i < tri_num; i++) {
      let block = blocks.splice(
        Math.floor(Math.random() * blocks.length),
        1,
      )[0];
      game_board.children[0].removeChild(block.container);
      game_board.children[1].removeChild(block.interactive_area);
      let tris = Array.from(
        { length: 6 },
        (_, j) =>
          new Block({
            x:
              block.x -
              (1 / sqrt3) *
                block.edge_len *
                Math.cos((j * Math.PI) / 3 + Math.PI / 6 + block.init_angle),
            y:
              block.y -
              (1 / sqrt3) *
                block.edge_len *
                Math.sin((j * Math.PI) / 3 + Math.PI / 6 + block.init_angle),
            edges_num: 3,
            init_angle: (j * Math.PI) / 3 + block.init_angle + Math.PI / 6,
            parent: game_board,
            edge_len: block.edge_len,
            edge_margin: block.edge_margin,
          }),
      );
      new_blocks.push(...tris);
    }
    blocks = blocks.concat(new_blocks);
    for (let block of blocks) block.add_potential_neighbors(blocks);
    return blocks;
  },
  triangle: (
    game_board,
    rows = map_size * 2,
    cols = Math.floor((map_size * 3) / 2),
    startx = 0,
    add_neighbors = true,
  ) => {
    let blocks = [];
    const sqrt3 = Math.sqrt(3);
    const height = EDGE_LEN / 2;
    const width = (EDGE_LEN * sqrt3) / 2;
    const edges_num = 3;

    game_board.style.width = `${cols * width + 2 * EDGE_MARGIN}px`;
    game_board.style.height = `${(rows + 2) * height + 2 * EDGE_MARGIN}px`;
    for (let i = 0; i < cols; i++) {
      const offsety = (EDGE_LEN * (i % 2)) / 2;
      for (let j = 0; j < rows; j++) {
        const init_angle = (j % 2) * Math.PI;
        const offsetx =
          EDGE_LEN * ((j % 2) * 2 - 1) * (sqrt3 / 4 - 1 / (2 * sqrt3));
        const y = j * height + height / 2 + EDGE_LEN / 4 + EDGE_MARGIN;
        const x = i * width + width / 2 + EDGE_MARGIN + startx;
        const block = new Block({
          x: x + offsetx,
          y: y + offsety,
          edges_num,
          parent: game_board,
          init_angle, // 旋转角度
        });
        if (add_neighbors) block.add_potential_neighbors(blocks.flat());
        blocks.push(block);
      }
    }
    return blocks;
  },
  octagon: (game_board) => {
    let blocks = [];
    const rows = Math.floor((map_size / 3) * 2);
    const cols = Math.ceil((map_size / 3) * 2);
    const size = EDGE_LEN / Math.tan(Math.PI / 8);
    const init_angle = Math.PI / 8;

    game_board.style.width = `${cols * size + 2 * EDGE_MARGIN}px`;
    game_board.style.height = `${rows * size + 2 * EDGE_MARGIN}px`;
    // 创建八边形
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const y = j * size + size / 2 + EDGE_MARGIN;
        const x = i * size + size / 2 + EDGE_MARGIN;
        const block = new Block({
          x,
          y,
          edges_num: 8,
          parent: game_board,
          init_angle, // 旋转角度
        });
        blocks.push(block);
      }
    }
    // 创建四边形
    for (let i = 0; i < cols - 1; i++) {
      for (let j = 0; j < rows - 1; j++) {
        const x = i * size + size + EDGE_MARGIN;
        const y = j * size + size + EDGE_MARGIN;
        const block = new Block({
          x,
          y,
          edges_num: 4,
          parent: game_board,
          init_angle: 0, // 旋转角度
        });
        blocks.push(block);
      }
    }
    for (let b of blocks) b.add_potential_neighbors(blocks);

    return blocks;
  },
  square_triangle: (game_board) => {
    const width =
      Math.floor(map_size / 2) * EDGE_LEN +
      (Math.ceil(map_size / 2) * (EDGE_LEN * Math.sqrt(3))) / 2 +
      2 * EDGE_MARGIN;

    let blocks = game_boards
      .square(game_board, map_size, Math.floor(map_size / 2), 0)
      .flat();
    let tris = game_boards.triangle(
      game_board,
      map_size * 2,
      Math.ceil(map_size / 2),
      EDGE_LEN * Math.floor(map_size / 2),
    );

    game_board.style.width = `${width}px`;
    game_board.style.height = `${(map_size + 1) * EDGE_LEN + 2 * EDGE_MARGIN}px`;
    // 添加三角形和方形的邻居关系
    for (
      let i = map_size * (Math.floor(map_size / 2) - 1) - 1;
      i < blocks.length;
      i++
    ) {
      blocks[i].add_potential_neighbors(tris);
    }
  },
  partial_square: (
    game_board,
    rows = map_size,
    cols = map_size,
    startx = 0,
  ) => {
    // 只有边框的方形
    // 我也太懒了直接用square改的
    let blocks = [];
    const edges_num = 4;
    game_board.style.width = `${cols * EDGE_LEN + 2 * EDGE_MARGIN}px`;
    game_board.style.height = `${rows * EDGE_LEN + 2 * EDGE_MARGIN}px`;
    // 创建方块
    for (let j = 0; j < cols; j++) {
      blocks.push([]);
      for (let i = 0; i < rows; i++) {
        if (i == 0 || j == 0 || j == cols - 1 || i == rows - 1) {
          const x = j * EDGE_LEN + EDGE_LEN / 2 + EDGE_MARGIN + startx;
          const y = i * EDGE_LEN + EDGE_LEN / 2 + EDGE_MARGIN;
          const block = new Block({
            x,
            y,
            edges_num,
            init_angle: Math.PI / 4, // 旋转45度
            parent: game_board,
          });
          blocks[j].push(block);
        } else {
          blocks[j].push(null);
        }
      }
    }
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (!(i == 0 || j == 0 || j == cols - 1 || i == rows - 1)) continue;
        const block = blocks[j][i];
        // 添加邻居
        if (i < rows - 1 && blocks[j][i + 1])
          block.add_neighbor(blocks[j][i + 1]); // 下
        if (j < cols - 1 && blocks[j + 1][i])
          block.add_neighbor(blocks[j + 1][i]); // 右
      }
    }
    return blocks;
  },
  rhombihexadeltille: (game_board) => {
    let blocks = [];
    const sqrt3 = Math.sqrt(3);
    const r = Math.floor(map_size / 2);
    const c = Math.ceil(map_size / 2);
    const l = EDGE_LEN;
    const w = (sqrt3 + 1) * l;
    const h = ((sqrt3 + 3) / 2) * l;
    const o = ((sqrt3 + 1) / 2) * l;
    const h0 = l + EDGE_MARGIN;
    const w0 = (l * 3) / 2 + EDGE_MARGIN;

    game_board.style.width = `${c * w + l * 2 + 2 * EDGE_MARGIN}px`;
    game_board.style.height = `${r * h + l + 2 * EDGE_MARGIN}px`;

    for (let i = 0; i < c; i++) {
      for (let j = 0; j < r; j++) {
        const offsetx = (j % 2) * o;
        const b6 = new Block({
          x: i * w + offsetx + w0,
          y: j * h + h0,
          edges_num: 6,
          parent: game_board,
          init_angle: Math.PI / 6,
        });
        blocks.push(b6);
        const b4s = Array.from({ length: 3 }, (_, k) => {
          const d = ((sqrt3 + 1) / 2) * l;
          const dx = d * Math.cos((k * Math.PI) / 3);
          const dy = d * Math.sin((k * Math.PI) / 3);
          return new Block({
            x: b6.x + dx,
            y: b6.y + dy,
            edges_num: 4,
            parent: game_board,
            init_angle: (k * Math.PI) / 3 + Math.PI / 4,
          });
        });
        blocks.push(...b4s);
        const b3s = Array.from({ length: 2 }, (_, k) => {
          const d = (1 / sqrt3 + 1) * l;
          const dx = d * Math.cos((k * Math.PI) / 3 + Math.PI / 6);
          const dy = d * Math.sin((k * Math.PI) / 3 + Math.PI / 6);
          return new Block({
            x: b6.x + dx,
            y: b6.y + dy,
            edges_num: 3,
            parent: game_board,
            init_angle: (k * Math.PI) / 3 - Math.PI / 6,
          });
        });
        blocks.push(...b3s);
      }
    }

    for (let b of blocks) {
      b.add_potential_neighbors(blocks);
    }
    return blocks;
  },
};
