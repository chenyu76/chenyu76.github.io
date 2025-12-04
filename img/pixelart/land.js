
class Land {
  draw_background_land(w, h, pixelSize) {
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.width = w;
    canvas.height = h;
    canvas.style.right = "0px";
    canvas.style.zoom = pixelSize;
    // Canvas2D: Multiple readback operations using getImageData
    // are faster with the willReadFrequently attribute set to true.
    const ctx = canvas.getContext("2d", {willReadFrequently : true});
    ctx.imageSmoothingEnabled = false;

    const mountain_colors = [ "#5F7E8C", "#6C91C2", "#D0E2EE" ];
    // 0,1,2 是草地颜色，3,4,5是山脉颜色
    const land_color = [
      ...Grass.get_adjusted_color(),
      ...mountain_colors
          .map(
              (c) => rgb2hex(
                  ...colorMultiply(
                      hex2rgb(c),
                      interpolate_time_color(currentHour, lightColorDict),
                      ),
                  ),
              )
          .map((c, i) => i == 0 ? c
                                : rgb2hex(...colorAverage(
                                      hex2rgb(c),
                                      interpolate_time_color(currentHour,
                                                             skyColorDict[2]),
                                      1 - i * 0.4))),
    ];

    for (let i = 2; i >= 0; i--) {
      for (let j = 0; j < 2; j++) {
        let mh =
            Math.round(h * (Math.random() * 0.03 + 0.03)) * (1 / (i / 2 + 1));
        let mw = Math.round(w * (Math.random() * 0.5 + 0.2));
        let x = Math.round(Math.random() * (w - mw));
        this.#draw_mountain(ctx, land_color[3 + i],
                            colorMultiplyHex(land_color[3 + i], "#EEEEEE"), x,
                            h - 35 - mh, mw, mh, 0.5 - i / 5, 4 + i);
      }
    }

    // 定义条带位置（从底部向上计算）
    const bands = [
      {height : 5, color : land_color[0], y : h - 5},   // 底部条带
      {height : 10, color : land_color[1], y : h - 15}, // 中间条带
      {height : 15, color : land_color[2], y : h - 30}, // 顶部条带
      {height : 5, color : land_color[3], y : h - 35},  // 山脉过渡
    ];

    // 绘制纯色条带（无过渡部分）
    bands.forEach((band) => {
      ctx.fillStyle = band.color;
      ctx.fillRect(0, band.y, w, band.height);
    });

    // 在条带之间添加噪声过渡
    this.#addNoiseTransition(ctx, bands, w, h);

    return canvas;
  }

  // 添加噪声过渡函数
  #addNoiseTransition(ctx, bands, w, _h) {
    // 过渡参数
    const transitionWidth = 4;  // 过渡区域宽度
    const noiseAmplitude = 0.8; // 噪声强度
    const noiseScale = 0.05;    // 噪声缩放比例
    const noiseStep = 2;        // 噪声过渡数量

    // 在条带之间创建过渡
    for (let i = 0; i < bands.length - 1; i++) {
      const topBand = bands[i + 1];     // 上方的条带
      const bottomBand = bands[i];      // 下方的条带
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
          const noise = (this.#fractalNoise(x, globalY, noiseScale) - 0.5) *
                        noiseAmplitude;

          // 应用噪声扰动
          const noisyWeight =
              Math.round(Math.max(0, Math.min(1, baseWeight + noise)) *
                         noiseStep) /
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
  #fractalNoise(x, y, scale, octaves = 3, persistence = 0.5) {
    let value = 0;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += this.#simpleNoise(x * scale, y * scale) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      scale *= 2;
    }

    return value / maxValue;
  }

  // 简单噪声函数（基于三角函数）
  #simpleNoise(x, y) {
    const n = Math.sin(x * 12.3737 + y * 78.114514) * 424242.4242;
    return n - Math.floor(n);
  }

  #draw_mountain(
      ctx,
      color = "#AAAAAA",
      shading_color = "#FFFFFF",
      x = 0,
      y = 0,
      w = 0,
      h = 0,
      roughness = 0.5,
      iterations = 2,
  ) {
    // 生成山脉点
    const p = this.#generate_mountain_points(w, h, roughness, iterations);

    for (let i = 0; i < p.length - 1; i++) {
      for (let xi = p[i].x + x; xi < p[i + 1].x + x; xi++) {
        let yi = Math.floor(
            ((p[i + 1].y - p[i].y) / (p[i + 1].x - p[i].x)) *
                    (xi - p[i].x - x) +
                p[i].y + y,
        );
        let yi2 = Math.round(h + y - (h + y - yi) ** (0.8));
        let yi3 = Math.round(h + y);
        ctx.fillStyle = color;
        ctx.fillRect(xi, yi, 1, yi3 - yi2);
        ctx.fillStyle = shading_color;
        ctx.fillRect(xi, yi2, 1, yi3 - yi2);
      }
    }
  }

  // 生成山脉点的函数（中点位移算法）
  // w: 山脉宽度
  // h: 山脉高度
  // roughness: 粗糙度（0到1之间）
  // iterations: 迭代次数（决定细节层次）
  // 返回: 山脉点数组 [{x, y}, ...]
  #generate_mountain_points(w, h, roughness, iterations) {
    // 设置点数组
    let points = [
      {x : 0, y : h},
      {x : w / 2, y : h * 0.2},
      {x : w, y : h},
    ];

    // 迭代生成山脉点
    for (let i = 0; i < iterations; i++) {
      const newPoints = [ points[0] ];
      const displacement = h * Math.pow(roughness, i);

      for (let j = 0; j < points.length - 1; j++) {
        const left = points[j];
        const right = points[j + 1];

        // 计算中点
        const midX = (left.x + right.x) / 2;
        const midY = (left.y + right.y) / 2;

        // 添加随机位移
        const newY = midY + (Math.random() * 2 - 1) * displacement;

        newPoints.push({x : midX, y : newY});
        newPoints.push(right);
      }

      points = newPoints;
    }
    return points.map((point) => ({
                        x : Math.round(point.x),
                        y : Math.round(point.y),
                      }));
  }
}
