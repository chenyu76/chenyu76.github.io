// 返回一个开口向右的抛物线函数,函数输入是局部输入y,返回全局坐标[x,y]
function parabola_right(start, a) {
  return (y) => [a * y * y + start[0], -y + start[1]];
}
function parabola_right_derivative(a) {
  let two_a = 2 * a;
  return (y) => two_a * y;
}

function homogeneous_cantilever_beam(start, k, L, EI, q = 1) {
  let q_over_24EI = q / (24 * EI);
  let four_L = L * 4;
  let six_L_square = L * L * 6;
  return (x) => [
    start[0] + x,
    start[1] +
      x * x * q_over_24EI * (x * x - four_L * x + six_L_square) +
      k * x,
  ];
}

// 在给定的画布ctx上，画一条芦苇，返回这个ctx
// start: 起始点坐标[x, y]
function draw_pampas_grass(start, ctx, p_color, pgd) {
  // 来自 sky_element.js 的随机生成函数randomNormal
  const length = Math.round(randomNormal(pgd[0], pgd[1])); // 苇草长度
  const bent = ((i) => (i > 0 ? i : pgd[2]))(randomNormal(pgd[2], pgd[3])); // 苇草弯曲度
  const branch_start = Math.round(length * randomNormal(pgd[4], pgd[5])); // 苇草分支起始位置

  start[1] += length * Math.random(0.1); // 苇草起始位置偏移

  let f = parabola_right(start, bent); // 苇草主干
  let df = parabola_right_derivative(bent);

  let draw_branch = (base_branch_length, color, precent = 1) => {
    ctx.fillStyle = color;
    for (let y = branch_start; y < length; y++) {
      if (precent != 1 && Math.random() > precent) continue;
      let branch_length = Math.round(
        randomNormal(base_branch_length, base_branch_length / 2),
      );
      let g = homogeneous_cantilever_beam(
        f(y),
        df(y) - randomNormal(pgd[6], pgd[7]), // 苇草分支起始斜率
        base_branch_length, // 苇草分支长度
        randomNormal(pgd[8], pgd[9]), // 苇草分支弯曲度
      );
      for (let x = 0; x < branch_length; x++)
        ctx.fillRect(...g(x).map((i) => Math.floor(i)), 1, 1);
    }
  };
  draw_branch(pgd[10], p_color[0], pgd[11]);
  draw_branch(pgd[12], p_color[1], pgd[13]);
  draw_branch(pgd[14], p_color[2], pgd[15]);

  ctx.fillStyle = p_color[2];
  for (let y = 0; y < length; y++)
    ctx.fillRect(...f(y).map((i) => Math.floor(i)), 1, 1);

  return ctx;
}

function draw_pampas_grasses(
  width,
  height,
  num,
  pixelSize,
  color_multiplyer = "#FFFFFF",
  scale = 1,
) {
  const pampas_canvas = document.createElement("canvas");
  pampas_canvas.style.position = "absolute";
  pampas_canvas.width = width;
  pampas_canvas.height = height;
  pampas_canvas.style.right = "0px";
  pampas_canvas.style.zoom = pixelSize;
  const ctx = pampas_canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false; // 禁用抗锯齿

  let adjusted_color = get_adjusted_color(color_multiplyer);

  const pgd_scale_factor = [
    1, 1, -1.25, -1.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  ].map((v) => Math.pow(scale, v));
  const pgd = [
    50, 10, 0.0045, 0.002, 0.5, 0.1, 2, 0.2, 200, 50, 10, 1, 5, 0.8, 2, 0.4,
  ].map((v, i) => v * pgd_scale_factor[i]); // 生成参数，缩放比例scale

  for (let i = 0; i < num; i++)
    draw_pampas_grass(
      [Math.round(Math.random() * width), height],
      ctx,
      adjusted_color,
      pgd,
    );

  return pampas_canvas;
}

