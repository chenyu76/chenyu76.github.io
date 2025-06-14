const game_boards = {
  random: (game_board) => {
    const game_board_types = Object.keys(game_boards);
    const random_index =
      Math.floor(Math.random() * game_board_types.length - 1) + 1;
    const key = game_board_types[random_index];
    return game_boards[key](game_board);
  },
  square: (game_board) => {
    let blocks = [];
    const rows = map_size;
    const cols = map_size;
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
  triangle: (game_board) => {
    let blocks = [];
    const rows = map_size;
    const cols = map_size;
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
        const x = i * width + width / 2 + EDGE_MARGIN;
        const block = new Block({
          x: x + offsetx,
          y: y + offsety,
          edges_num,
          parent: game_board,
          init_angle, // 旋转角度
        });
        block.add_potential_neighbors(blocks.flat());
        blocks.push(block);
      }
    }
    return blocks;
  },
};
