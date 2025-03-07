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

function draw_test() {
  const canvas = document.getElementById("myCanvas");
  canvas.style.zoom = pixelSize;
  const ctx = canvas.getContext("2d");

  // 禁用抗锯齿
  ctx.imageSmoothingEnabled = false;

  const width = canvas.width;
  const height = canvas.height;
  const center = width / 2;
  const bottom = height - 1;

  let length = 30;
  // 遍历y坐标绘制抛物线
  let f = parabola_right([center, bottom], 0.01);
  for (let y = 0; y < length; y++)
    ctx.fillRect(...f(y).map((i) => Math.floor(i)), 1, 1);

  let df = parabola_right_derivative(0.01);
  for (let y = 20; y < 30; y++) {
    let g = homogeneous_cantilever_beam(f(y), df(y) - 3, 10, 300);
    for (let x = 0; x < 10; x++)
      ctx.fillRect(...g(x).map((i) => Math.floor(i)), 1, 1);
  }
}

// 在给定的画布上，画一条芦苇，返回这个画布
// start: 起始点坐标[x, y]
function draw_pampas_grass(start, canvas) {
  // 来自 sky_element.js 的随机生成函数randomNormal
  const length = Math.round(randomNormal(50, 10)); // 苇草长度
  const bent = ((i) => (i > 0 ? i : 0.004))(randomNormal(0.004, 0.002)); // 苇草弯曲度
  const branch_start = Math.round(length * randomNormal(0.4, 0.1)); // 苇草分支起始位置

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
        df(y) + randomNormal(-2, 0.2), // 苇草分支起始斜率
        base_branch_length, // 苇草分支长度
        randomNormal(200, 50), // 苇草分支弯曲度
      );
      for (let x = 0; x < branch_length; x++)
        ctx.fillRect(...g(x).map((i) => Math.floor(i)), 1, 1);
    }
  };
  draw_branch(10, "#E1D6AB", 1);
  draw_branch(5, "#B5AF9F", 0.8);
  draw_branch(2, "#4B4A44", 0.4);

  ctx.fillStyle = "#4B4A44";
  for (let y = 0; y < length; y++)
    ctx.fillRect(...f(y).map((i) => Math.floor(i)), 1, 1);

  return canvas;
}