function get_adjusted_color(color_multiplyer = "#FFFFFF") {
  //const pampas_color = ["#D7D1BA", "#A89268", "#426C13"];
  //const pampas_color = ["#E1D6AB", "#B5AF9F", "#6B6A54"];
  const pampas_color = ["#F5F1E8", "#DCCBB2", "#B9A99A"];

  //来自主脚本的颜色
  const light_color = interpolate_time_color(currentHour, lightColorDict);
  // 光线影响
  return pampas_color.map((color) =>
    rgb2hex(
      ...colorMultiply(
        colorMultiply(hex2rgb(color), light_color),
        hex2rgb(color_multiplyer),
      ),
    ),
  );
}

function draw_background_land(w, h, pixelSize) {
  const canvas = document.createElement("canvas");
  canvas.style.position = "absolute";
  canvas.width = w;
  canvas.height = h;
  canvas.style.right = "0px";
  canvas.style.zoom = pixelSize;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const mountain_colors = ["#5F7E8C", "#6C91C2", "#D0E2EE"];
  const land_color = [
    ...get_adjusted_color(),
    ...mountain_colors.map((c) =>
      rgb2hex(
        ...colorMultiply(
          hex2rgb(c),
          interpolate_time_color(currentHour, lightColorDict),
        ),
      ),
    ),
  ];

  for (let i = 2; i >= 0; i--) {
    for (let j = 0; j < 2; j++) {
      let mh = Math.round(h * (Math.random() * 0.005 + 0.02)) * (1 / (i + 1));
      let mw = Math.round(w * (Math.random() * 0.5 + 0.2));
      let x = Math.round(Math.random() * (w - mw));
      draw_mountain(ctx, land_color[3 + i], x, h - 35 - mh, mw, mh, 0.5, 3, "#EEEEEE");
    }
  }

  // 定义条带位置（从底部向上计算）
  const bands = [
    { height: 5, color: land_color[0], y: h - 5 }, // 底部条带
    { height: 10, color: land_color[1], y: h - 15 }, // 中间条带
    { height: 15, color: land_color[2], y: h - 30 }, // 顶部条带
    { height: 5, color: land_color[3], y: h - 35 }, // 山脉过渡
  ];

  // 绘制纯色条带（无过渡部分）
  bands.forEach((band) => {
    ctx.fillStyle = band.color;
    ctx.fillRect(0, band.y, w, band.height);
  });

  // 在条带之间添加噪声过渡
  addNoiseTransition(ctx, bands, w, h);

  return canvas;
}

// 添加噪声过渡函数
function addNoiseTransition(ctx, bands, w, _h) {
  // 过渡参数
  const transitionWidth = 4; // 过渡区域宽度
  const noiseAmplitude = 0.8; // 噪声强度
  const noiseScale = 0.05; // 噪声缩放比例
  const noiseStep = 2; // 噪声过渡数量

  // 在条带之间创建过渡
  for (let i = 0; i < bands.length - 1; i++) {
    const topBand = bands[i + 1]; // 上方的条带
    const bottomBand = bands[i]; // 下方的条带
    const transitionY = bottomBand.y; // 过渡开始位置

    // 创建过渡区域图像数据
    const imageData = ctx.getImageData(
      0,
      transitionY - transitionWidth,
      w,
      transitionWidth,
    );
    const data = imageData.data;

    // 处理每个像素
    for (let y = 0; y < transitionWidth; y++) {
      const globalY = transitionY - transitionWidth + y;
      for (let x = 0; x < w; x++) {
        // 计算基础混合权重（0到1之间）
        const baseWeight = y / transitionWidth;

        // 生成噪声值（-0.5到0.5之间）
        const noise =
          (fractalNoise(x, globalY, noiseScale) - 0.5) * noiseAmplitude;

        // 应用噪声扰动
        const noisyWeight =
          Math.round(Math.max(0, Math.min(1, baseWeight + noise)) * noiseStep) /
          noiseStep;

        // 混合颜色
        const idx = (y * w + x) * 4;
        const c1 = hex2rgb(topBand.color);
        const c2 = hex2rgb(bottomBand.color);
        for (let c = 0; c < 3; c++)
          data[idx + c] = Math.round(
            c1[c] * (1 - noisyWeight) + c2[c] * noisyWeight,
          );

        data[idx + 3] = 255; // Alpha通道
      }
    }

    // 将处理后的图像数据放回canvas
    ctx.putImageData(imageData, 0, transitionY - transitionWidth);
  }
}

