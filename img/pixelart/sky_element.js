const CLOUD_CANVAS_SIZE = [ 80, 40 ];
const METEOR_LIFE_LEN = 30;

// 返回一个星星 draw a star on foreground
function createStar() {
  const star = document.createElement("div");
  star.classList.add("star");

  const max_y = GRID_HEIGHT / 2;
  const max_x = calculateGridWidth();

  // 生成随机位置
  const x = Math.ceil(Math.random() * max_x) * pixelSize;
  const y = Math.ceil(Math.random() * max_y) * pixelSize;
  star.style.right = `${x}px`;
  star.style.top = `${y}px`;
  star.style.width = `${pixelSize}px`;
  star.style.height = `${pixelSize}px`;
  // 随机透明度
  star.style.backgroundColor = `rgba(255,255,255,${Math.random() * 0.5 + 0.5})`;

  // 生成不同的动画时长
  const duration = Math.random() * 1.5 + 0.5; // 0.5s 到 2s
  star.style.animationDuration = `${duration}s`;

  return star;
}

// 生成流星
// w: 可用的总宽度
// 返回一个流星 div
function generateMeteor(w, pixelSize) {
  /**
   * 返回流星颜色的函数 (保持不变)
   */
  function meteor_colors_a(index) {
    return ((c) => `rgba(${c[0]},${c[1]},${c[2]},${c[3]})`)(
        index === 0
            ? [ 255, 255, 11, 1 ]
            : [ 255, 255, 255, (METEOR_LIFE_LEN - index) / METEOR_LIFE_LEN ],
    );
  }

  /**
   * [已优化] 创建流星的一节 (仅创建DOM，不再处理动画)
   * life: 这是流星的第几节, 0是头
   * return: 一个流星方块 <div>
   */
  function create_meteor_part(life) {
    const mp = document.createElement("div");
    mp.style.width = `${pixelSize}px`;
    mp.style.height = `${pixelSize}px`;
    mp.style.position = "absolute";
    mp.style.backgroundColor = meteor_colors_a(life);
    // 使用 dataset 存储 life 值，方便主循环读取
    mp.dataset.life = life;
    return mp;
  }

  // --- 主逻辑 ---

  // 创建流星的父容器
  const m = document.createElement("div");
  m.style.position = "absolute"; // 容器本身不需要定位，它的子元素是绝对定位
  m.style.right = "0px";
  m.style.top = "0px";

  // 初始化流星的属性
  const pos =
      [ Math.round(w * Math.random()), -Math.ceil(Math.random() * 200) ];
  const k = Math.ceil(Math.random() * 4) || 1; // 确保 k 不为 0
  const delay_time = randomNormal(25, 10);

  // 循环创建流星的所有“节”，并添加到父容器中
  for (let i = 0; i < METEOR_LIFE_LEN; i++) {
    m.appendChild(create_meteor_part(i));
  }

  // --- 单一动画循环 ---
  let animationFrameId;
  let pass_time = 0;      // 动画“时间”或“帧数”计数器
  let lastUpdateTime = 0; // 上一次更新位置的时间戳

  function moveMeteorAnimation(timestamp) {
    if (!m.isConnected) {
      cancelAnimationFrame(animationFrameId);
      return;
    }

    // 确保第一次渲染或达到延迟时间后才更新
    const elapsed = timestamp - lastUpdateTime;
    if (lastUpdateTime === 0 || elapsed >= delay_time && !isPaused) {

      let visiblePartsCount = 0;
      // 反向遍历所有"节"来更新它们的位置（避免live
      // HTMLCollection删除时跳过元素）
      const children = m.children;
      for (let idx = children.length - 1; idx >= 0; idx--) {
        const mp = children[idx];
        const life = parseInt(mp.dataset.life, 10);

        const y = pixelSize * (pos[1] - life + pass_time);

        // 如果"节"已经超出屏幕下方，则直接移除
        if (y > window.innerHeight) {
          mp.remove();
        } else {
          // 否则，计算并更新它的位置
          const x = pixelSize * Math.floor(pos[0] + (-life + pass_time) / k);
          mp.style.right = x + "px";
          mp.style.top = y + "px";
          visiblePartsCount++;
        }
      }

      // 如果所有“节”都已被移除，则停止动画并清理父容器
      if (visiblePartsCount === 0) {
        cancelAnimationFrame(animationFrameId);
        m.remove();
        return; // 提前退出，不再请求下一帧
      }

      pass_time++;
      lastUpdateTime = timestamp;
    }

    // 请求下一帧动画
    animationFrameId = requestAnimationFrame(moveMeteorAnimation);
  }

  if (k >= 1) {
    // 启动这个流星的唯一动画循环
    animationFrameId = requestAnimationFrame(moveMeteorAnimation);
  } else {
    console.log("这个情况懒得做了，而且你不应该看到这条信息");
    // 如果不处理，这个空的div容器可能会留在DOM中，最好也移除
    m.remove();
    return null; // 或者返回一个空对象，避免调用者出错
  }

  return m;
}
function generateMeteor_old(w) {
  function meteor_colors_a(index) {
    return ((c) => `rgba(${c[0]},${c[1]},${c[2]},${c[3]})`)(
        index === 0
            ? [ 255, 255, 11, 1 ]
            : [ 255, 255, 255, (METEOR_LIFE_LEN - index) / METEOR_LIFE_LEN ],
    );
  }
  /*
   * 流星：在指定位置(pos)创建一个div,然后开始移动,需要多创建几个才有效果
   * k: 直线的斜率
   * delay_time : 隔多久移动一次(ms)
   * life 这是流星的第几节,0是头
   * return: 一个流星方块<div>
   */
  function meteor_part(pos, delay_time, k, life) {
    const mp = document.createElement("div");

    mp.style.width = `${pixelSize}px`;
    mp.style.height = `${pixelSize}px`;
    mp.style.position = "absolute";
    mp.style.backgroundColor = meteor_colors_a(life);

    if (k >= 1) {
      // 初始化动画所需变量
      let animationFrameId;
      let pass_time = 0;      // 动画“时间”或“帧数”计数器
      let lastUpdateTime = 0; // 上一次更新位置的时间戳

      function moveElementAnimation(timestamp) {
        const elapsed = timestamp - lastUpdateTime;
        if (elapsed >= delay_time && !isPaused) {
          let y = pixelSize * (pos[1] - life + pass_time);
          if (y > window.innerHeight) {
            mp.remove(); // 超出屏幕后删除
            return;
          }
          let x = pixelSize * Math.floor(pos[0] + (-life + pass_time) / k);
          mp.style.right = x + "px";
          mp.style.top = y + "px";
          pass_time++;
          lastUpdateTime = timestamp;
        }
        animationFrameId = requestAnimationFrame(moveElementAnimation);
      }
      // 启动动画
      animationFrameId = requestAnimationFrame(moveElementAnimation);
    } else {
      console.log("这个情况懒得做了");
    }
    return mp;
  }

  const m = document.createElement("div");
  m.style.right = m.style.top = "0px";
  m.style.position = "absolute";
  let pos = [ Math.round(w * Math.random()), -Math.ceil(Math.random() * 200) ];
  // let direct = [1, Math.ceil(Math.random() * 4)];
  let k = Math.ceil(Math.random() * 4);
  let time = randomNormal(25, 10);
  for (let i = 0; i < METEOR_LIFE_LEN; i++) {
    m.appendChild(meteor_part(pos, time, k, i));
  }
  // 超出屏幕后移除包裹流星的 div
  let interval = setInterval(() => {
    if (m.children.length === 0) {
      clearInterval(interval);
      m.remove();
    }
  }, time * METEOR_LIFE_LEN);
  return m;
}

