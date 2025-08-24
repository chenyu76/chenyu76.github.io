/**
 * 一个可设置种子的伪随机数生成器类。
 * 使用 Mulberry32 算法，这是一个快速、简单且具有不错统计特性的 32 位 PRNG。
 */
class SeededRandom {
  /**
   * 创建一个随机数生成器实例。
   * @param {number} [seed] - 初始种子。如果未提供，将使用当前时间戳。
   */
  constructor(seed) {
    // 如果没有提供种子，则使用当前时间戳作为默认种子
    this.seed = seed === undefined ? Date.now() : seed;
    // 初始化内部状态 a
    this.a = this.seed;
  }

  /**
   * 生成下一个伪随机数（0 到 1 之间的浮点数，不包括 1）。
   * @returns {number} 一个在 [0, 1) 区间的浮点数。
   */
  uniform() {
    // Mulberry32 算法核心
    // 这是一系列位操作，旨在以一种确定性但看似随机的方式搅乱数字
    let t = this.a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    // 最终结果经过 XOR 和右移操作，然后除以 2^32，将其映射到 [0, 1) 区间
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  // 生成一个符合正态分布的随机数，使用 Box-Muller 变换
  normal(mean = 0, stdDev = 1) {
    let u1 = this.uniform();
    let u2 = this.uniform();
    let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  setSeed(newSeed) {
    this.seed = newSeed;
    this.a = this.seed;
  }
}

class Grass {
  constructor(pixelSize) {
    this.pixelSize = pixelSize; // canvas的CSS zoom大小

    this.rng = new SeededRandom();

    // this.xCapability = 200; // x方向容量
    // this.yCapability = 30; // y方向容量
    this.animationFrameId = null; // 动画帧ID
    this.initialCanvasIndex = 2;  // 初始帧在离屏canvas数组中的索引
    this.totalCanvasCount = 10;   // 离屏canvas总数
    /**
     * 蒲苇数据
     * @type {Array[Object{
     *   x: number,                 在父容器中的x位置，right定位
     *   y: number,                 在父容器中的y位置
     *   scale: number,             缩放比例
     *   rngSeed: number,           随机数生成器种子
     *   x3D: number,               在三维空间中的x坐标（0, 1）,
     *                              我希望风从左到右所以0是左边
     *   colorMultiplyer : string,  颜色乘色器
     *   nowCanvasIndex: number,    当前显示的canvas在离屏canvas数组中的索引
     *   bent: number,              当前蒲苇的弯曲度
     *   bentSpeed: number,         蒲苇弯曲度变化速度
     *   ctx: CanvasRenderingContext2D  canvasOnScreen的2D上下文
     *   canvasOnScreen: HTMLCanvasElement  在屏幕上的canvas
     *   canvasesOffScreen: Array[string]   离屏canvas数组
     * }]}
     */
    this.data = [];

    // 当前的风，每一个都是由 create_wind_function 生成的
    // 二元函数和结束时间点组成的object
    this.winds = [];

    // 蒲苇的抗风回弹能力
    this.antiBend = 0.6;

    // 将三维空间中最远处的蒲苇的距离视为1,
    // 最近的蒲苇的距离
    this.grass3DDistanceMin = 0.2;

    this.lastWindCreateTime = 0; // 上一次创建风的时间戳
    this.nextWindCreateInterval =
        this.rng.normal(4000, 500); // 下一次创建风的时间间隔
    this.lastAnimationTime = 0;     // 上一次动画帧的时间戳
    this.updateInterval = 50;       // 每隔多少毫秒更新一次动画

    this.pgd_scale_factor = [
      1,
      1,
      -1.25,
      -1.25,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
    ];
    this.pgd = [
      50,
      15,
      0.0045,
      0.002,
      0.5,
      0.1,
      2,
      0.2,
      200,
      50,
      10,
      1,
      5,
      0.8,
      2,
      0.4,
    ];
  }

  // 返回一个开口向右的抛物线函数,函数输入是局部输入y,返回全局坐标[x,y]
  #parabola_right(start, a) {
    return (y) => [a * y * y + start[0], -y + start[1]];
  }
  #parabola_right_derivative(a) {
    let two_a = 2 * a;
    return (y) => two_a * y;
  }

