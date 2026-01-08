// 定义常量
const GRID_HEIGHT = 180;         // 网格高度（像素单位）
const RECT_WIDTH_MULTIPLIER = 2; // 矩形宽度倍数

// sky预定义颜色列表,
// hsv，每个列表对应一个时间：颜色（三个列表颜色是高空到地面）
const skyColorDict = [
  // 第一层（高空）
  {
    // 午夜到凌晨
    0 : [ 220, 0.9, 0.05 ],  // 深夜：几乎接近黑
    4 : [ 220, 0.8, 0.1 ],   // 黎明前：稍微亮一点
                             // 日出过程
    6 : [ 210, 0.6, 0.4 ],   // 日出前后：深蓝中带些亮度
    8 : [ 200, 0.5, 0.7 ],   // 清晨：已逐渐变亮
                             // 正午
    12 : [ 200, 0.3, 1.0 ],  // 正午：非常明亮的蓝
                             // 下午
    16 : [ 210, 0.4, 0.85 ], // 下午：稍微减弱饱和度，偏柔和
                             // 黄昏至傍晚
    17.5 : [ 210, 0.5, 0.87 ],
    18 : [ 25, 0.7, 0.9 ], // 黄昏：偏暖橙色调
    19 : [ 300, 0.5, 0.5 ],
    20 : [ 280, 0.6, 0.4 ],  // 傍晚转夜：天空逐渐带点紫调
                             // 深夜
    22 : [ 220, 0.8, 0.1 ],  // 夜晚：逐渐变暗
    24 : [ 220, 0.9, 0.05 ], // 回到深夜
  },
  // 第二层（中空）
  {
    0 : [ 220, 0.8, 0.08 ],
    4 : [ 220, 0.7, 0.15 ],
    6 : [ 210, 0.5, 0.45 ],
    8 : [ 200, 0.4, 0.75 ],
    12 : [ 190, 0.25, 1.0 ],
    16 : [ 200, 0.35, 0.9 ],
    17.5 : [ 220, 0.35, 0.9 ],
    18 : [ 30, 0.6, 0.95 ],
    19 : [ 290, 0.5, 0.45 ],
    20 : [ 280, 0.5, 0.55 ],
    22 : [ 220, 0.7, 0.15 ],
    24 : [ 220, 0.8, 0.08 ],
  },
  // 第三层（近地面）
  {
    0 : [ 220, 0.7, 0.1 ],
    4 : [ 220, 0.6, 0.2 ],
    6 : [ 210, 0.4, 0.5 ],
    8 : [ 190, 0.3, 0.8 ],
    12 : [ 180, 0.2, 1.0 ],
    16 : [ 190, 0.25, 0.95 ],
    17.5 : [ 220, 0.4, 0.9 ],
    18 : [ 35, 0.6, 0.9 ],
    19 : [ 290, 0.5, 0.5 ],
    20 : [ 280, 0.4, 0.6 ],
    22 : [ 220, 0.6, 0.2 ],
    24 : [ 220, 0.7, 0.1 ],
  },
];
const lightColorDict = {
  0 : [ 220, 0.35, 0.91 ],  // 深夜：冷色调、低亮度
  5 : [ 210, 0.22, 0.93 ],  // 破晓：蓝调减少，亮度上升
  6 : [ 200, 0.2, 0.94 ],   // 日出前：冷色微暖
  7 : [ 190, 0.17, 0.955 ], // 日出：蓝黄过渡
  8 : [ 180, 0.15, 0.97 ],  // 早晨：中性色
  9 : [ 160, 0.12, 0.98 ],  // 太阳升高：冷色减少
  11 : [ 120, 0.07, 0.99 ], // 接近正午：接近白光
  12 : [ 100, 0.05, 1.0 ],  // 正午：最亮、接近白光
  17 : [ 180, 0.15, 0.97 ], // 太阳开始变暖
  18 : [ 35, 0.15, 0.96 ],  // 夕阳开始
  19 : [ 200, 0.2, 0.94 ],  // 夕阳开始
  21 : [ 220, 0.3, 0.93 ],  // 变冷，亮度降低
  24 : [ 220, 0.35, 0.91 ], // 回到深夜
};

var is_first_img_init = true;
var pixelSize;
var currentHour;
var isNight = false;
var isPaused = false; // 全局暂停标志，
// 目前没有会使他变为true的代码

// https://stackoverflow.com/questions/8022885/rgb-to-hsv-color-in-javascript
// input: r,g,b in [0,1], out: h in [0,360) and s,v in [0,1]
function rgb2hsv(r, g, b) {
  let v = Math.max(r, g, b), c = v - Math.min(r, g, b);
  let h = c && (v == r   ? (g - b) / c
                : v == g ? 2 + (b - r) / c
                         : 4 + (r - g) / c);
  return [ 60 * (h < 0 ? h + 6 : h), v && c / v, v ];
}
// input: h in [0,360] and s,v in [0,1] output rgb() color// - output: r,g,b in
// [0,1]
function hsv2rgb(h, s, v) {
  let f = (n, k = (n + h / 60) % 6) =>
      v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  return [ f(5) * 255, f(3) * 255, f(1) * 255 ];
}

