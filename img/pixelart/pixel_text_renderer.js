/**
 * 解析 PIXEL_GLYPH_DATA 并将像素文字渲染到 Canvas
 */
class PixelTextRenderer {
  /**
   * @param {Object} config
   * @param {HTMLCanvasElement} config.canvas - 目标 canvas
   * @param {number[]} [config.fillColor=[255,255,255]] - 着色像素颜色 [R,G,B]
   * @param {number} [config.lineGap=0] - 行间额外间距（像素）
   */
  constructor({canvas, fillColor = [ 255, 255, 255 ], lineGap = 0}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.lineGap = lineGap;

    this.glyphs =
        PIXEL_GLYPH_DATA.glyphs.map(g => ({
                                      pixels : this._decodeGlyph(g[0], g[2]),
                                      baseline : g[1],
                                      width : g[2]
                                    }));

    this.setFillColor(fillColor);
    this._calcLineMetrics();
  }

  /**
   * 解码 6-bit ASCII 编码的字符串 -> 二维布尔数组
   */
  _decodeGlyph(encoded, width) {
    if (width === 0 || encoded.length === 0)
      return [];

    const totalBits = encoded.length * 6;
    const height = Math.ceil(totalBits / width);
    const pixels = [];

    for (let y = 0; y < height; y++) {
      const row = [];
      const rowStart = y * width;
      for (let x = 0; x < width; x++) {
        const bitIndex = rowStart + x;
        if (bitIndex >= totalBits)
          row.push(false);
        else {
          const charIndex = (bitIndex / 6) | 0;
          const value = encoded.charCodeAt(charIndex) - 32;
          row.push(((value >> (5 - (bitIndex - charIndex * 6))) & 1) === 1);
        }
      }
      pixels.push(row);
    }
    return pixels;
  }

  /**
   * 根据所有字形计算行高和基线偏移
   */
  _calcLineMetrics() {
    let maxAbove = 0;
    let maxBelow = 0;
    for (const g of this.glyphs) {
      if (g.pixels.length === 0)
        continue;
      const above = g.baseline;
      const below = g.pixels.length - g.baseline;
      if (above > maxAbove)
        maxAbove = above;
      if (below > maxBelow)
        maxBelow = below;
    }
    this.lineBaseOffset = maxAbove;
    this.lineHeight = maxAbove + maxBelow + this.lineGap;
  }

  /**
   * 计算给定 indexList 需要的 canvas 尺寸（像素）
   */
  _calcSize(indexList) {
    let totalWidth = 0;
    let maxWidth = 0;
    let lineCount = 1;

    for (const idx of indexList) {
      if (idx === -1) {
        lineCount++;
        if (totalWidth > maxWidth)
          maxWidth = totalWidth;
        totalWidth = 0;
      } else if (idx >= 0 && idx < this.glyphs.length) {
        totalWidth += this.glyphs[idx].width;
      }
    }
    if (totalWidth > maxWidth)
      maxWidth = totalWidth;

    return {width : maxWidth, height : lineCount * this.lineHeight};
  }

  /**
   * 将一个 indexList 渲染到 canvas 上
   */
  render(indexList) {
    const size = this._calcSize(indexList);
    this.canvas.width = size.width;
    this.canvas.height = size.height;
    this._imageData = null;
    this.renderPartial(indexList, Infinity, 0, 0, 0);
  }

  /**
   * 获取 indexList 的尺寸（像素）
   * @returns {{ width: number, height: number }}
   */
  getSize(indexList) { return this._calcSize(indexList); }

  /**
   * 设置填充颜色
   */
  setFillColor(color) { this._rgba = [...color, 255 ]; }

