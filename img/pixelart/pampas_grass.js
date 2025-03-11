//const pampas_color = ["#D7D1BA", "#A89268", "#426C13"];
//const pampas_color = ["#E1D6AB", "#B5AF9F", "#6B6A54"];
const pampas_color = ["#F5F1E8", "#DCCBB2", "#B9A99A"];

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

// 在给定的画布ctx上，画一条芦苇，返回这个画布
// start: 起始点坐标[x, y]
function draw_pampas_grass(start, ctx, p_color) {
  // 来自 sky_element.js 的随机生成函数randomNormal
  const length = Math.round(randomNormal(50, 10)); // 苇草长度
  const bent = ((i) => (i > 0 ? i : 0.0045))(randomNormal(0.0045, 0.002)); // 苇草弯曲度
  const branch_start = Math.round(length * randomNormal(0.5, 0.1)); // 苇草分支起始位置

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
  draw_branch(10, p_color[0], 1);
  draw_branch(5, p_color[1], 0.8);
  draw_branch(2, p_color[2], 0.4);

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
) {
  const pampas_canvas = document.createElement("canvas");
  pampas_canvas.style.position = "absolute";
  pampas_canvas.width = width;
  pampas_canvas.height = height;
  pampas_canvas.style.zoom = pixelSize;
  const ctx = pampas_canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false; // 禁用抗锯齿

  //来自主脚本的颜色
  const light_color = interpolate_time_color(currentHour, lightColorDict);
  // 光线影响
  let adjusted_color = pampas_color.map((color) =>
    rgb2hex(
      ...colorMultiply(
        colorMultiply(hex2rgb(color), light_color),
        hex2rgb(color_multiplyer),
      ),
    ),
  );

  for (let i = 0; i < num; i++)
    draw_pampas_grass(
      [Math.round(Math.random() * width), height],
      ctx,
      adjusted_color,
    );

  return pampas_canvas;
}
