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
var currentGrass = null;
var meteorIntervalId = null;
var cloudIntervalId = null;
var elBackground = null;
var elMidground = null;
var elForeground = null;
var elRenderer = null;

// https://stackoverflow.com/questions/8022885/rgb-to-hsv-color-in-javascript
// input: r,g,b in [0,1], out: h in [0,360) and s,v in [0,1]
// Accepts either (r, g, b) or ([r, g, b]).
/**
 * @param {number|Array<number>} r
 * @param {number=} g
 * @param {number=} b
 * @return {Array<number>}
 */
function rgb2hsv(r, g, b) {
  if (Array.isArray(r))
    return rgb2hsv(r[0], r[1], r[2]);
  let v = Math.max(r, /** @type {number} */ (g), /** @type {number} */ (b)),
      c = v - Math.min(r, /** @type {number} */ (g), /** @type {number} */ (b));
  let h = c && (v == r   ? (g - b) / c
                : v == g ? 2 + (b - r) / c
                         : 4 + (r - g) / c);
  return [ 60 * (h < 0 ? h + 6 : h), v && c / v, v ];
}
// input: h in [0,360] and s,v in [0,1] output rgb() color// - output: r,g,b in
// [0,1]
// Accepts either (h, s, v) or ([h, s, v]).
/**
 * @param {number|Array<number>} h
 * @param {number=} s
 * @param {number=} v
 * @return {Array<number>}
 */