  #homogeneous_cantilever_beam(start, k, L, EI, q = 1) {
    let q_over_24EI = q / (24 * EI);
    let four_L = L * 4;
    let six_L_square = L * L * 6;
    return (x) => [start[0] + x,
                   start[1] +
                       x * x * q_over_24EI *
                           (x * x - four_L * x + six_L_square) +
                       k * x,
    ];
  }

  /*
   * 在给定的画布ctx上，画一条芦苇，返回这个ctx
   * start: 起始点坐标[x, y]
   * ctx: 画布上下文
   * p_color: 颜色数组，包含三种颜色
   * pgd: 参数数组，包含芦苇的各种参数
   * rng_seed: 随机数生成器的种子，默认为随机
   * wind_affect: 风的影响程度，默认为1
   */
  #draw_pampas_grass(start, ctx, p_color, pgd,
                     rng_seed = Math.random() * 528491, wind_affect = 1) {
    this.rng.setSeed(rng_seed);
    const length = Math.round(this.rng.normal(pgd[0], pgd[1])); // 苇草长度
    const bent =
        ((i) => (i > 0 ? i : pgd[2]))(this.rng.normal(pgd[2], pgd[3])) *
        wind_affect; // 苇草弯曲度
    const branch_start = Math.round(
        length * this.rng.normal(pgd[4], pgd[5])); // 苇草分支起始位置

    // start[1] += length * rng.uniform(); // 苇草起始位置偏移

    let f = this.#parabola_right(start, bent); // 苇草主干
    let df = this.#parabola_right_derivative(bent);

    let draw_branch = (color, base_branch_length, precent = 1) => {
      ctx.fillStyle = color;
      for (let y = branch_start; y < length * precent; y++) {
        let branch_length = Math.round(
            this.rng.normal(base_branch_length, base_branch_length / 2),
        );
        let g = this.#homogeneous_cantilever_beam(
            f(y),
            df(y) - this.rng.normal(pgd[6], pgd[7]), // 苇草分支起始斜率
            base_branch_length,                      // 苇草分支长度
            this.rng.normal(pgd[8], pgd[9]),         // 苇草分支弯曲度
        );
        for (let x = 0; x < branch_length; x++)
          ctx.fillRect(...g(x).map(Math.floor), 1, 1);
      }
    };
    draw_branch(p_color[0], pgd[10], pgd[11]);
    draw_branch(p_color[1], pgd[12], pgd[13]);
    draw_branch(p_color[2], pgd[14], pgd[15]);

    ctx.fillStyle = p_color[2];
    for (let y = 0; y < length; y++)
      ctx.fillRect(...f(y).map(Math.floor), 1, 1);

    return ctx;
  }

  /**
   * 开始移动蒲苇元素的动画
   */
  start_move_element_animation() {
    if (this.animationFrameId !== null)
      cancelAnimationFrame(this.animationFrameId);
    this.lastAnimationTime = performance.now();
    this.animationFrameId = requestAnimationFrame(
        (timestamp) => this.moveElementAnimation(timestamp));
  }
  stop_move_element_animation() {
    if (this.animationFrameId !== null)
      cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
  }
  /**
   * 移动蒲苇元素的动画
   */
  moveElementAnimation(timestamp) {
    // 控制更新频率
    if (timestamp - this.lastAnimationTime < this.updateInterval) {
      this.animationFrameId = requestAnimationFrame(
          (timestamp) => this.moveElementAnimation(timestamp));
      return;
    }

    // 过滤掉已经结束的风
    this.winds = this.winds.filter(wind => timestamp <= wind.t);
    // 创建新风
    if (timestamp - this.lastWindCreateTime > this.nextWindCreateInterval) {
      this.winds.push(this.#create_wind_function(timestamp));
      this.nextWindCreateInterval = this.rng.normal(2000, 500);
      this.lastWindCreateTime = timestamp;
    }

    // 间隔太久就直接更新lastAnimationTime，避免风力过大
    let deltaT = timestamp - this.lastAnimationTime;
    if (deltaT > 500) {
      deltaT = 500;
    }
    const deltaT_s = deltaT / 1000;

    const oneHalf = Math.round(Math.random());
    let count = 0;
    for (let d of this.data) {
      if (++count % 2 === oneHalf)
        continue; // 每次只更新一半的蒲苇，降低计算量

      // 计算蒲苇当前受到的风力
      let total_wind_force = 0;
      for (let wind of this.winds) {
        total_wind_force += wind.f(d.x3D, timestamp);
      }

      // 根据风力调整蒲苇的弯曲度
      d.bentSpeed += total_wind_force * deltaT_s;
      // 蒲苇越弯，受到的恢复力越大
      d.bentSpeed -= d.bent * this.antiBend * deltaT_s;
      // 阻尼，防止一直摆动
      d.bentSpeed *= 0.999;
      d.bent += d.bentSpeed * deltaT_s;

      // 更新蒲苇显示的canvas
      let newCanvasIndex =
          Math.max(Math.round(this.initialCanvasIndex + d.bent * 4), 0);
      // 限制最大值，在边缘时抖动
      if (newCanvasIndex > this.totalCanvasCount - 2)
        newCanvasIndex =
            this.totalCanvasCount - 1 -
            (Math.round(Math.abs(
                 timestamp / (Math.round(Math.abs(d.rngSeed)) % 140 + 180) +
                 d.rngSeed)) %
             3);

      if (newCanvasIndex !== d.nowCanvasIndex) {
        d.nowCanvasIndex = newCanvasIndex;
        d.ctx.clearRect(0, 0, d.canvasOnScreen.width, d.canvasOnScreen.height);
        d.ctx.drawImage(d.canvasesOffScreen[d.nowCanvasIndex], 0, 0);
      }
    }
    this.lastAnimationTime = timestamp;
    this.animationFrameId = requestAnimationFrame(
        (timestamp) => this.moveElementAnimation(timestamp));
    return;
  }
  /**
   * 返回一个随机一阵风二元函数object
   * 参数：t_offset - 风开始的时间偏移（基于当前时间戳）
   * return:
   *   {f: function(x,t)，t: number 可以删除这个风的时间点}
   *     f(x,t): 在x位置，t时刻的风力值 x∈[0,1], t∈[0,∞)
   *             t → ∞, f(x, t) → 0
   *             大小尽量控制在[0, 1]之间
   * 时间都是毫秒
   */
  #create_wind_function(t_offset = 0) {
    const w = this.rng.normal(0.6, 0.2);        // 风宽度
    const h = this.rng.normal(0.3, 0.05);       // 风高度
    const v = this.rng.normal(0.0005, 0.00006); // 风速度
    return {
      f: (x, t) => {
        const y = v * (t - t_offset) - x;
        if (y <= 0)
          return 0;
        else if (y < w)
          return h * (y / w);
        else if (y < 2 * w)
          return h * (2 - y / w);
        else
          return 0;
      }, t: t_offset + (2 * w + 1) / v
    }
  }
  /**
   * 计算离屏canvas，动画的不同帧
   * 这个挺耗时，需要在主线程之外运行
   */
  compute_offscreen_canvases() {
    // 在初始位置时是1, 递增
    // 线性的应该够用
    const windAffect = (i) =>
        (i - this.initialCanvasIndex) / this.totalCanvasCount * 1 + 1;
    // 计算不同帧
    for (let d of this.data) {
      const initalCanvas = document.createElement("canvas");
      initalCanvas.width = d.canvasOnScreen.width;
      initalCanvas.height = d.canvasOnScreen.height;
      const ctx = initalCanvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(d.canvasOnScreen, 0, 0);
      // const initalCanvasSrc =
      // JSON.parse(JSON.stringify(d.canvasOnScreen.src));

      for (let i = 0; i < this.initialCanvasIndex; i++)
        d.canvasesOffScreen.push(this.#create_single_pampas_grass_canvas(
            d.x, d.y, d.scale, d.colorMultiplyer, d.rngSeed, windAffect(i)));
      d.canvasesOffScreen.push(initalCanvas);
      for (let i = this.initialCanvasIndex + 1; i < this.totalCanvasCount; i++)
        d.canvasesOffScreen.push(this.#create_single_pampas_grass_canvas(
            d.x, d.y, d.scale, d.colorMultiplyer, d.rngSeed, windAffect(i)));
    }

    // 计算三维坐标x3D
    let maxX = -Infinity;
    let minX = Infinity;
    let maxY = -Infinity;
    let minY = Infinity;
    for (let d of this.data) {
      if (d.x < minX)
        minX = d.x;
      if (d.x > maxX)
        maxX = d.x;
      if (d.y < minY)
        minY = d.y;
      if (d.y > maxY)
        maxY = d.y;
    }
    for (let d of this.data) {
      const w = ((d.y - minY) + (maxY - d.y) * this.grass3DDistanceMin) /
                (maxY - minY);
      const x3D = (1 - w) / 3 + w * (maxX - d.x) / (maxX - minX);
      // 上面的数字改成别的数可以让风看起来从别的方向吹来
      d.x3D = x3D;
    }
  }
  /**
   * 注册一个包含单株蒲苇的canvas到全局变量this.data中，
   * 供后续计算其他帧使用。
   * 返回一个包含蒲苇的img元素。
   */
  register_single_pampas_grass_canvas(x, y, scale = 1,
                                      color_multiplyer = "#FFFFFF") {
    const rngSeed = Math.floor(Math.random() * 528491);
    const canvas = this.#create_single_pampas_grass_canvas(
        x, y, scale, color_multiplyer, rngSeed, 1);

    this.data.push({
      x : x,
      y : y,
      x3D : 0,       // 在compute_offscreen_canvases中计算
      bent : 0,      // 每帧计算
      bentSpeed : 0, // 每帧计算
      scale : scale,
      colorMultiplyer : color_multiplyer,
      nowCanvasIndex : this.initialCanvasIndex,
      rngSeed : rngSeed,
      canvasOnScreen : canvas,
      ctx : canvas.getContext("2d"),
      canvasesOffScreen : []
    });
    return canvas;
  }
  /**
   * 创建一个包含单株蒲苇的、尺寸大致合适的独立canvas。
   * @param {number} x - canvas在父容器中的right定位值。
   * @param {number} y - canvas在父容器中的top定位值。
   * @param {number} scale - 蒲苇的缩放比例。
   * @param {string} [color_multiplyer="#FFFFFF"] - 用于生成蒲苇颜色的基础色。
   * @returns {HTMLCanvasElement} -
   * 返回一个绝对定位的、包含蒲苇的canvas元素。
   */
  #create_single_pampas_grass_canvas(x, y, scale = 1,
                                     color_multiplyer = "#FFFFFF",
                                     rng_seed = Math.random(),
                                     wind_affect = 1) {
    // 1. 根据缩放比例计算蒲苇的参数
    const pgd = Array.from({length : this.pgd.length},
                           (_, i) => this.pgd[i] *
                                     Math.pow(scale, this.pgd_scale_factor[i]));
    const adjusted_color = Grass.get_adjusted_color(color_multiplyer);

    // 2. 创建一个足够大的画布来绘制蒲苇，避免图像被裁剪
    //    尺寸可以基于主要长度参数进行估算，并增加一些余量
    const canvasWidth = Math.ceil(pgd[0] * scale * 2 + pgd[10] * scale * 2);
    const canvasHeight = Math.ceil(pgd[0] * scale * 3);
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    // 3. 在画布的特定位置开始绘制，确保蒲苇完整绘制在画布内
    //    起始点选在左下角区域
    const startPosition = [ 2, canvasHeight + 1 ];
    this.#draw_pampas_grass(startPosition, ctx, adjusted_color, pgd, rng_seed,
                            wind_affect);

    // 4. 设置最终canvas的样式
    canvas.style.position = "absolute";
    canvas.style.right = `${x - canvasWidth}px`;
    canvas.style.top = `${y - canvasHeight}px`;
    canvas.style.zoom = this.pixelSize;

    // 5. 返回配置好的canvas
    return canvas;
  }

  // 获取根据天空的光线调整后的颜色
  // color_multiplyer: 用于调整颜色的乘色器，默认为白色（不改变颜色）
  static get_adjusted_color(color_multiplyer = "#FFFFFF") {
    // const pampas_color = ["#D7D1BA", "#A89268", "#426C13"];
    // const pampas_color = ["#E1D6AB", "#B5AF9F", "#6B6A54"];
    const pampas_color = [ "#F5F1E8", "#DCCBB2", "#B9A99A" ];

    // 来自主脚本的颜色
    const light_color = interpolate_time_color(currentHour, lightColorDict);
    // 光线影响
    return pampas_color.map(
        (color) => rgb2hex(
            ...colorMultiply(
                colorMultiply(hex2rgb(color), light_color),
                hex2rgb(color_multiplyer),
                ),
            ),
    );
  }
}
