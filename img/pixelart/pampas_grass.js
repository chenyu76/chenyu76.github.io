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
    this.a = (this.seed | 0) || 114514;
  }

  /**
   * Xorshift32生成下一个伪随机数（0 到 1 之间的浮点数，不包括 1）。
   * 很垃圾但是很快的算法。
   * 注意：Xorshift 的种子不能设置为 0！
   *       Xorshift32 的周期是 $2^{32}-1$！
   * @returns {number} 一个在 [0, 1) 区间的浮点数。
   */
  uniform() {
    let x = this.a;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.a = x;
    return (x >>> 0) / 4294967296;
  }

  // 慢了些，没有必要
  uniform_Mulberry32() {
    // 这是一系列位操作，旨在以一种确定性但看似随机的方式搅乱数字
    let t = this.a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    // 最终结果经过 XOR 和右移操作，然后除以 2^32，将其映射到 [0, 1) 区间
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  // 生成一个真的符合正态分布的随机数，使用 Box-Muller 变换，没有必要
  normal_box_muller(mean = 0, stdDev = 1, avoidOutliers = true) {
    let u1 = this.uniform();
    let u2 = this.uniform();
    let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    if (avoidOutliers && Math.abs(z0) > 3) {
      return this.normal_box_muller(mean, stdDev);
    }
    return z0 * stdDev + mean;
  }
  // 假的正态分布，差不多但是比Box-Muller 变换快很多。
  normal(mean = 0, stdDev = 1) {
    return (this.uniform() + this.uniform() + this.uniform() - 1.5) * 2.0 *
               stdDev +
           mean;
  }

  setSeed(newSeed) {
    this.seed = newSeed;
    this.a = (this.seed | 0) || 114514;
  }
}

/**
 * 假ctx类
 * 用于计算蒲苇需要的canvas尺寸
 * 传入这个类的实例到绘制函数draw_pampas_grass中
 * 实现setPixel方法，记录最大/最小x和y
 */
class FakeCtx {
  constructor() {
    this.maxX = -Infinity;
    this.maxY = -Infinity;
    this.minX = Infinity;
    this.minY = Infinity;
  }
  setColor(_hex) {} // no-op, 仅用于满足鸭子类型接口
  setPixel(x, y) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x > this.maxX)
      this.maxX = x;
    if (y > this.maxY)
      this.maxY = y;
    if (x < this.minX)
      this.minX = x;
    if (y < this.minY)
      this.minY = y;
  }
}

/**
 * 写入 ImageData 像素缓冲区的轻量上下文
 * 实现与 FakeCtx 相同的鸭子类型接口 (setColor + setPixel)
 * 用于替代 CanvasRenderingContext2D 的 fillStyle/fillRect 调用
 */
class ImageDataContext {
  constructor(imageData) {
    this._data = imageData.data;
    this._w = imageData.width;
    this._h = imageData.height;
    this._r = 0;
    this._g = 0;
    this._b = 0;
  }
  setColor(hex) {
    const rgb = hex2rgb(hex);
    this._r = rgb[0];
    this._g = rgb[1];
    this._b = rgb[2];
  }
  setPixel(x, y) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || x >= this._w || y < 0 || y >= this._h)
      return;
    const i = (y * this._w + x) * 4;
    this._data[i] = this._r;
    this._data[i + 1] = this._g;
    this._data[i + 2] = this._b;
    this._data[i + 3] = 255;
  }
}