// 简单分形噪声生成器
function fractalNoise(x, y, scale, octaves = 3, persistence = 0.5) {
  let value = 0;
  let amplitude = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += simpleNoise(x * scale, y * scale) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    scale *= 2;
  }

  return value / maxValue;
}

// 简单噪声函数（基于三角函数）
function simpleNoise(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function draw_mountain(
  ctx,
  color = "#AAAAAA",
  x = 0,
  y = 0,
  w = 0,
  h = 0,
  roughness = 0.5,
  iterations = 2,
  shading = "#EEEEEE",
) {
  // 生成山脉点
  const p = generate_mountain_points(w, h, roughness, iterations);

  for (let i = 0; i < p.length - 1; i++) {
    for (xi = p[i].x + x; xi < p[i + 1].x + x; xi++) {
      let yi = Math.floor(
        ((p[i + 1].y - p[i].y) / (p[i + 1].x - p[i].x)) * (xi - p[i].x - x) +
          p[i].y +
          y,
      );
      ctx.fillStyle = color;
      ctx.fillRect(xi, yi, 1, y + h - yi);
      ctx.fillStyle = rgb2hex(...colorMultiply(hex2rgb(color), hex2rgb(shading)));
      let yi2 = Math.round(h + y - Math.sqrt(h+ y - yi));
      ctx.fillRect(xi, yi2, 1, y + h - yi2);
    }
  }

  // 绘制山脉主体
  // ctx.beginPath();
  // ctx.moveTo(0 + x, height + y);
  // points.forEach((point) => ctx.lineTo(x + point.x, y + point.y));
  // ctx.lineTo(width + x, height + y);
  // ctx.cMath.round(Math.random() * w)losePath();

  // 创建山脉渐变
  // const mountainGradient = ctx.createLinearGradient(0, 0, 0, height);
  // mountainGradient.addColorStop(0, shadeColor(color, -30));
  // mountainGradient.addColorStop(0.5, color);
  // mountainGradient.addColorStop(1, shadeColor(color, 30));

  // ctx.fillStyle = color;
  // ctx.fill();

  // 添加阴影效果增强立体感
  // ctx.strokeStyle = shadeColor(color, -40);
  // ctx.lineWidth = 1;
  // ctx.stroke();
}

// 生成山脉点的函数（中点位移算法）
function generate_mountain_points(w, h, roughness, iterations) {
  // 设置点数组
  let points = [
    { x: 0, y: h },
    { x: w / 2, y: h * 0.2 },
    { x: w, y: h },
  ];

  // 迭代生成山脉点
  for (let i = 0; i < iterations; i++) {
    const newPoints = [points[0]];
    const displacement = (w / 10) * Math.pow(roughness, i);

    for (let j = 0; j < points.length - 1; j++) {
      const left = points[j];
      const right = points[j + 1];

      // 计算中点
      const midX = (left.x + right.x) / 2;
      const midY = (left.y + right.y) / 2;

      // 添加随机位移
      const newY = midY + (Math.random() * 2 - 1) * displacement;

      newPoints.push({ x: midX, y: newY });
      newPoints.push(right);
    }

    points = newPoints;
  }
  return points.map((point) => ({
    x: Math.round(point.x),
    y: Math.round(point.y),
  }));
}