// 将 #FFFFFF 形式的颜色转换为 [r, g, b] （0-255） 形式
function hex2rgb(hex) {
  // 确保输入是标准格式
  hex = hex.replace(/^#/, "");

  // 解析 RGB 分量
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  return [ r, g, b ];
}
// 反过来
function rgb2hex(r, g, b) {
  return `#${
      ((1 << 24) | (r << 16) | (g << 8) | b)
          .toString(16)
          .slice(1)
          .toUpperCase()}`;
}

function getDecimalHour() {
  const now = new Date();
  const hours = now.getHours();     // 获取当前小时 (0-23)
  const minutes = now.getMinutes(); // 获取当前分钟 (0-59)

  return hours + minutes / 60; // 转换为小时的小数
}

// params：时间（小时）
// return: 颜色
function interpolate_time_color(hour, colorDict) {
  if (hour < 0 || hour > 24) {
    throw new Error("hour out of range. Must be between 0 and 24.");
  }

  const keys = Object.keys(colorDict).map(Number);
  let lowerKey = Math.max(...keys.filter((k) => k <= hour));
  let upperKey = Math.min(...keys.filter((k) => k >= hour));

  if (lowerKey === upperKey)
    return hsv2rgb(...colorDict[lowerKey]);

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
    if (h1 > h2)
      h2 += 360;
    else
      h1 += 360;
  }
  let h = (h1 + t * (h2 - h1)) % 360;
  let s = s1 + t * (s2 - s1);
  let v = v1 + t * (v2 - v1);
  return [ h, s, v ];
}

// 两个颜色相乘，
// 输入输出：rgb [r,g,b] (0-255) 形式颜色
function colorMultiply(c1 = [ 255, 255, 255 ], c2 = [ 255, 255, 255 ]) {
  return [
    Math.ceil((c1[0] * c2[0]) / 255),
    Math.ceil((c1[1] * c2[1]) / 255),
    Math.ceil((c1[2] * c2[2]) / 255),
  ];
}

// 两个颜色相乘，
// 输入输出：hex #FFFFFF 形式颜色
function colorMultiplyHex(c1, c2) {
  return rgb2hex(...colorMultiply(hex2rgb(c1), hex2rgb(c2)));
}

// 两个颜色平均值，
// 输入输出：rgb [r,g,b] 形式颜色
function colorAverage(c1 = [ 255, 255, 255 ], c2 = [ 255, 255, 255 ],
                      w1 = 0.5) {
  return [
    Math.ceil(c1[0] * w1 + c2[0] * (1 - w1)),
    Math.ceil(c1[1] * w1 + c2[1] * (1 - w1)),
    Math.ceil(c1[2] * w1 + c2[2] * (1 - w1)),
  ];
}

function colorAverageHex(c1, c2, w1 = 0.5) {
  return rgb2hex(...colorAverage(hex2rgb(c1), hex2rgb(c2), w1));
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

function randomNormal(mean = 0, stdDev = 1, avoidOutliers = true) {
  let u1 = Math.random();
  let u2 = Math.random();
  let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  if (avoidOutliers && Math.abs(z0) > 3) {
    return randomNormal(mean, stdDev);
  }
  return z0 * stdDev + mean;
}

// 向量归一化
function normalize(v) {
  let len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
  return v.map((c) => c / len);
}

// 向量点积
function dot(v1, v2) { return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]; }

