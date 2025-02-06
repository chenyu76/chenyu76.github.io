/*
TODO:
 [x] 云的边缘裁掉一个像素
 [x] 云的颜色的棋盘格纹路
 [ ] 夜晚的流星
*/

// 返回一个星星 draw a star on foreground
function createStar(h) {
  const star = document.createElement("div");
  star.classList.add("star");

  const max_y = GRID_HEIGHT / 2;
  const max_x = calculateGridWidth(h);

  // 生成随机位置
  const x = Math.ceil(Math.random() * max_x) * pixelSize;
  const y = Math.ceil(Math.random() * max_y) * pixelSize;
  star.style.right = `${x}px`;
  star.style.top = `${y}px`;
  star.style.width = `${pixelSize}px`;
  star.style.height = `${pixelSize}px`;

  // 生成不同的动画时长
  const duration = Math.random() * 1.5 + 0.5; // 0.5s 到 2s
  star.style.animationDuration = `${duration}s`;

  return star;
}

const METEOR_LIFE_LEN = 30;
function meteor_colors_a(index) {
  return ((c) => `rgba(${c[0]},${c[1]},${c[2]},${c[3]})`)(
    index === 0
      ? [255, 255, 11, 1]
      : [255, 255, 255, (METEOR_LIFE_LEN - index) / METEOR_LIFE_LEN],
  );
}

/*
 * 流星：在指定位置(pos)创建一个div,然后开始移动,需要多创建几个才有效果
 * k: 直线的斜率
 * delay_time : 隔多久移动一次
 * life 这是流星的第几节,0是头
 * return: 一个流星方块<div>
 */
function meteor_part(pos, delay_time, k, life) {
  let mp = document.createElement("div");
  mp.style.width = `${pixelSize}px`;
  mp.style.height = `${pixelSize}px`;
  mp.style.position = "absolute";
  //mp.textContent = `${life}`;
  mp.style.backgroundColor = meteor_colors_a(life);

  if (k >= 1) {
    let pass_time = 0;
    let interval = setInterval(() => {
      let y = pixelSize * (pos[1] - life + pass_time);
      let x = pixelSize * Math.floor(pos[0] + (-life + pass_time) / k);
      if (y > window.innerHeight) {
        clearInterval(interval);
        mp.remove(); // 超出屏幕后删除
      }
      mp.style.right = x + "px";
      mp.style.top = y + "px";
      pass_time++;
    }, delay_time); // 每 ? 秒移动一次
  } else {
    console.log("这个情况懒得做了");
  }
  return mp;
}
function generateMeteor(h) {
  let m = document.createElement("div");
  m.style.right = m.style.top = "0px";
  m.style.position = "absolute";
  let w = calculateGridWidth(h);
  let pos = [Math.round(w * Math.random()), -Math.ceil(Math.random()*200)];
  // let direct = [1, Math.ceil(Math.random() * 4)];
  let k = Math.ceil(Math.random()*4);
  let time = randomNormal(25, 10);
  for (let i = 0; i < METEOR_LIFE_LEN; i++) {
    m.appendChild(meteor_part(pos, time, k, i));
  }
  let interval = setInterval(() => {
    if (m.children.length === 0) {
      clearInterval(interval);
      m.remove();
    }
  }, time * METEOR_LIFE_LEN);
  return m;
}

const CLOUD_CANVAS_SIZE = [80, 40];

// 在页面上放云，参数为云的位置
function generateClouds(init_x, init_y) {
  const cloud = createCloud();
  cloud.style.zoom = pixelSize;

  // 随机起始高度
  cloud.style.position = "absolute";
  cloud.style.top = init_y + "px";
  cloud.style.right = init_x + "px";

  let speed = 1; // 每次移动的距离
  let interval = setInterval(
    () => {
      let currentX = parseFloat(cloud.style.right);
      cloud.style.right = currentX - speed + "px";
      if (currentX < -CLOUD_CANVAS_SIZE[0]) {
        clearInterval(interval);
        cloud.remove(); // 超出屏幕后删除
      }
    },
    randomNormal(3000, 600),
  ); // 每 ? 秒移动一次
  return cloud;
}

function randomNormal(mean, stdDev) {
  let u1 = Math.random();
  let u2 = Math.random();
  let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

function generateSpheres(numSpheres) {
  const spheres = [];
  const centerMean = [0, 0, 7];
  const centerStdDev = [10, 3, 1.5];
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
          radiusMean * Math.max(0, 1 - 0.03 * Math.abs(center[0] - cview[0])),
          radiusStdDev * Math.max(0, 1 - 0.4 * Math.abs(center[1] - cview[1])),
        ),
      ),
    );
    spheres.push({ center, radius });
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
  const lightDir = normalize([-1, -4, 2]);

  // 初始化像素缓冲区和深度缓冲区（Z-Buffer）
  const image = new Float32Array(width * height).fill(0); // 存储光照值
  const zBuffer = new Float32Array(width * height).fill(-Infinity); // 记录深度
  const visibility = new Uint8Array(width * height).fill(0); // 记录像素是否有物体

  // 定义多个球的参数
  var spheres = generateSpheres(20);

  // 遍历所有球
  for (let sphere of spheres) {
    let [cx, cy, cz] = sphere.center;
    let radius = sphere.radius;

    // 遍历像素
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let dx = x - cx,
          dy = y - cy;
        if (
          dx * dx + dy * dy <= radius * radius && // 小于半径
          Math.max(Math.abs(dx), Math.abs(dy)) <= radius - 1 / 2 // 小于半径-1/2的正方形，裁掉突出像素
        ) {
          let dz = Math.sqrt(radius * radius - dx * dx - dy * dy);
          let z = cz + dz;

          let index = y * width + x;

          // 深度测试：只绘制更近的像素
          if (z > zBuffer[index]) {
            zBuffer[index] = z;

            // 计算球面法向量
            let normal = normalize([dx, dy, dz]);

            // Lambertian 光照计算
            let intensity = Math.max(0, dot(normal, lightDir));
            //let intensity = dot(normal, lightDir);

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
    0: colorMultiply(
      interpolate_time_color(currentHour, skyColorDict[0]),
      [200, 200, 200],
    ),
    2: interpolate_time_color(currentHour, lightColorDict),
    4: [255, 255, 255],
  };
  for (let i = 0; i < width * height; i++) {
    if (visibility[i] === 1) {
      //let intensity = Math.round(image[i] * 4); // 0 - 4
      let intensity =
        image[i] < 0.05
          ? 0
          : image[i] < 0.4
            ? 1
            : image[i] < 0.6
              ? 2
              : image[i] < 0.9
                ? 3
                : 4;
      let c =
        intensity % 2 === 0
          ? cloudColor[intensity]
          : width % 2 === 1
            ? cloudColor[intensity + (i % 2) * 2 - 1]
            : cloudColor[intensity + ((i + Math.ceil(i / width)) % 2) * 2 - 1];
      imgData.data[i * 4] = c[0]; // R
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

// 向量归一化
function normalize(v) {
  let len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
  return v.map((c) => c / len);
}

// 向量点积
function dot(v1, v2) {
  return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
}
