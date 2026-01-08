/**
 * 用于解析并播放基于 GIF 矩阵数据
 * 在我们的场景里，是一只atri
 */
class GifRenderer {
  /**
   * @param {Object} config 配置对象
   * @param {number} config.startX - Canvas 定位的 right 值
   * @param {number} config.startY - Canvas 定位的 top 值
   * @param {number} config.pixelSize - 像素缩放比例
   * @param {Array} config.colorList - 颜色列表，索引0必须是 "skip"
   * @param {Array} config.gifMatrix - 压缩后的动画数据
   * @param {Object} config.lightColorDict - 光照颜色字典
   * @param {Function} config.getFrameCount(timestamp) -
   *     获取当前逻辑帧数的函数（外部提供）
   */
  constructor({
    startX,
    startY,
    pixelSize,
    colorList,
    gifMatrix,
    lightColorDict,
    getFrameCount
  }) {
    this.startX = startX;
    this.startY = startY;
    this.pixelSize = pixelSize;
    this.colorList = colorList;
    this.gifMatrix = gifMatrix;
    this.lightColorDict = lightColorDict;
    this.getFrameCount = getFrameCount;

    this.width = gifMatrixWidth;
    this.height = gifMatrixHeight;

    // 创建主显示 Canvas
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.position = "absolute";
    this.canvas.style.top = `${this.startY}px`;
    this.canvas.style.right = `${this.startX}px`;
    this.canvas.style.zoom = this.pixelSize;
    // 关闭图像平滑，保持像素风格
    this.ctx.imageSmoothingEnabled = false;

    // 预渲染缓存
    this.frames = [];
    this._preRenderFrames();

    // 动画状态
    this.lastRenderedFrame = -1;
    this.isPlaying = false;

    // 绑定 update 方法防止 this 丢失
    this.update = this.update.bind(this);
  }

  /**
   * 预渲染所有帧
   */
  _preRenderFrames() {
    // 创建一个临时的离屏 canvas 用于绘制每一帧的状态
    const bufferCanvas = document.createElement("canvas");
    bufferCanvas.width = this.width;
    bufferCanvas.height = this.height;
    const bufferCtx = bufferCanvas.getContext("2d");

    const light_color =
        interpolate_time_color(currentHour, this.lightColorDict);

    // 维护一个 visited 数组用于流式布局定位
    // 0: 未填充, 1: 已填充
    // 每一帧开始时，visited 不会清空！因为下一帧要在上一帧的基础上画
    // 但是 Python 脚本的逻辑是：每一帧的数据是基于上一帧的差异。
    // 所以我们需要维护一个持久的画面 buffer。
    for (let f = 0; f < this.gifMatrix.length; f++) {
      const instructions = this.gifMatrix[f];
      const visited =
          new Uint8Array(this.width * this.height); // 当前帧的填空逻辑需要
      let cursor = 0;

      // 遍历指令
      for (let i = 0; i < instructions.length; i++) {
        let w = 1;
        let h = 1;
        let colorIdx = 0;
        if (typeof instructions[i] === "number") {
          // 仅颜色索引，宽高均为1
          colorIdx = instructions[i];
        } else if (instructions[i].length === 3) {
          [w, h, colorIdx] = instructions[i];
        } else {
          [w, colorIdx] = instructions[i];
        }

        // 1. 寻找光标位置 (流式布局)
        while (cursor < visited.length && visited[cursor] === 1) {
          cursor++;
        }
        if (cursor >= visited.length)
          break;

        const x = cursor % this.width;
        const y = Math.floor(cursor / this.width);

        // 2. 标记占用
        for (let row = 0; row < h; row++) {
          const rowOffset = (y + row) * this.width;
          for (let col = 0; col < w; col++) {
            if (rowOffset + x + col < visited.length) {
              visited[rowOffset + x + col] = 1;
            }
          }
        }

        // 3. 绘制
        const rawColor = this.colorList[colorIdx];

        if (rawColor === "skip") {
          // Skip: 什么都不做，BufferCtx 保留上一帧的像素
          // 这就是差异渲染的核心
        } else if (rawColor === "transparent") {
          // Transparent: 需要擦除
          bufferCtx.clearRect(x, y, w, h);
        } else {
          // 正常颜色: 应用光照并绘制
          let finalColor = rawColor;
          // 应用光照逻辑
          if (rawColor.startsWith("#")) {
            finalColor =
                rgb2hex(...colorMultiply(hex2rgb(rawColor), light_color));
          }
          bufferCtx.fillStyle = finalColor;
          bufferCtx.fillRect(x, y, w, h);
        }
      }

      // 4. 将当前帧生成的完整图像保存为 Canvas
      // 这样运行时只需要 drawImage
      const frameCanvas = document.createElement("canvas");
      frameCanvas.width = this.width;
      frameCanvas.height = this.height;
      frameCanvas.getContext("2d").drawImage(bufferCanvas, 0, 0);
      this.frames.push(frameCanvas);
    }
  }

  /**
   * 对外接口：启动动画
   */
  start() {
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.lastRenderedFrame = -1;
      requestAnimationFrame(this.update);
    }
  }

  /**
   * 对外接口：停止动画
   */
  stop() { this.isPlaying = false; }

  /**
   * 每一帧调用的更新函数
   */
  update(timestamp) {
    if (!this.isPlaying)
      return;

    let targetFrameIndex = this.getFrameCount(timestamp);

    // 确保索引在范围内 [0, length-1]
    // 如果 getFrameCount 返回的是无限增长的 tick，取模
    targetFrameIndex = targetFrameIndex % this.frames.length;
    if (targetFrameIndex < 0)
      targetFrameIndex += this.frames.length; // 处理倒序

    // 2. 只有当帧发生变化时才重绘 (Dirty Check)
    if (targetFrameIndex !== this.lastRenderedFrame) {
      this.lastRenderedFrame = targetFrameIndex;
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.ctx.drawImage(this.frames[targetFrameIndex], 0, 0);
    }

    requestAnimationFrame(this.update);
  }

  /**
   * 获取 DOM 元素，用于添加到页面中
   */
  getElement() { return this.canvas; }
}