  /**
   * 增量渲染 indexList 从 prevVisibleChars 到 visibleChars
   * 首次调用（prev=0）时清除画布；后续只绘制新增字符
   * @param {number[]} indexList
   * @param {number} visibleChars - 要显示的字数（包含换行符 -1）
   * @param {number} [prevVisibleChars=0] - 已绘制的字数
   * @param {number} [offsetX=0] - 渲染起始 X 偏移（像素）
   * @param {number} [offsetY=0] - 渲染起始 Y 偏移（像素）
   */
  renderPartial(indexList, visibleChars, prevVisibleChars = 0, offsetX = 0,
                offsetY = 0) {
    if (prevVisibleChars === 0)
      this._imageData = null;
    if (!this._imageData)
      this._imageData =
          this.ctx.createImageData(this.canvas.width, this.canvas.height);

    const imageData = this._imageData;
    const data = imageData.data;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const [r, g, b, a] = this._rgba;

    let cursorX = 0;
    let baselineY = this.lineBaseOffset;
    let drawn = 0;

    for (const idx of indexList) {
      if (drawn >= visibleChars)
        break;

      if (idx === -1) {
        cursorX = 0;
        baselineY += this.lineHeight;
        drawn++;
        continue;
      }

      if (idx < 0 || idx >= this.glyphs.length)
        continue;

      if (drawn >= prevVisibleChars) {
        const glyph = this.glyphs[idx];
        const topY = baselineY - glyph.baseline;

        for (let y = 0; y < glyph.pixels.length; y++) {
          for (let x = 0; x < glyph.width; x++) {
            if (glyph.pixels[y][x]) {
              const px = offsetX + cursorX + x;
              const py = offsetY + topY + y;
              if (px >= 0 && px < w && py >= 0 && py < h) {
                const pi = (py * w + px) * 4;
                data[pi] = r;
                data[pi + 1] = g;
                data[pi + 2] = b;
                data[pi + 3] = a;
              }
            }
          }
        }
      }

      cursorX += this.glyphs[idx].width;
      drawn++;
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  /**
   * 启动随机像素文字循环显示
   * 由 main.js 在 imgInit 中调用
   */
  static setupTextCycle() {
    if (PixelTextRenderer._textCycleSetup) {
      const canvas = PixelTextRenderer._textCanvas;
      const h = document.documentElement.clientHeight;
      const gridH = Math.ceil(h / pixelSize);
      const gridW = calculateGridWidth(h);
      canvas.width = gridW;
      canvas.height = gridH;
      canvas.style.zoom = pixelSize;
      if (PixelTextRenderer._triggerNext)
        PixelTextRenderer._triggerNext();
      return canvas;
    }
    PixelTextRenderer._textCycleSetup = true;

    const lists = PIXEL_GLYPH_DATA.indexLists;

    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.right = '0px';
    canvas.style.top = '0px';
    canvas.style.zIndex = '10';
    canvas.style.pointerEvents = 'none';
    PixelTextRenderer._textCanvas = canvas;

    const fillColor =
        colorAverage(isNight ? [ 255, 255, 255 ] : [ 0, 0, 0 ],
                     interpolate_time_color(currentHour, skyColorDict[0]));
    const renderer =
        new PixelTextRenderer({canvas : canvas, fillColor : fillColor});

    const timePerPixel = 0.02;
    const displayTimePerLine = 4;
    let lastList = null;
    let triggerNext = null;
    PixelTextRenderer._triggerNext = function() {
      if (triggerNext)
        triggerNext();
    };

    async function cycle() {
      while (true) {
        const gridH =
            Math.ceil(document.documentElement.clientHeight / pixelSize);
        const gridW =
            Math.ceil(document.documentElement.clientWidth / pixelSize);
        canvas.width = gridW;
        canvas.height = gridH;
        canvas.style.zoom = pixelSize;
        const targetX = Math.round(gridW * 0.39);

        let list;
        do {
          list = lists[Math.floor(Math.random() * lists.length)];
        } while (lists.length > 1 && list === lastList);
        lastList = list;

        const size = renderer.getSize(list);
        const offsetX = Math.max(Math.round(targetX - size.width / 2), 12);
        const offsetY = Math.round((gridH - size.height) / 2);

        const delays = [];
        let total = 0;
        for (const idx of list) {
          let w = 4;
          if (idx !== -1 && idx >= 0 && idx < renderer.glyphs.length) {
            w = renderer.glyphs[idx].width;
          }
          total += w * timePerPixel;
          delays.push(total);
        }

        const start = performance.now();
        let lastCount = 0;
        await new Promise(resolve => {
          function step() {
            const elapsed = (performance.now() - start) / 1000;
            let count = 0;
            while (count < delays.length && elapsed >= delays[count])
              count++;

            if (count !== lastCount) {
              renderer.renderPartial(list, count, lastCount, offsetX, offsetY);
              lastCount = count;
            }

            if (count >= list.length) {
              resolve();
            } else {
              requestAnimationFrame(step);
            }
          }
          step();
        });

        const lines = list.filter(c => c === -1).length + 1;
        await new Promise(resolve => {
          const t =
              setTimeout(resolve, 30000 + lines * displayTimePerLine * 1000);
          triggerNext = function() {
            clearTimeout(t);
            triggerNext = null;
            resolve();
          };
        });
      }
    }

    cycle();
    return canvas;
  }
}