// 在页面上放云，参数为云的位置
function generateClouds(init_x, init_y) {

  function generateSpheres(numSpheres) {
    const spheres = [];
    const centerMean = [ 0, 0, 7 ];
    const centerStdDev = [ 10, 3, 1.5 ];
    var radiusMean = 7;
    var radiusStdDev = 2;

    const cview = CLOUD_CANVAS_SIZE.map((item) => item / 2);

    for (let i = 0; i < numSpheres; i++) {
      const center = [
        Math.round(randomNormal(centerMean[0], centerStdDev[0])) + cview[0],
        Math.round(randomNormal(centerMean[1], centerStdDev[1])) + cview[1],
        Math.round(randomNormal(centerMean[2], centerStdDev[2])),
      ];
      const radius = Math.abs(
          Math.round(
              randomNormal(
                  radiusMean *
                      Math.max(0, 1 - 0.03 * Math.abs(center[0] - cview[0])),
                  radiusStdDev *
                      Math.max(0, 1 - 0.4 * Math.abs(center[1] - cview[1])),
                  ),
              ),
      );
      spheres.push({center, radius});
    }
    return spheres;
  }
  // 返回一个 云 canvas
  function createCloud() {
    // 获取 Canvas 上下文
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.style.zoom = 10;

    // 画布尺寸
    const width = CLOUD_CANVAS_SIZE[0];
    const height = CLOUD_CANVAS_SIZE[1];
    canvas.width = width;
    canvas.height = height;

    // 方向光源
    const lightDir = normalize([ -1, -4, 2 ]);

    // 初始化像素缓冲区和深度缓冲区（Z-Buffer）
    const image = new Float32Array(width * height).fill(0); // 存储光照值
    const zBuffer =
        new Float32Array(width * height).fill(-Infinity); // 记录深度
    const visibility =
        new Uint8Array(width * height).fill(0); // 记录像素是否有物体

    // 定义多个球的参数
    var spheres = generateSpheres(20);

    // 遍历所有球
    for (let sphere of spheres) {
      let [cx, cy, cz] = sphere.center;
      let radius = sphere.radius;

      // 遍历像素
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let dx = x - cx, dy = y - cy;
          if (
              dx * dx + dy * dy <= radius * radius && // 小于半径
              Math.max(Math.abs(dx), Math.abs(dy)) <=
                  radius - 1 / 2 // 小于半径-1/2的正方形，裁掉突出像素
          ) {
            let dz = Math.sqrt(radius * radius - dx * dx - dy * dy);
            let z = cz + dz;

            let index = y * width + x;

            // 深度测试：只绘制更近的像素
            if (z > zBuffer[index]) {
              zBuffer[index] = z;

              // 计算球面法向量
              let normal = normalize([ dx, dy, dz ]);

              // Lambertian 光照计算
              let intensity = Math.max(0, dot(normal, lightDir));
              // let intensity = dot(normal, lightDir);

              // 存入像素数组
              image[index] = intensity;
              visibility[index] = 1; // 标记此像素有物体
            }
          }
        }
      }
    }

    // 绘制到 Canvas
    const imgData = ctx.createImageData(width, height);

    // 预定义的各个面颜色
    const cloudColor = {
      0 : colorMultiply(
          interpolate_time_color(currentHour, skyColorDict[0]),
          [ 200, 200, 200 ],
          ),
      2 : interpolate_time_color(currentHour, lightColorDict),
      4 : [ 255, 255, 255 ],
    };
    for (let i = 0; i < width * height; i++) {
      if (visibility[i] === 1) {
        // let intensity = Math.round(image[i] * 4); // 0 - 4
        let intensity = image[i] < 0.05  ? 0
                        : image[i] < 0.4 ? 1
                        : image[i] < 0.6 ? 2
                        : image[i] < 0.9 ? 3
                                         : 4;
        let c = intensity % 2 === 0 ? cloudColor[intensity]
                : width % 2 === 1
                    ? cloudColor[intensity + (i % 2) * 2 - 1]
                    : cloudColor[intensity +
                                 ((i + Math.ceil(i / width)) % 2) * 2 - 1];
        imgData.data[i * 4] = c[0];     // R
        imgData.data[i * 4 + 1] = c[1]; // G
        imgData.data[i * 4 + 2] = c[2]; // B
        imgData.data[i * 4 + 3] = 255;
      } else {
        imgData.data[i * 4] = 0;
        imgData.data[i * 4 + 1] = 0;
        imgData.data[i * 4 + 2] = 0;
        imgData.data[i * 4 + 3] = 0; // 透明
      }
    }
    ctx.putImageData(imgData, 0, 0);

    return canvas;
  }

  const cloud = createCloud();
  cloud.style.zoom = pixelSize;

  // 随机起始高度
  cloud.style.position = "absolute";
  cloud.style.top = init_y + "px";
  cloud.style.right = init_x + "px";

  let speed = 1; // 每次移动的距离

  // 初始化动画所需变量
  let animationFrameId;
  let lastMoveTime = 0;                        // 上一次移动的时间戳
  let nextMoveDelay = randomNormal(3000, 600); // 第一次移动的延迟时间

  // rAF 动画循环函数
  function cloudAnimation(timestamp) {
    if (!cloud.isConnected) {
      cancelAnimationFrame(animationFrameId);
      return;
    }

    // timestamp 是由 requestAnimationFrame 自动传入的高精度时间戳

    // 1. 时间判断逻辑
    // 检查自上次移动以来经过的时间是否超过了随机生成的延迟时间
    if (timestamp - lastMoveTime > nextMoveDelay) {

      // 2. 更新位置（与原逻辑相同）
      let currentX = parseFloat(cloud.style.right) || 0; // 初始值为0，防止NaN
      cloud.style.right = currentX - speed + "px";

      // 更新“上次移动时间”
      lastMoveTime = timestamp;
      // 生成下一次移动需要等待的随机延迟时间
      nextMoveDelay = randomNormal(3000, 600);

      // 3. 边界判断和停止动画（与原逻辑相同）
      if (currentX < -CLOUD_CANVAS_SIZE[0]) {
        cloud.remove(); // 超出屏幕后删除
        return;         // 关键：一旦元素被移除，就停止后续的rAF请求
      }
    }
    // 4. 请求下一帧动画
    animationFrameId = requestAnimationFrame(cloudAnimation);
  }

  // 启动动画
  animationFrameId = requestAnimationFrame(cloudAnimation);

  // 如果需要手动停止动画，可以调用 cancelAnimationFrame(animationFrameId);
  return cloud;
}

