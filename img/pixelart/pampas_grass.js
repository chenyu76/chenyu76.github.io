// 返回一个开口向右的抛物线函数,函数输入是y,返回全局坐标[x,y]
function parabola_right(start, a) {
  return (y) => [a * (y - start[1]) ** 2 + start[0], y];
}

function homogeneous_cantilever_beam(start, L, EI, q, k) {
  return (x) => {
    let y = (q / (24 * EI)) * x * x * (x * x - 4 * L * x + 6 * L * L) + k * x;
    return [start[0] + x, start[1] + y];
  };
}

function draw_pampas_grass() {
  const canvas = document.getElementById("myCanvas");
  canvas.style.zoom = 10;
  const ctx = canvas.getContext("2d");

  // 禁用抗锯齿
  ctx.imageSmoothingEnabled = false;

  const width = canvas.width;
  const height = canvas.height;
  const center = width / 2;
  const bottom = height - 1;

  // 遍历y坐标绘制抛物线
  let f = parabola_right([center, bottom], 0.01);
  for (let y = 0; y < height; y++)
    ctx.fillRect(...f(y).map((i) => Math.floor(i)), 1, 1);
}
