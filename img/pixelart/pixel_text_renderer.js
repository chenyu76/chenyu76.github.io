/**
 * 解析 PIXEL_GLYPH_DATA 并将像素文字渲染到 Canvas
 */
class PixelTextRenderer {
  /**
   * @param {Object} config
   * @param {HTMLCanvasElement} config.canvas - 目标 canvas
   * @param {number} [config.pixelSize=1] - 像素缩放倍数
   * @param {string} [config.fillColor='#000'] - 着色像素颜色
   * @param {number} [config.lineGap=0] - 行间额外间距（像素，缩放前）
   */
  constructor({ canvas, pixelSize = 1, fillColor = '#000', lineGap = 0 }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.pixelSize = pixelSize;
    this.fillColor = fillColor;
    this.lineGap = lineGap;

    this.ctx.imageSmoothingEnabled = false;

    this.glyphs = PIXEL_GLYPH_DATA.glyphs.map(g => ({
      pixels: this._decodeGlyph(g[0], g[2]),
      baseline: g[1],
      width: g[2]
    }));

    this._calcLineMetrics();
  }

  /**
   * 解码 6-bit ASCII 编码的字符串 -> 二维布尔数组
   */
  _decodeGlyph(encoded, width) {
    if (width === 0 || encoded.length === 0) return [];

    let bits = '';
    for (let i = 0; i < encoded.length; i++) {
      const value = encoded.charCodeAt(i) - 32;
      bits += value.toString(2).padStart(6, '0');
    }

    const height = Math.ceil(bits.length / width);

    const pixels = [];
    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        row.push(idx < bits.length && bits[idx] === '1');
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
      if (g.pixels.length === 0) continue;
      const above = g.baseline;
      const below = g.pixels.length - g.baseline;
      if (above > maxAbove) maxAbove = above;
      if (below > maxBelow) maxBelow = below;
    }
    this.lineBaseOffset = maxAbove; // 行顶到基线的距离
    this.lineHeight = maxAbove + maxBelow + this.lineGap;
  }

  /**
   * 计算给定 indexList 需要的 canvas 尺寸（逻辑像素）
   */
  _calcSize(indexList) {
    let totalWidth = 0;
    let maxWidth = 0;
    let lineCount = 1;

    for (const idx of indexList) {
      if (idx === -1) {
        lineCount++;
        if (totalWidth > maxWidth) maxWidth = totalWidth;
        totalWidth = 0;
      } else if (idx >= 0 && idx < this.glyphs.length) {
        totalWidth += this.glyphs[idx].width;
      }
    }
    if (totalWidth > maxWidth) maxWidth = totalWidth;

    return {
      width: maxWidth * this.pixelSize,
      height: lineCount * this.lineHeight * this.pixelSize
    };
  }

  /**
   * 将一个 indexList 渲染到 canvas 上
   */
  render(indexList) {
    const size = this._calcSize(indexList);
    this.canvas.width = size.width;
    this.canvas.height = size.height;
    this.ctx.clearRect(0, 0, size.width, size.height);
    this.ctx.fillStyle = this.fillColor;

    let cursorX = 0;
    let baselineY = this.lineBaseOffset * this.pixelSize;

    for (const idx of indexList) {
      if (idx === -1) {
        cursorX = 0;
        baselineY += this.lineHeight * this.pixelSize;
        continue;
      }

      if (idx < 0 || idx >= this.glyphs.length) continue;

      const g = this.glyphs[idx];

      const topY = baselineY - g.baseline * this.pixelSize;

      for (let y = 0; y < g.pixels.length; y++) {
        for (let x = 0; x < g.width; x++) {
          if (g.pixels[y][x]) {
            this.ctx.fillRect(
              cursorX + x * this.pixelSize,
              topY + y * this.pixelSize,
              this.pixelSize,
              this.pixelSize
            );
          }
        }
      }

      cursorX += g.width * this.pixelSize;
    }
  }

  /**
   * 获取渲染后的 data URL（用于预览、导出）
   */
  toDataURL(indexList, type = 'image/png') {
    this.render(indexList);
    return this.canvas.toDataURL(type);
  }
}
