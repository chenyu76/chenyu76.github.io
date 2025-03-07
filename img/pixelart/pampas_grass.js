// 返回一个指向指定方向的抛物线函数,函数输入是x,返回全局坐标[x,y]
function parabolaToward(start, direction, a) {
  // 注意都是行向量
  const m = Math.sqrt(direction[0] ** 2 + direction[1] ** 2);
  const e1 = [direction.map((i) => i / m)]; // 标准化
  const e2 = multiplyMatrices(e1, [
    [0, 1],
    [-1, 0],
  ]);
  const A = [...e1, ...e2];
  return (x) => addMatrices([start], multiplyMatrices([[x, a * x * x]], A))[0];
}
// 给定一个抛物线参数（y=ax^2），输入抛物线的长度，返回此时x的最大值（近似）
function parabolaLen2x(a, length) {
  return (
    Math.sqrt(
      (-(1 / a / a) + Math.sqrt(1 + 64 * a * a * length * length) / a) ^ 2,
    ) / 2.82843
  ); //近似
}
// f 是函数,输入t,返回[x,y]
function drawf(ctx, f, min, max, wMin = undefined, wMax = undefined) {
  if (wMin === undefined) wMin = f(min);
  if (wMax === undefined) wMax = f(max);
  let mid = (min + max) / 2;
  let wMid = f(mid);
  if (
    Math.abs(wMax[0] - wMin[0]) <= 1 &&
    Math.abs(wMid[0] - wMin[0]) <= 1 &&
    Math.abs(wMax[0] - wMid[0]) <= 1
  )
    // ctx.fillRect(...wMin, 1, wMax[1] - wMin[1]);
    ctx.fillRect(
      ...wMin.map((i) => Math.floor(i)),
      1,
      Math.ceil(wMax[1] - wMin[1]),
    );
  else if (
    Math.abs(wMax[1] - wMin[1]) <= 1 &&
    Math.abs(wMid[1] - wMin[1]) <= 1 &&
    Math.abs(wMax[1] - wMid[1]) <= 1
  )
    ctx.fillRect(
      ...wMin.map((i) => Math.floor(i)),
      Math.ceil(wMax[0] - wMin[0]),
      1,
    );
  else {
    drawf(ctx, f, min, mid, wMin, wMid);
    drawf(ctx, f, mid, max, wMid, wMax);
  }
}

function drawParabolaUp(ctx, start, a, length) {
  /*
  let p = start;
  let w0 = 1;
  let w1 = 0;
  while (w1 - w0 >= 1 && w1 < length) {
    w0 = w1;
    w1 = Math.floor(Math.sqrt(1 / a + w0 * w0));
    ctx.fillRect(...p, 1, w1 - w0);
    p[0] += 1;
    p[1] = start[1] + w1;
  }
   if (w < 1) {
    length -= p[1] - start[1];
    start = p;
    while (p[0] - start[0] < length) {
      ctx.fillRect(...p, w, 1);
      // w = Math.floor((w + Math.sqrt(w * w - 4 / a)) / 2);
      p[0] += w;
      p[1] += 1;
    }
  } */
}

function multiplyMatrices(A, B) {
  let rowsA = A.length;
  let colsA = A[0].length;
  let rowsB = B.length;
  let colsB = B[0].length;
  if (colsA !== rowsB) throw new Error("矩阵维度不匹配");
  let result = [];
  for (let i = 0; i < rowsA; i++) {
    result[i] = [];
    for (let j = 0; j < colsB; j++) {
      result[i][j] = 0;
      for (let k = 0; k < colsA; k++) {
        result[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  return result;
}

function addMatrices(A, B) {
  let rows = A.length;
  let cols = A[0].length;
  if (B.length !== rows || B[0].length !== cols)
    throw new Error("矩阵维度不匹配");
  let result = [];
  for (let i = 0; i < rows; i++) {
    result[i] = [];
    for (let j = 0; j < cols; j++) {
      result[i][j] = A[i][j] + B[i][j];
    }
  }
  return result;
}

function transposeMatrix(matrix) {
  // 矩阵转置
  const result = [];
  for (let i = 0; i < matrix[0].length; i++) {
    result.push([]);
    for (let j = 0; j < matrix.length; j++) {
      result[i].push(matrix[j][i]);
    }
  }
  return result;
}

function draw_pampas_grass() {
  const canvas = document.getElementById("myCanvas");
  canvas.style.zoom = 10;
  const ctx = canvas.getContext("2d");

  // 禁用抗锯齿
  ctx.imageSmoothingEnabled = false;
  // ctx.lineJoin = "miter";
  // ctx.lineCap = "butt";
  // ctx.textRendering = "auto";

  const width = canvas.width;
  const height = canvas.height;
  const center = width / 2;
  const bottom = height - 1;
  // let f = parabolaToward([center, bottom], [-1, -1], 0.02);
  // drawf(ctx, f, 0, 40);
  drawParabolaUp(ctx, [center, bottom], -0.2, 40);
}
