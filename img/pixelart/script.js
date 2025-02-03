// 定义常量
const GRID_HEIGHT = 180; // 网格高度（像素单位）
const RECT_WIDTH_MULTIPLIER = 2; // 矩形宽度倍数

var pixelSize;
var currentHour;
var isNight = false;

// https://stackoverflow.com/questions/8022885/rgb-to-hsv-color-in-javascript
// input: r,g,b in [0,1], out: h in [0,360) and s,v in [0,1]
function rgb2hsv(r, g, b) {
  let v = Math.max(r, g, b),
    c = v - Math.min(r, g, b);
  let h =
    c && (v == r ? (g - b) / c : v == g ? 2 + (b - r) / c : 4 + (r - g) / c);
  return [60 * (h < 0 ? h + 6 : h), v && c / v, v];
}
// input: h in [0,360] and s,v in [0,1] output rgb() color// - output: r,g,b in [0,1]
function hsv2rgb(h, s, v) {
  let f = (n, k = (n + h / 60) % 6) =>
    v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  return [f(5) * 255, f(3) * 255, f(1) * 255];
}

// 将 #FFFFFF 形式的颜色转换为 [r, g, b] （0-255） 形式
function hex2rgb(hex) {
  // 确保输入是标准格式
  hex = hex.replace(/^#/, "");

  // 解析 RGB 分量
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  return [r, g, b];
}
// 反过来
function rgb2hex(r, g, b) {
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()}`;
}

function getDecimalHour() {
  const now = new Date();
  const hours = now.getHours(); // 获取当前小时 (0-23)
  const minutes = now.getMinutes(); // 获取当前分钟 (0-59)

  return hours + minutes / 60; // 转换为小时的小数
}

// sky预定义颜色列表, hsv，每个列表对应一个时间：颜色（三个列表颜色是高空到地面）
const skyColorDict = [
  // 第一层（高空）
  {
    // 午夜到凌晨
    0: [220, 0.9, 0.05], // 深夜：几乎接近黑
    4: [220, 0.8, 0.1], // 黎明前：稍微亮一点
    // 日出过程
    6: [210, 0.6, 0.4], // 日出前后：深蓝中带些亮度
    8: [200, 0.5, 0.7], // 清晨：已逐渐变亮
    // 正午
    12: [200, 0.3, 1.0], // 正午：非常明亮的蓝
    // 下午
    16: [210, 0.4, 0.85], // 下午：稍微减弱饱和度，偏柔和
    // 黄昏至傍晚
    17.5: [200, 0.5, 0.87],
    18: [25, 0.7, 0.9], // 黄昏：偏暖橙色调
    20: [280, 0.6, 0.5], // 傍晚转夜：天空逐渐带点紫调
    // 深夜
    22: [220, 0.8, 0.1], // 夜晚：逐渐变暗
    24: [220, 0.9, 0.05], // 回到深夜
  },
  // 第二层（中空）
  {
    0: [220, 0.8, 0.08],
    4: [220, 0.7, 0.15],
    6: [210, 0.5, 0.45],
    8: [200, 0.4, 0.75],
    12: [190, 0.25, 1.0],
    16: [200, 0.35, 0.9],
    17.5: [190, 0.35, 0.9],
    18: [30, 0.6, 0.95],
    20: [280, 0.5, 0.55],
    22: [220, 0.7, 0.15],
    24: [220, 0.8, 0.08],
  },
  // 第三层（近地面）
  {
    0: [220, 0.7, 0.1],
    4: [220, 0.6, 0.2],
    6: [210, 0.4, 0.5],
    8: [190, 0.3, 0.8],
    12: [180, 0.2, 1.0],
    16: [190, 0.25, 0.95],
    17.5: [190, 0.4, 0.9],
    18: [35, 0.6, 0.9],
    20: [280, 0.4, 0.6],
    22: [220, 0.6, 0.2],
    24: [220, 0.7, 0.1],
  },
];
const lightColorDict = {
  0: [220, 0.35, 0.91], // 深夜：冷色调、低亮度
  5: [210, 0.22, 0.93], // 破晓：蓝调减少，亮度上升
  6: [200, 0.2, 0.94], // 日出前：冷色微暖
  7: [190, 0.17, 0.955], // 日出：蓝黄过渡
  8: [180, 0.15, 0.97], // 早晨：中性色
  9: [160, 0.12, 0.98], // 太阳升高：冷色减少
  11: [120, 0.07, 0.99], // 接近正午：接近白光
  12: [100, 0.05, 1.0], // 正午：最亮、接近白光
  17: [180, 0.15, 0.97], // 太阳开始变暖
  18: [190, 0.2, 0.96], // 夕阳开始
  21: [220, 0.3, 0.93], // 变冷，亮度降低
  24: [220, 0.35, 0.91], // 回到深夜
};

// params：时间（小时）
// return: 颜色
function interpolate_time_color(hour, colorDict) {
  if (hour < 0 || hour > 24) {
    throw new Error("hour out of range. Must be between 0 and 24.");
  }

  const keys = Object.keys(colorDict).map(Number);
  let lowerKey = Math.max(...keys.filter((k) => k <= hour));
  let upperKey = Math.min(...keys.filter((k) => k >= hour));

  if (lowerKey === upperKey) return hsv2rgb(...colorDict[lowerKey]);

  let interpolatedColors = interpolateHSV(
    colorDict[lowerKey],
    colorDict[upperKey],
    (hour - lowerKey) / (upperKey - lowerKey),
  );

  return hsv2rgb(...interpolatedColors);
}

// HSV 插值计算，考虑色相环
function interpolateHSV(hsv1, hsv2, t) {
  let [h1, s1, v1] = hsv1;
  let [h2, s2, v2] = hsv2;
  if (Math.abs(h1 - h2) > 180) {
    if (h1 > h2) h2 += 360;
    else h1 += 360;
  }
  let h = (h1 + t * (h2 - h1)) % 360;
  let s = s1 + t * (s2 - s1);
  let v = v1 + t * (v2 - v1);
  return [h, s, v];
}

// 两个颜色相乘，
// 输入输出：rgb [r,g,b] (0-255) 形式颜色
function colorMultiply(c1, c2) {
  return [
    Math.ceil((c1[0] * c2[0]) / 255),
    Math.ceil((c1[1] * c2[1]) / 255),
    Math.ceil((c1[2] * c2[2]) / 255),
  ];
}

// 计算网格宽度 x (像素图大小的宽)
function calculateGridWidth(h = window.innerHeight, w = window.innerWidth) {
  return Math.ceil((GRID_HEIGHT / h) * w);
}

// 计算像素单位大小
function calculatePixelSize(h = window.innerHeight) {
  const screenHeight = h;
  return screenHeight / GRID_HEIGHT; // 每个像素单位的大小
}

// 清空容器
function clearContainer(container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

// 创建矩形
function createRectangle(width, height, color, offset = 0) {
  const rect = document.createElement("div");
  rect.style.position = "absolute";

  rect.style.width = `${width * pixelSize}px`;
  rect.style.height = `${height * pixelSize}px`;
  rect.style.backgroundColor = color;
  rect.style.top = `${offset * pixelSize}px`;
  rect.style.right = "0"; // 右对齐
  return rect;
}

// 创建棋盘格（直接绘制像素方格）
function createCheckerboard(width, height, color, offset, type = 1) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;
  canvas.style.position = "absolute";
  canvas.style.right = "0px";
  canvas.style.top = `${offset}px`;
  canvas.style.zoom = pixelSize;

  // type:
  // 0: 1/4棋盘格
  // 1: 标准棋盘格
  // 2: 3/4棋盘格
  const decisionfunction = [
    (x, y) => (x + y) % 4 === 0 || ((x + y) % 4 === 2 && x % 2 === 1),
    (x, y) => (x + y) % 2 === 0,
    (x, y) => !((x + y) % 4 === 0 || ((x + y) % 4 === 2 && x % 2 === 1)),
  ];

  ctx.fillStyle = color;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (decisionfunction[type](x, y)) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  return canvas;
}

// 使用canvas 放置像素图,像素矩阵由img2js.py生成
function createPixelMatrix(startX, startY, matrix) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  var w = 0;
  matrix[0].forEach((e) => {
    w += Array.isArray(e) ? e[1] : 1;
  });
  canvas.width = w;
  canvas.height = matrix.length;
  canvas.style.position = "absolute";
  canvas.style.top = `${startY}px`;
  canvas.style.right = `${startX}px`;
  canvas.style.zoom = pixelSize;

  for (let j = 0; j < matrix.length; j++) {
    let colIndex = 0;
    for (let i = 0; i < matrix[j].length; i++) {
      const light_color = interpolate_time_color(currentHour, lightColorDict);
      const color = Array.isArray(matrix[j][i])
        ? [colorList[matrix[j][i][0]], matrix[j][i][1]]
        : [colorList[matrix[j][i]], 1];
      // 光线影响
      const adjustedColor = color[0].startsWith("#")
        ? rgb2hex(...colorMultiply(hex2rgb(color[0]), light_color))
        : color[0];
      ctx.fillStyle = adjustedColor;
      ctx.fillRect(colIndex, j, color[1], 1);
      colIndex += color[1];
    }
  }
  return canvas;
}

// 初始化
function imgInit(h = window.innerHeight, time = getDecimalHour()) {
  // 获取背景和前景容器
  const background = document.getElementById("pixel-art-background");
  const foreground = document.getElementById("pixel-art-foreground");

  currentHour = time;
  // 像素大小
  pixelSize = Math.ceil(calculatePixelSize(h));

  // 横向像素宽度
  const x = calculateGridWidth(h);
  // 清空背景容器
  clearContainer(background);
  // 清空前景容器
  clearContainer(foreground);
  background.style.height = `${h}px`;
  foreground.style.height = `${h}px`;

  // 计算三个背景颜色
  bgcolors = skyColorDict.map((color) =>
    rgb2hex(...interpolate_time_color(currentHour, color)),
  );
  // 设置背景宽度
  background.style.width = `${x * pixelSize}px`;

  // 填充三个大背景矩形
  const rect = [
    createRectangle(x, 100, bgcolors[0], 0),
    createRectangle(x, 100, bgcolors[1], 90),
    createRectangle(x, 100, bgcolors[2], 150),
  ];
  rect.forEach((element) => {
    background.appendChild(element);
  });
  background.style.backgroundColor = bgcolors[2];

  // 填充过渡棋盘格纹路
  const checkerboard = [
    createCheckerboard(x, 10, bgcolors[1], 60, 0),
    createCheckerboard(x, 10, bgcolors[1], 70, 1),
    createCheckerboard(x, 10, bgcolors[1], 80, 2),
    createCheckerboard(x, 10, bgcolors[2], 120, 0),
    createCheckerboard(x, 10, bgcolors[2], 130, 1),
    createCheckerboard(x, 10, bgcolors[2], 140, 2),
  ];
  checkerboard.forEach((element) => {
    background.appendChild(element);
  });

  // 如果是晚上就生成多个星星
  if (currentHour > 19 || currentHour < 5) {
    isNight = true;

    // 星星
    let ss = document.createElement("div");
    ss.style.right = ss.style.top = '0px';
    ss.style.position = "absolute";
    for (let i = 0; i < 42; i++) ss.appendChild(createStar(h));
    foreground.appendChild(ss);

    // 生成流星
    // foreground.appendChild(generateMeteor(h));
  } else {
    // 白天就是云
    for (let i = 0; i < Math.floor(Math.random() * 10) + 3; i++) {
      let cloud = generateClouds(
        Math.round(Math.random() * x),
        Math.round((Math.random() * GRID_HEIGHT) / 2),
      );
      foreground.appendChild(cloud);
    }
    // 每 42 秒生成一朵云
    setInterval(() => {
      let cloud = generateClouds(
        x,
        -CLOUD_CANVAS_SIZE[1] + Math.round((Math.random() * GRID_HEIGHT) / 3),
      );
      foreground.appendChild(cloud);
    }, 42000);
    isNight = false;
  }

  // 把天子放出来 (原图高96)
  const mat = createPixelMatrix(0, Math.ceil(h / pixelSize) - 96, imgMatrix);
  foreground.appendChild(mat);
}

// 监听窗口大小变化
//window.addEventListener("resize", init);

// 初始化页面
// imgInit();