function draw_background_sky(w, h, pixelSize) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(w, h);

  canvas.width = w;
  canvas.height = h;
  canvas.style.position = "absolute";
  canvas.style.right = "0px";
  canvas.style.top = `0px`;
  canvas.style.zoom = pixelSize;

  const th = (6 - Math.abs(6 - (currentHour % 12))) / 6;
  const y0 = (11 / 24 * h - 6 * w * w / h / 5) * (th * 0.75 + 0.25);
  const r1 = h / 2 - y0;
  const r2 = h * 4 / 5 - y0;
  const sw = 10; // 渐变宽度
  const pow = (x) => x * x;
  const bgcolors = skyColorDict.map(
      (colors) => interpolate_time_color(currentHour, colors),
  );
  const d2 = [
    0,
    r1 - 2 * sw,
    r1 - sw,
    r1,
    r1 + sw,
    r2 - 2 * sw,
    r2 - sw,
    r2,
    r2 + sw,
  ].map(pow);

  const edges = Array(d2.length).fill(null).map(
      (_, i) => Array(h).fill(null).map(
          (_, y) => Math.max(
              0,
              Math.min(
                  w - 1,
                  Math.floor(
                      ((x) => (x > 0 ? Math.sqrt(x) : 0))(d2[i] - pow(y - y0)),
                      ),
                  ),
              ),
          ));
  edges.push(Array(h).fill(w));

  const data = imageData.data;
  const rColors = bgcolors.map(c => c[0]);
  const gColors = bgcolors.map(c => c[1]);
  const bColors = bgcolors.map(c => c[2]);

  for (let y = 0; y < h; y++) {
    const rowOffset = y * w * 4; // 缓存行偏移量

    for (let i = 0; i < edges.length - 1; i++) {
      const startX = edges[i][y];
      const endX = edges[i + 1][y];
      if (startX >= endX)
        continue; // 空区间直接跳过

      const j = i >> 2;   // 代替 Math.floor(i / 4)
      const type = i & 3; // 代替 i % 4

      let index = rowOffset + startX * 4;

      for (let x = startX; x < endX; x++) {
        let cond = false;
        if (type === 1) {
          const sum = x + y;
          cond = (sum & 3) === 0 || ((sum & 3) === 2 && (x & 1) === 1);
        } else if (type === 2) {
          cond = ((x + y) & 1) === 0;
        } else if (type === 3) {
          const sum = x + y;
          cond = !((sum & 3) === 0 || ((sum & 3) === 2 && (x & 1) === 1));
        } // type === 0 时 cond 默认为 false

        data[index] = cond ? rColors[j + 1] : rColors[j];
        data[index + 1] = cond ? gColors[j + 1] : gColors[j];
        data[index + 2] = cond ? bColors[j + 1] : bColors[j];
        data[index + 3] = 255;
        index += 4;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

// 创建的圆的数组太大了，可以达到数千大小。
// 先不用了
function draw_background_sky_new(w, h, pixelSize) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.style.position = "absolute";
  canvas.style.right = "0px";
  canvas.style.top = `0px`;
  canvas.style.zoom = pixelSize;

  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(w, h);

  const th = (6 - Math.abs(6 - (currentHour % 12))) / 6;
  const y0 = 11 / 24 * h - 6 * w * w / h / 5;
  // const xc = th <= 0.5 ? 2 * th * w + (1 - 2 * th) * w * 2 / 3 : w;
  const xc = th <= 0.5 ? 2 * th * w + (1 - 2 * th) * w * 7 / 8 : w;
  const yc = (1 - th) * h + th * y0;
  const rb1 = w / 4;
  const rb2 = w / 2;
  const re1 = h / 6 - y0;
  const re2 = h / 2 - y0;
  const r1 = rb1 + th * (re1 - rb1);
  const r2 = rb2 + th * (re2 - rb2);
  const r0 = Math.max(20 - 100 * th, 4);
  const sw = 2;
  const gw = 10;

  const bgcolors = skyColorDict.map(
      (colors) => interpolate_time_color(currentHour, colors),
  );
  // const sunColors = [ [ 255, 250, 245 ], [ 255, 160, 80 ] ];
  // bgcolors[0] = colorAverage(bgcolors[0], sunColors[2]);
  // const colors = sunColors.concat(bgcolors);
  const colors = bgcolors;

  const squ = x => x * x;
  const sqr = Math.sqrt;

  const circleCoords = (rad) => {
    // 给定一个整数半径，返回圆心在原点的一个圆右边的整数近似坐标集合，
    // 一个[[x1, x2, ...], [y1, y2, ...]] 包含上下两个端点
    // 通过对称性完成。
    // 有时候会在对角生成重复的点但我们不管它
    if (rad <= 0)
      return [ [], [] ];
    const x0 = Math.round(rad * 0.7071067811865475);
    const ys1 = Array(x0).fill(null).map((_, i) => i + 1);
    const xs1 = ys1.map((v) => Math.round(sqr(squ(rad) - squ(v))));
    const xsp = xs1.concat(ys1);
    const ysp = ys1.concat(xs1);
    const xs = xsp.concat(xsp).concat([ 0, 0, rad ]);
    const ys = ysp.concat(ysp.map((y) => -y)).concat([ rad, -rad, 0 ]);
    return [ xs, ys ];
  };
  const xcr = Math.round(xc);
  const ycr = Math.round(yc);
  const shiftToCenter =
      (coords) => [coords[0].map(v => v + xcr), coords[1].map(v => v + ycr)];
  const rearrangeCoords = (coords) => {
    // 给定一些坐标（这里是圆）集合，
    // 返回一个数组，索引是y高度，值是此时的x。
    // x 会被限制
    const clip = x => Math.min(Math.max(x, 0), w - 1);
    const ps = Array(h).fill(-1);
    for (let i = 0; i < coords[1].length; i++) {
      const cy = coords[1][i];
      if (0 <= cy && cy < h)
        ps[cy] = clip(coords[0][i]);
    }
    return ps;
  };
  const radii = [
    // r0 - sw, r0, r0 + sw, r0 + 2 * sw,
    r1 - 2 * gw, r1 - gw, r1, r1 + gw, r2 - 2 * gw, r2 - gw, r2, r2 + gw
  ].map(Math.round);
  const clr = [
    // 0, 0, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4
    0, 0, 0, 0, 1, 1, 1, 1, 2
  ];
  const typ = [
    // 0, 2, 0, 2,
    0, 1, 2, 3, 0, 1, 2, 3, 0
  ];
  const edgesL = radii.map(circleCoords)
                     .map(a1 => [a1[0].map(v => -v), a1[1]])
                     .map(shiftToCenter)
                     .map(rearrangeCoords);
  const edgesR =
      radii.map(circleCoords).map(shiftToCenter).map(rearrangeCoords);
  // 复用单行缓冲区
  const rowZones = new Int8Array(w);
  const data = imageData.data;
  let pixelPtr = 0;
  for (let y = 0; y < h; y++) {
    rowZones.fill(radii.length);

    // 从大圆到小圆覆盖式写入当前行的区间
    for (let i = radii.length - 1; i >= 0; i--) {
      const left = edgesL[i][y];
      const right = edgesR[i][y];
      // 如果该圆在当前行存在
      if (left !== -1 && right !== -1)
        for (let x = left; x <= right; x++)
          rowZones[x] = i;
    }
    for (let x = w - 1; x >= 0; x--) {
      const idx = rowZones[x];
      let dither = false; // case 0: 纯色，不抖动
      switch (typ[idx]) {
      case 1: // 25% 密度网格
        dither = (x + y) % 4 === 0 || ((x + y) % 4 === 2 && x % 2 === 1);
        break;
      case 2: // 50% 密度交错
        dither = (x + y) % 2 === 0;
        break;
      case 3: // 75% 密度网格（和 case 1 取反）
        dither = !((x + y) % 4 === 0 || ((x + y) % 4 === 2 && x % 2 === 1));
        break;
      }
      const color = colors[clr[idx] + (dither ? 1 : 0)];
      data[pixelPtr++] = color[0]; // R
      data[pixelPtr++] = color[1]; // G
      data[pixelPtr++] = color[2]; // B
      data[pixelPtr++] = 255;      // A
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
