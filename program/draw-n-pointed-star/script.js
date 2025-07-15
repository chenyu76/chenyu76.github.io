const svg = document.getElementById("polygonSvg");
const sidesInput = document.getElementById("sides");
const helpBtn = document.getElementById("helpBtn");
const tooltip = document.getElementById("tooltip");

// 清除所有边
function clearStar() {
  const lines = svg.querySelectorAll("line");
  lines.forEach((line) => line.remove());
}

// 检查输入的字符串是否是有效的对象字符串
function isValidObjectString(str) {
  if (!str.includes(":")) return false;
  try {
    const obj = new Function("return {" + str + "};")();
    return typeof obj === "object" && obj !== null;
  } catch (e) {
    return false;
  }
}

class star {
  constructor(sides, svg, points = [], iter = 0) {
    this.svg = svg;
    if (!points.length) {
      // 如果没有传入点，则计算点
      let maxSide = Math.max(...Object.keys(sides).map(Number));
      if (maxSide < 2) return; // 至少需要2个边
      this.points = this.calculatePoints(maxSide);
      for (let i = 1; i < maxSide; i++) {
        if (!Object.hasOwn(sides, i) || sides[i] == 0 || sides[i] >= i)
          sides[i] = 1;
      }
      for (const key in sides)
        if (typeof sides[key] === "number") sides[key] = [sides[key]];
    } else {
      this.points = points;
    }
    this.sides = sides;
    this.sidesNum = this.points.length;
    this.hasConnected = Array(this.sidesNum).fill(false);
    this.iter = iter;
  }
  draw() {
    if (this.iter > 10) return; // 防止输入参数不规范时无限递归
    let start = 0;
    while (!this.hasConnected[start]) {
      const j = this.sides[this.sidesNum][start % this.sides[this.sidesNum].length];
      const jump = Math.floor(j);
      const sidesNum = this.sidesNum;
      if (
        Number.isInteger(j) &&
        this.sides[this.sidesNum] != 1 &&
        sidesNum % jump == 0
      ) {
        let points = this.points.filter(
          (_, index) => (index - start) % jump === 0,
        );
        let starChild = new star(this.sides, this.svg, points, this.iter + 1);
        starChild.draw();
        for (let i = start; i < sidesNum; i += jump)
          this.hasConnected[i] = true;
      } else {
        let i = start;
        while (!this.hasConnected[i]) {
          let next = (i + jump) % sidesNum;
          this.connectPoint(i, next);
          this.hasConnected[i] = true;
          i = next;
        }
      }
      start++;
    }
  }
  connectPoint(startIndex, endIndex) {
    this.drawLine(this.points[startIndex], this.points[endIndex]);
  }

  calculatePoints(sides) {
    const centerX = 200;
    const centerY = 200;
    const radius = 150;
    const points = [];

    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      points.push({ x, y });
    }

    return points;
  }

  // 绘制一条边
  drawLine(start, end) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", start.x);
    line.setAttribute("y1", start.y);
    line.setAttribute("x2", end.x);
    line.setAttribute("y2", end.y);
    this.svg.appendChild(line);
    return line;
  }
}

function drawStar(sides) {
  if (sides == false) return;
  clearStar();
  let starInstance = new star(sides, svg);
  try {
    starInstance.draw();
  } catch (e) {
    console.log("参数有误，Error drawing star:", e);
  }
}

// 输入框事件监听
sidesInput.addEventListener("input", function () {
if (isValidObjectString(this.value))
  drawStar(eval(("({" + this.value + "})").replace(/\./g,".1")));
});

// 帮助按钮事件
helpBtn.addEventListener("click", function () {
  tooltip.style.display = tooltip.style.display === "block" ? "none" : "block";
});

// 点击其他地方关闭帮助
document.addEventListener("click", function (e) {
  if (e.target !== helpBtn && e.target !== tooltip) {
    tooltip.style.display = "none";
  }
});

// 初始绘制
if (isValidObjectString(sidesInput.value))
  drawStar(eval(("({" + sidesInput.value + "})").replace(/\./g,".1")));
