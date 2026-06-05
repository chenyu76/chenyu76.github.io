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
  static ASCII_BASE = 32;
  static ASCII_RANGE = 64;

  constructor({canvas, fillColor = [ 255, 255, 255 ], lineGap = 0}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.lineGap = lineGap;

    let gBase =
        Array.from(PIXEL_GLYPH_DATA.glyphsBaseline)
            .map(char => char.charCodeAt(0) - PixelTextRenderer.ASCII_BASE);
    let gWidth =
        Array.from(PIXEL_GLYPH_DATA.glyphsWidth)
            .map(char => char.charCodeAt(0) - PixelTextRenderer.ASCII_BASE);
    this.glyphs = PIXEL_GLYPH_DATA.glyphsEncoded.map((g, i) => ({
                                                       _encoded : g,
                                                       baseline : gBase[i],
                                                       width : gWidth[i],
                                                       _pixels : null
                                                     }));

    this.setFillColor(fillColor);
    this.lineBaseOffset = PIXEL_GLYPH_DATA.lineBaseOffset;
    this.lineHeight = PIXEL_GLYPH_DATA.lineRowHeight + this.lineGap;
  }

  /**
   * Decode a single base-64 encoded index string to an array of glyph indices.
   * Each pair of characters decodes to one index (shifted by +1 so -1 becomes
   * 0).
   */
  _decodeIndexList(encoded) {
    return Array(encoded.length / 2)
        .fill(null)
        .map((_, i) =>
                 (encoded.charCodeAt(2 * i) - PixelTextRenderer.ASCII_BASE) *
                     PixelTextRenderer.ASCII_RANGE +
                 encoded.charCodeAt(2 * i + 1) - PixelTextRenderer.ASCII_BASE -
                 1);
  }

  /**
   * 解码 6-bit ASCII 编码的字符串 -> 二维布尔数组
   */
  _decodeGlyph(encoded, width) {
    const base = PixelTextRenderer.ASCII_BASE;
    const totalBits = encoded.length * 6;
    const height = Math.floor(totalBits / width);
    const pixels = new Array(height);

    for (let y = 0; y < height; y++) {
      const row = new Array(width);
      const rowOffset = y * width;

      for (let x = 0; x < width; x++) {
        const bitIndex = rowOffset + x;

        if (bitIndex >= totalBits) {
          row[x] = false;
        } else {
          const charIndex = (bitIndex / 6) | 0;
          const value = encoded.charCodeAt(charIndex) - base;
          row[x] = ((value >> (5 - (bitIndex - charIndex * 6))) & 1) === 1;
        }
      }
      pixels[y] = row;
    }
    return pixels;
  }

  _getGlyphPixels(idx) {
    const g = this.glyphs[idx];
    return g._pixels === null
               ? g._pixels = this._decodeGlyph(g._encoded, g.width)
               : g._pixels;
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
      } else {
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

      if (drawn >= prevVisibleChars) {
        const glyph = this.glyphs[idx];
        const pixels = this._getGlyphPixels(idx);
        const topY = baselineY - glyph.baseline;

        for (let y = 0; y < pixels.length; y++) {
          for (let x = 0; x < glyph.width; x++) {
            if (pixels[y][x]) {
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
    const renderer = new PixelTextRenderer(
        {canvas : canvas, fillColor : fillColor, lineGap : 1});

    const lists = PIXEL_GLYPH_DATA.indexLists;

    const timePerPixel = 0.02;
    const displayTimePerLine = 4;
    let lastEncoded = null;
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

        let encoded;
        do {
          encoded = lists[Math.floor(Math.random() * lists.length)];
        } while (lists.length > 1 && encoded === lastEncoded);
        lastEncoded = encoded;
        const list = renderer._decodeIndexList(encoded);

        const size = renderer.getSize(list);
        const offsetX = Math.max(Math.round(targetX - size.width / 2), 12);
        const offsetY = Math.round((gridH - size.height) / 2);

        let total = 0;
        const delays = list.map(item => total +=
                                (item == -1 ? 4 : renderer.glyphs[item].width) *
                                timePerPixel);

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