class Grass {
  constructor(pixelSize) {
    this.pixelSize = pixelSize; // canvas的CSS zoom大小

    this.rng = new SeededRandom();

    // this.xCapability = 200; // x方向容量
    // this.yCapability = 30; // y方向容量
    /** @type {?number} */ this.animationFrameId = null; // 动画帧ID
    this.initialCanvasIndex = 2; // 初始帧在离屏canvas数组中的索引
    this.totalCanvasCount = 7;   // 最大离屏canvas总数,最小的是1
    /**
     * 蒲苇数据
     * x: 在父容器中的x位置，right定位
     * y: 在父容器中的y位置
     * pgd: 蒲苇参数，计算不同帧时就不用再次计算了
     * adjustedColor: 蒲苇颜色，同上
     * scale: 缩放比例
     * rngSeed: 随机数生成器种子
     * x3D: 在三维空间中的x坐标(0到1)，我希望风从左到右所以0是左边
     * nowCanvasIndex: 当前显示的canvas在离屏canvas数组中的索引
     * bent: 当前蒲苇的弯曲度
     * bentSpeed: 蒲苇弯曲度变化速度
     * ctx: canvasOnScreen的2D上下文
     * canvasOnScreen: 在屏幕上的canvas
     * canvasesOffScreen: 离屏canvas数组
     * @type {!Array<{
     *   x: number,
     *   y: number,
     *   pgd: Array<number>,
     *   adjustedColor: Array<string>,
     *   scale: number,
     *   rngSeed: number,
     *   x3D: number,
     *   jitterFrequency: number,
     *   nowCanvasIndex: number,
     *   bent: number,
     *   bentSpeed: number,
     *   ctx: CanvasRenderingContext2D,
     *   canvasOnScreen: HTMLCanvasElement,
     *   canvasesOffScreen: Array<HTMLCanvasElement>
     * }>}
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
    this.updateInterval = 100;      // 每隔多少毫秒更新一次动画

    this.pgd_scale_factor =
        [ 1, 1, -1.25, -1.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 ];
    this.pgd = [
      80,
      20,
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
      80, // 不同株的草在同一组中的最大偏移范围x
      7,  // 不同株的草在同一组中的最大偏移范围y
    ];
  }

  // 抛物线的近似弧长所对应的长度
  _parabola_right_length_for_arc_length_approx(L, a) {
    // 这个比较数学上正确，但是不好看
    // return Math.sqrt((Math.sqrt(1 + 64 * a * L * L) - 1) / (8 * a));
    // 这个比较好看，但是不太数学
    return (Math.sqrt((Math.sqrt(1 + 64 * a * L * L) - 1) / (8 * a))) / 2 +
           (L / 3);
  }

  // 调用多个 draw_pampas_grass
  _draw_bunch_pampas_grass(start_x, start_y, pen, p_color, pgd,
                           rng_seed = Math.random() * 528491, wind_affect = 1) {
    this.rng.setSeed(rng_seed);
    const bunchNum = 8;
    const seeds = Array.from({length : bunchNum},
                             () => { return this.rng.uniform() * 528491; });
    for (let i = 0; i < bunchNum; i++) {
      this._draw_pampas_grass(start_x + Math.round(seeds[i] % pgd[16]),
                              start_y + Math.round(i / bunchNum * pgd[17]), pen,
                              p_color, pgd, seeds[i], wind_affect);
    }
    return pen;
  }

  /**
   * 绘制一条芦苇
   *
   * @param {number} start_x - 芦苇起始点在画布上的全局坐标 x
   * @param {number} start_y - 芦苇起始点在画布上的全局坐标 y
   * @param {Object} pen - 写入像素的上下文对象 (如 FakeCtx /
   *     ImageDataContext)，需包含 setColor 和 setPixel 方法
   * @param {Array<string>} p_color -
   *     颜色数组，包含三种颜色，分别对应三个等级的分支与主干
   * @param {Array<number>} pgd - 芦苇控制参数数组 (Pampas Grass
   *     Data)，详细索引映射如下：
   *   - pgd[0], pgd[1] : 苇草主干基础长度的 [均值, 标准差]
   *   - pgd[2], pgd[3] : 苇草主干弯曲度 (bent) 的 [均值, 标准差]
   *   - pgd[4], pgd[5] : 分支在主干上长出的起始位置比例的 [均值, 标准差]
   *   - pgd[6], pgd[7] : 分支长出时初始斜率干扰项的 [均值, 标准差]
   *   - pgd[8], pgd[9] : 分支物理材料抗弯刚度 (EI) 的 [均值, 标准差]
   *   - pgd[10, 12, 14]: 分别对应 1、2、3 等级分支的基础物理长度
   * (base_branch_length)
   *   - pgd[11, 13, 15]: 分别对应 1、2、3 等级分支的生长密度/生成概率 (percent)
   * @param {number} [rng_seed] -
   *     随机数生成器种子，默认通过随机数离散放大生成，确保形态的确定性
   * @param {number} [wind_affect=1] - 风力影响系数，乘算到主干弯曲度上，默认为
   *     1
   * @returns {Object} 返回传入的 pen 像素对象
   */
  _draw_pampas_grass(start_x, start_y, pen, p_color, pgd,
                     rng_seed = Math.random() * 528491, wind_affect = 1) {
    this.rng.setSeed(rng_seed);

    // 计算主干弯曲度：从正态分布中抽取随机弯曲度
    const randNormal = this.rng.normal(pgd[2], pgd[3]);
    // 阈值安全保护：如果随机出的弯曲度过小，则强制使用均值
    // pgd[2]，最后叠加上风力系数
    const bent = (randNormal > pgd[3] / 2 ? randNormal : pgd[2]) * wind_affect;

    // 计算主干在纵向(y轴)上的总跨度：利用弧长近似公式，根据期望的物理长度反推抛物线纵向长度
    const length = this._parabola_right_length_for_arc_length_approx(
        Math.round(this.rng.normal(pgd[0], pgd[1])), bent);

    // 计算分支在主干上长出的起点纵向纵坐标（由长度乘以一个比例分布决定，通常长在植物中上段）
    const branch_start = Math.round(length * this.rng.normal(pgd[4], pgd[5]));

    // 预计算主干导数的常数项
    // （对应开口向右抛物线 x = a * y^2 的导数 dx/dy = 2 * a * y 中的 2 * a）
    const two_bent = 2 * bent;

    for (let b = 0; b < 3; b++) {
      const color = p_color[b];                   // 当前等级分支的像素颜色
      const base_branch_length = pgd[10 + b * 2]; // 当前等级分支的基础参考长度
      const percent =
          pgd[11 + b * 2]; // 当前等级分支的生长密度门槛（0~1 概率值）

      pen.setColor(color);

      // 沿着主干生长区间 [branch_start, length]，逐像素行遍历是否长出分支
      for (let y = branch_start; y < length; y++) {
        // 控制分支密度：若生成的均匀随机数大于设定概率，则跳过当前位置不生成分支
        if (this.rng.uniform() > percent)
          continue;

        // 正态分布随机决定当前单根分支的具体物理长度
        const branch_length = Math.round(
            this.rng.normal(base_branch_length, base_branch_length / 2));

        // 开口向右抛物线方程：x = a*y^2 + start_x ；
        // y轴由于向上生长取反：y_global = -y + start_y
        const f1_y = bent * y * y + start_x;
        const f2_y = -y + start_y;

        // 计算当前 y 坐标下主干的切线斜率 (展开原 _parabola_right_derivative
        // 逻辑)
        const df_y = two_bent * y;
        // 分支起始长出的基准斜率 k = 主干当前切线斜率 - 随机斜率干扰项
        const k = df_y - this.rng.normal(pgd[6], pgd[7]);

        const L = base_branch_length; // 悬臂梁的物理跨度标准
        const EI = this.rng.normal(
            pgd[8], pgd[9]); // 材料的抗弯刚度 (弹性模量 E * 截面惯性矩 I)
        const q = 1;         // 分支承受的简化均布载荷 (模拟重力下垂或风载)

        // 预计算材料力学悬臂梁挠度公式中与局部变量 x
        const q_over_24EI = q / (24 * EI);
        const four_L = L * 4;
        const six_L_square = L * L * 6;

        for (let x = 0; x < branch_length; x++) {
          // 展开原 _homogeneous_cantilever_beam 均匀受载悬臂梁公式
          // 横坐标全局位置：顺着主干横坐标顺势向右自然延伸
          const g1_x = f1_y + x;
          // 纵坐标全局位置：在主干纵坐标基础上，叠加初始斜率倾斜量以及典型的悬臂梁四次多项式下垂挠度方程：
          // y_local = (q / 24EI) * x^2 * (x^2 - 4 * L * x + 6 * L^2) + k * x
          const g2_x =
              f2_y + x * x * q_over_24EI * (x * x - four_L * x + six_L_square) +
              k * x;
          pen.setPixel(g1_x, g2_x);
        }
      }
    }

    // 单独绘制整条芦苇的抛物线主干
    pen.setColor(p_color[2]);
    for (let y = 0; y < length; y++) {
      pen.setPixel(bent * y * y + start_x, -y + start_y);
    }

    return pen;
  }
  /*
   * 给其他模块调用的函数
   * 计算在x3D位置，timestamp时间点的总风力
   */
  get_wind_strength(x3D, timestamp) {
    let total_wind_force = 0;
    for (let wind of this.winds)
      total_wind_force += wind.f(x3D, timestamp);
    return total_wind_force;
  }

  /**
   * 开始移动蒲苇元素的动画
   */
  start_move_element_animation() {
    const frameId = this.animationFrameId;
    if (frameId !== null)
      cancelAnimationFrame(frameId);
    this.lastAnimationTime = performance.now();
    this.animationFrameId = requestAnimationFrame(
        (timestamp) => this.moveElementAnimation(timestamp));
  }
  stop_move_element_animation() {
    const frameId = this.animationFrameId;
    if (frameId !== null)
      cancelAnimationFrame(frameId);
    this.animationFrameId = null;
  }
  toggle_move_element_animation() {
    if (this.animationFrameId === null)
      this.start_move_element_animation();
    else
      this.stop_move_element_animation();
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
    // 暂停时不更新动画，只更新时间戳
    if (isPaused) {
      this.lastAnimationTime = timestamp;
      this.animationFrameId = requestAnimationFrame(
          (timestamp) => this.moveElementAnimation(timestamp));
      return;
    }

    // 过滤掉已经结束的风
    this.winds = this.winds.filter(w => timestamp <= w.t);

    // 创建新风
    if (timestamp - this.lastWindCreateTime > this.nextWindCreateInterval) {
      this.winds.push(this._create_wind_function(timestamp));
      this.nextWindCreateInterval = this.rng.normal(2000, 500);
      this.lastWindCreateTime = timestamp;
    }

    // 间隔太久就直接更新lastAnimationTime，避免风力过大
    let deltaT = timestamp - this.lastAnimationTime;
    if (deltaT > 500) {
      deltaT = 500;
    }
    const deltaT_s = deltaT / 1000;

    // let count = Math.random() < 0.5;
    for (let d of this.data) {

      // 计算蒲苇当前受到的风力
      let total_wind_force = 0;
      for (let wind of this.winds)
        total_wind_force += wind.f(d.x3D, timestamp);

      // 根据风力调整蒲苇的弯曲度
      d.bentSpeed += total_wind_force * deltaT_s;
      // 蒲苇越弯，受到的恢复力越大
      d.bentSpeed -= d.bent * this.antiBend * deltaT_s;
      // 阻尼，防止一直摆动
      d.bentSpeed *= 0.999;
      d.bent += d.bentSpeed * deltaT_s;

      // 更新蒲苇显示的canvas
      let newCanvasIndex =
          Math.round((this.initialCanvasIndex + d.bent * 3) /
                     this.totalCanvasCount * d.canvasesOffScreen.length);
      // 限制最大值，在边缘时抖动
      if (newCanvasIndex > d.canvasesOffScreen.length - 1)
        newCanvasIndex =
            d.canvasesOffScreen.length - 1 -
            (Math.round(Math.abs(timestamp / d.jitterFrequency + d.rngSeed)) %
             2);
      // 限制最小值
      newCanvasIndex = Math.max(newCanvasIndex, 0);

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
  _create_wind_function(t_offset = 0) {
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
      // 计算三维坐标x3D
      const w = ((d.y - minY) + (maxY - d.y) * this.grass3DDistanceMin) /
                (maxY - minY);
      const x3D = (1 - w) / 3 + w * (maxX - d.x) / (maxX - minX);
      // 上面的数字改成别的数可以让风看起来从别的方向吹来
      d.x3D = x3D;

      // 计算不同帧
      // 不同距离的蒲苇帧数不同
      let initialCanvasIndex =
          Math.round(this.initialCanvasIndex * (d.y - minY) / (maxY - minY));
      let totalCanvasCount =
          Math.round(this.totalCanvasCount * (d.y - minY) / (maxY - minY));

      // 在初始位置时是1, 递增
      // 线性的应该够用
      const windAffect = (i) => (i - initialCanvasIndex) / totalCanvasCount + 1;

      const initalCanvas =
          /** @type {!HTMLCanvasElement} */ (document.createElement("canvas"));
      initalCanvas.width = d.canvasOnScreen.width;
      initalCanvas.height = d.canvasOnScreen.height;
      const ctx = initalCanvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(d.canvasOnScreen, 0, 0);

      initialCanvasIndex = Math.round(initialCanvasIndex);
      totalCanvasCount = Math.round(totalCanvasCount);
      for (let i = 0; i < initialCanvasIndex; i++)
        d.canvasesOffScreen.push(this._create_single_pampas_grass_canvas(
            d.x, d.y, d.rngSeed, windAffect(i), d.canvasOnScreen.width,
            d.canvasOnScreen.height, d.pgd, d.adjustedColor));
      d.canvasesOffScreen.push(initalCanvas);
      for (let i = initialCanvasIndex + 1; i < totalCanvasCount; i++)
        d.canvasesOffScreen.push(this._create_single_pampas_grass_canvas(
            d.x, d.y, d.rngSeed, windAffect(i), d.canvasOnScreen.width,
            d.canvasOnScreen.height, d.pgd, d.adjustedColor));

      // 删除不需要的变量，释放内存
      delete d.x;
      delete d.y;
      delete d.pgd;
      delete d.adjustedColor;
      delete d.scale;
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

    const fakeCtx = [ new FakeCtx(), new FakeCtx() ];
    const pgd = Array.from({length : this.pgd.length},
                           (_, i) => this.pgd[i] *
                                     Math.pow(scale, this.pgd_scale_factor[i]));
    const adjusted_color = Grass.get_adjusted_color(color_multiplyer);
    const whData =
        [ 1, 2 ].map( // 这里的1, 2 是上面的 windAffect 函数最大最小值
            (num, i) => this._draw_bunch_pampas_grass(
                0, 0, fakeCtx[i], adjusted_color, pgd, rngSeed,
                num - this.initialCanvasIndex / this.totalCanvasCount));

    const width =
        whData.map(c => c.maxX - c.minX).reduce((a, b) => Math.max(a, b)) + 20;
    const height =
        whData.map(c => c.maxY - c.minY).reduce((a, b) => Math.max(a, b)) + 2;

    const canvas = this._create_single_pampas_grass_canvas(
        x, y, rngSeed, 1, width, height, pgd, adjusted_color);

    this.data.push({
      x : x,
      y : y,
      pgd : pgd,                      // 蒲苇参数，计算不同帧时就不用再次计算了
      adjustedColor : adjusted_color, // 蒲苇颜色，同上
      x3D : 0,                        // 在compute_offscreen_canvases中计算
      bent : 0,                       // 每帧计算
      bentSpeed : 0,                  // 每帧计算
      scale : scale,
      nowCanvasIndex : this.initialCanvasIndex,
      rngSeed : rngSeed,
      jitterFrequency : Math.round(Math.abs(rngSeed)) % 140 + 180,
      canvasOnScreen : canvas,
      ctx : /** @type {!CanvasRenderingContext2D} */ (canvas.getContext("2d")),
      canvasesOffScreen : []
    });
    return canvas;
  }
  /**
   * 创建一个包含单株蒲苇的、尺寸大致合适的独立canvas。
   * @param {number} x - canvas在父容器中的right定位值。
   * @param {number} y - canvas在父容器中的top定位值。
   * @param {number} rng_seed - 随机数生成器的种子。
   * @param {number} wind_affect - 风对蒲苇的影响程度。
   * @param {number} canvasWidth - 画布宽度
   * @param {number} canvasHeight - 画布高度
   * @param {Array<number>} pgd - 蒲苇参数数组
   * @param {Array<string>} adjusted_color - 蒲苇颜色数组
   * @returns {!HTMLCanvasElement} -
   * 返回一个绝对定位的、包含蒲苇的canvas元素。
   */
  _create_single_pampas_grass_canvas(x, y, rng_seed, wind_affect, canvasWidth,
                                     canvasHeight, pgd, adjusted_color) {

    // 创建画布来绘制蒲苇，避免图像被裁剪
    const canvas =
        /** @type {!HTMLCanvasElement} */ (document.createElement("canvas"));
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    const imageData = ctx.createImageData(canvasWidth, canvasHeight);
    const idCtx = new ImageDataContext(imageData);

    this._draw_bunch_pampas_grass(2, canvasHeight + 1, idCtx, adjusted_color,
                                  pgd, rng_seed, wind_affect);

    ctx.putImageData(imageData, 0, 0);

    canvas.style.position = "absolute";
    canvas.style.right = `${x - canvasWidth}px`;
    canvas.style.top = `${y - canvasHeight}px`;
    canvas.style.zoom = this.pixelSize;

    return canvas;
  }

  // 获取根据天空的光线调整后的颜色
  // color_multiplyer:
  // 用于调整颜色的乘色器，默认为白色（不改变颜色）
  static get_adjusted_color(color_multiplyer = "#FFFFFF") {
    // const pampas_color = ["#D7D1BA", "#A89268", "#426C13"];
    // const pampas_color = ["#E1D6AB", "#B5AF9F", "#6B6A54"];
    const pampas_color = [ "#F5F1E8", "#DCCBB2", "#B9A99A" ];

    // 来自主脚本的颜色
    const light_color = interpolate_time_color(currentHour, lightColorDict);
    // 光线影响
    return pampas_color.map(
        (color) => rgb2hex(
            colorMultiply(
                colorMultiply(hex2rgb(color), light_color),
                hex2rgb(color_multiplyer),
                ),
            ),
    );
  }
}