function hsv2rgb(h, s, v) {
  if (Array.isArray(h))
    return hsv2rgb(h[0], h[1], h[2]);
  let f = (n, k = (n + h / 60) % 6) =>
      /** @type {number} */ (v) -
      /** @type {number} */ (v) * s * Math.max(Math.min(k, 4 - k, 1), 0);
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
// Accepts either (r, g, b) or ([r, g, b]).
/**
 * @param {number|Array<number>} r
 * @param {number=} g
 * @param {number=} b
 * @return {string}
 */
function rgb2hex(r, g, b) {
  if (Array.isArray(r))
    return rgb2hex(r[0], r[1], r[2]);
  return `#${
      ((1 << 24) | (r << 16) | (/** @type {number} */ (g) << 8) |
       /** @type {number} */ (b))
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
// 创建一个闭包缓存空间
const interpolate_time_color_cache = new Map();
function interpolate_time_color(hour, colorDict) {
  let hourCache = interpolate_time_color_cache.get(hour);
  if (!hourCache) {
    hourCache = new Map();
    interpolate_time_color_cache.set(hour, hourCache);
  }
  if (hourCache.has(colorDict))
    return hourCache.get(colorDict);

  // 计算开始
  // if (hour < 0 || hour > 24) {
  //   throw new Error("hour out of range. Must be between 0 and 24.");
  // }
  const keys = Object.keys(colorDict).map(Number);
  let lowerKey = Math.max(...keys.filter((k) => k <= hour));
  let upperKey = Math.min(...keys.filter((k) => k >= hour));
  let result = hsv2rgb(lowerKey === upperKey
                           ? colorDict[lowerKey]
                           : interpolateHSV(
                                 colorDict[lowerKey],
                                 colorDict[upperKey],
                                 (hour - lowerKey) / (upperKey - lowerKey),
                                 ));

  hourCache.set(colorDict, result);
  return result;
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
  return rgb2hex(colorMultiply(hex2rgb(c1), hex2rgb(c2)));
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
  return rgb2hex(colorAverage(hex2rgb(c1), hex2rgb(c2), w1));
}

// 计算网格宽度 x (像素图大小的宽)
function calculateGridWidth(h = document.documentElement.clientHeight,
                            w = document.documentElement.clientWidth) {
  return Math.ceil(document.documentElement.clientWidth / pixelSize);
  // return Math.ceil(GRID_HEIGHT * (w / h));
}

// 计算像素单位大小
function calculatePixelSize(h = document.documentElement.clientHeight) {
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
                       time = null) {
  if (!h || h <= 0) return;
  if (time === null)
    time = Math.random() * 24;
  // 获取背景和前景容器
  const background =
      elBackground ||
      (elBackground = document.getElementById("pixel-art-background"));
  const midground =
      elMidground ||
      (elMidground = document.getElementById("pixel-art-midground"));
  const foreground =
      elForeground ||
      (elForeground = document.getElementById("pixel-art-foreground"));
  // const container = document.getElementById("pixel-art");

  if (time !== null)
    currentHour = time;
  // currentHour = 12;
  // 像素大小
  pixelSize = Math.ceil(calculatePixelSize(h));

  // 横向像素宽度
  const widthInPixel = calculateGridWidth();
  // 纵向像素高度
  // 目标是 GRID_HEIGHT，但由于我希望屏幕像素大小是整数，所以不一定能达到
  const heightInPixel = Math.ceil(h / pixelSize);
  // 清空背景容器
  clearContainer(background);
  clearContainer(midground);
  clearContainer(foreground);
  background.style.height = `${h}px`;
  midground.style.height = `${h}px`;
  foreground.style.height = `${h}px`;

  // 计算三个背景颜色
  // var bgcolors = skyColorDict.map(
  //     (color) => rgb2hex(interpolate_time_color(currentHour, color)),
  // );
  // 设置背景宽度
  background.style.width = `${widthInPixel * pixelSize}px`;

  // 创建背景
  background.appendChild(
      draw_background_sky(widthInPixel, heightInPixel, pixelSize));

  if (currentHour > 19 || currentHour < 5) {
    isNight = true;
  } else {
    isNight = false;
  }

  if (time !== null) {
    if (meteorIntervalId) {
      clearInterval(meteorIntervalId);
      meteorIntervalId = null;
    }
    if (cloudIntervalId) {
      clearInterval(cloudIntervalId);
      cloudIntervalId = null;
    }
    if (isNight) {
      let ss = document.createElement("div");
      ss.style.right = ss.style.top = "0px";
      ss.style.position = "absolute";
      for (let i = 0; i < 42; i++)
        ss.appendChild(createStar());
      midground.appendChild(ss);
      midground.appendChild(generateMeteor(widthInPixel, pixelSize));
      meteorIntervalId = setInterval(() => {
        if (document.visibilityState !== "visible")
          return;
        midground.appendChild(generateMeteor(widthInPixel, pixelSize));
      }, 7000);
    } else {
      let num_clouds = Math.floor(Math.random() * 8) + 4;
      for (let i = 0; i < num_clouds; i++) {
        let cloud = generateClouds(
            Math.round(Math.random() * widthInPixel),
            Math.round((Math.random() * GRID_HEIGHT) / 3),
        );
        midground.appendChild(cloud);
      }
      cloudIntervalId = setInterval(() => {
        if (document.visibilityState !== "visible")
          return;
        let cloud = generateClouds(
            widthInPixel + Math.round(Math.random() * 10),
            -CLOUD_CANVAS_SIZE[1] +
                Math.round((Math.random() * GRID_HEIGHT) / 2),
        );
        midground.appendChild(cloud);
      }, 84000);
    }
  }

  // From ./pampas_grass.js
  // 画背景地，画山
  var land = new Land();
  foreground.appendChild(
      land.draw_background_land(widthInPixel, heightInPixel, pixelSize));
  // 画草地 背景蒲苇
  if (currentGrass) {
    currentGrass.stop_move_element_animation();
    currentGrass = null;
  }
  var grass = new Grass(pixelSize);
  currentGrass = grass;
  const edgeLow = 20;
  for (let i = 30; i > -edgeLow + 2; i -= 4) {
    for (let j = 0; j < Math.ceil(widthInPixel / (150 - 2 * i)); j++) {
      foreground.appendChild(grass.register_single_pampas_grass_canvas(
          Math.round(Math.random() * (widthInPixel + 20) + 30),
          heightInPixel - i, 1 - (i + edgeLow) / 85,
          rgb2hex(Array(3).fill(255 - (i + edgeLow)))));
    }
  }
  // 画atri像素图 102x125
  // 位于 character.js
  const totalFrames = gifMatrix.length;
  if (elRenderer) {
    elRenderer.stop();
  }
  const renderer = new GifRenderer({
    startX : Math.floor(widthInPixel / 3 - gifMatrixWidth),
    startY : heightInPixel - 84,
    pixelSize : pixelSize, // 放大4倍
    colorList : colorList,
    gifMatrix : gifMatrix,           // generated by gif2js.py
    lightColorDict : lightColorDict, // 光照字典
    getFrameCount : (timestamp) => {
      let wind = Math.floor(grass.get_wind_strength(0.7, timestamp) * 16);
      return Math.floor(wind / totalFrames) % 2 == 0
                 ? wind % totalFrames
                 : (totalFrames - 1) - (wind % totalFrames);
    }
  });
  elRenderer = renderer;
  foreground.appendChild(renderer.getElement());
  // 开始播放
  renderer.start();

  // 画草地 前景蒲苇
  for (let i = -edgeLow + 2; i > -edgeLow; i -= 3) {
    for (let j = 0; j < Math.ceil(widthInPixel / (150 - 2 * i)); j++) {
      foreground.appendChild(grass.register_single_pampas_grass_canvas(
          Math.round(Math.random() * (widthInPixel + 20) + 30),
          heightInPixel - i, 1 - (i + edgeLow) / 85,
          rgb2hex(Array(3).fill(255 - (i + edgeLow)))));
    }
  }
  // 一个肯定能挡在atri前的草
  foreground.appendChild(grass.register_single_pampas_grass_canvas(
      Math.round(widthInPixel / 3), heightInPixel, 1 - (edgeLow) / 85,
      rgb2hex(Array(3).fill(255 - (edgeLow)))));

  // 耗时或者不是必须的操作可以延后再做
  // 兼容性写法（如果浏览器不支持，降级回普通执行）
  const runNonBlocking =
      window.requestIdleCallback || function(cb) { return setTimeout(cb, 50); };
  runNonBlocking(() => {
    grass.compute_offscreen_canvases();
    grass.start_move_element_animation();
    foreground.appendChild(PixelTextRenderer.setupTextCycle());
  });

  if (is_first_img_init) {
    let hasPassedThreshold = false;
    window.addEventListener('scroll', function() {
      var scrollThreshold = 0.382 * window.innerHeight;
      const currentScrollY = window.scrollY;

      if (currentScrollY > scrollThreshold && !hasPassedThreshold) {
        if (currentGrass)
          currentGrass.stop_move_element_animation();
        hasPassedThreshold = true;
      } else if (currentScrollY <= scrollThreshold && hasPassedThreshold) {
        if (currentGrass)
          currentGrass.start_move_element_animation();
        hasPassedThreshold = false;
      }
    }, true);
  }

  is_first_img_init = false;
}
// Tell google-closure-compiler do not rename this function
// since it is used in html
window['imgInit'] = imgInit;