// 初始化
async function imgInit(h = document.documentElement.clientHeight,
                       // time = getDecimalHour()
                       time = Math.random() * 24) {
  // 获取背景和前景容器
  const background = document.getElementById("pixel-art-background");
  const midground = document.getElementById("pixel-art-midground");
  const foreground = document.getElementById("pixel-art-foreground");
  // const container = document.getElementById("pixel-art");

  currentHour = time;
  // currentHour = 12;
  // 像素大小
  pixelSize = Math.ceil(calculatePixelSize(h));

  // 横向像素宽度
  const x = calculateGridWidth(h);
  // 纵向像素高度
  const bottom = Math.ceil(h / pixelSize);
  // 清空背景容器
  clearContainer(background);
  if (is_first_img_init)
    clearContainer(midground);
  clearContainer(foreground);
  background.style.height = `${h}px`;
  foreground.style.height = `${h}px`;

  // 计算三个背景颜色
  bgcolors = skyColorDict.map(
      (color) => rgb2hex(...interpolate_time_color(currentHour, color)),
  );
  // 设置背景宽度
  background.style.width = `${x * pixelSize}px`;

  // 创建背景
  background.appendChild(draw_background_sky(x, bottom, pixelSize));

  if (currentHour > 19 || currentHour < 5) {
    isNight = true;
  } else {
    isNight = false;
  }

  if (is_first_img_init) {
    if (isNight) {
      // 如果是晚上就生成多个星星
      // 星星
      let ss = document.createElement("div");
      ss.style.right = ss.style.top = "0px";
      ss.style.position = "absolute";
      for (let i = 0; i < 42; i++)
        ss.appendChild(createStar(h));
      midground.appendChild(ss);

      // 间隔生成流星
      midground.appendChild(generateMeteor(x, pixelSize));
      if (is_first_img_init)
        setInterval(() => {
          if (document.visibilityState !== "visible")
            return;
          midground.appendChild(generateMeteor(x, pixelSize));
        }, 7000);
    } else {
      // 白天就是云
      let num_clouds = Math.floor(Math.random() * 8) + 4;
      for (let i = 0; i < num_clouds; i++) {
        let cloud = generateClouds(
            Math.round(Math.random() * x),
            Math.round((Math.random() * GRID_HEIGHT) / 3),
        );
        midground.appendChild(cloud);
      }
      // 每 42 秒生成一朵云
      if (is_first_img_init)
        setInterval(() => {
          if (document.visibilityState !== "visible")
            return;
          let cloud = generateClouds(
              x + Math.round(Math.random() * 10),
              -CLOUD_CANVAS_SIZE[1] +
                  Math.round((Math.random() * GRID_HEIGHT) / 2),
          );
          midground.appendChild(cloud);
        }, 42000);
    }
  }

  // From ./pampas_grass.js
  // 画背景地，画山
  var land = new Land();
  foreground.appendChild(land.draw_background_land(x, bottom, pixelSize));
  // 画草地 背景蒲苇
  var grass = new Grass(pixelSize);
  const edgeLow = 20;
  for (let i = 30; i > -edgeLow + 2; i -= 4) {
    for (let j = 0; j < Math.ceil(x / (150 - 2 * i)); j++) {
      foreground.appendChild(grass.register_single_pampas_grass_canvas(
          Math.round(Math.random() * x), bottom - i, 1 - (i + edgeLow) / 85,
          rgb2hex(...Array(3).fill(255 - (i + edgeLow)))));
    }
  }
  // 画atri像素图 102x125
  // 位于 character.js
  const totalFrames = gifMatrix.length;
  const renderer = new GifRenderer({
    startX : Math.floor(x / 2) - 160,
    startY : bottom - 84,
    pixelSize : pixelSize, // 放大4倍
    colorList : colorList,
    gifMatrix : gifMatrix,           // generated by gif2js.py
    lightColorDict : lightColorDict, // 光照字典
    getFrameCount : (timestamp) => {
      let wind = Math.floor(grass.get_wind_strength(0.7, timestamp) * 10);
      return (wind / totalFrames) % 2 == 0
                 ? wind % totalFrames
                 : (totalFrames - 1) - (wind % totalFrames);
    }
  });
  foreground.appendChild(renderer.getElement());
  // 开始播放
  renderer.start();

  // 画草地 前景蒲苇
  for (let i = -edgeLow + 2; i > -edgeLow; i -= 3) {
    for (let j = 0; j < Math.ceil(x / (150 - 2 * i)); j++) {
      foreground.appendChild(grass.register_single_pampas_grass_canvas(
          Math.round(Math.random() * x), bottom - i, 1 - (i + edgeLow) / 85,
          rgb2hex(...Array(3).fill(255 - (i + edgeLow)))));
    }
  }
  // 一个肯定能挡在atri前的草
  foreground.appendChild(grass.register_single_pampas_grass_canvas(
      Math.round(x / 2 - 60), bottom, 1 - (edgeLow) / 85,
      rgb2hex(...Array(3).fill(255 - (edgeLow)))));

  setTimeout(() => {
    grass.compute_offscreen_canvases();
    grass.start_move_element_animation();
  }, 200);

  if (is_first_img_init) {
    // 滚动事件监听器，往下滚动后暂停动画
    // 1. 设置阈值（例如：300像素）
    const scrollThreshold = 0.382 * window.innerHeight;
    // 4. 用于跟踪是否已超过阈值的状态变量
    let hasPassedThreshold = false;
    // 2. 监听页面的滚动事件
    window.addEventListener('scroll', function() {
      // 3. 获取当前的滚动距离
      const currentScrollY = window.scrollY;

      // 检查是否向下滚动超过了阈值
      if (currentScrollY > scrollThreshold && !hasPassedThreshold) {
        grass.stop_move_element_animation();
        hasPassedThreshold = true; // 更新状态，防止重复执行
      }
      // 检查是否向上滚动回到了阈值以内
      else if (currentScrollY <= scrollThreshold && hasPassedThreshold) {
        grass.start_move_element_animation();
        hasPassedThreshold = false; // 更新状态，以便下次超过时能再次触发
      }
    }, true);
  }

  is_first_img_init = false;
}
