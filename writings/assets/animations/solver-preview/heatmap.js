/* =========================================================================
 * Shared heatmap renderer for the solver previews.
 *
 * Renders the function f : [0,1]^2 -> R (any object with land.f(x, y)) as a
 * small colour-banded canvas:
 *   u = (f - fmin)/(fmax - fmin),  t = log(1 + LOG_A*u)/log(1 + LOG_A),
 *   band = floor(t * NBAND).
 * The log stretch gives the low "valley" values most of the colour bands so
 * their structure stays visible; high plateaus are compressed.
 * Only the NBAND colours that are actually used are computed (no full LUT).
 *
 * The palette (COLORMAP below) can be exchanged freely - only this file
 * needs to know about colours.
 * ====================================================================== */
(function(root) {
'use strict';
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

/* ---- colour ramp ---------------------------------------------------------- */
const COLORMAP = [
  [ 2, 22, 64 ],
  [ 4, 36, 92 ],
  [ 6, 55, 122 ],
  [ 9, 76, 145 ],
  [ 14, 98, 160 ],
  [ 22, 120, 170 ],
  [ 34, 142, 178 ],
  [ 51, 163, 184 ],
  [ 74, 183, 187 ],
  [ 102, 201, 188 ],
  [ 134, 217, 187 ],
  [ 167, 231, 189 ],
  [ 197, 242, 196 ],
  [ 222, 250, 206 ],
  [ 240, 255, 222 ],
  [ 252, 255, 240 ],
].map(color => color.map(v => 255 - (255 - v) * 0.7));
const NBAND = 26; // filled-contour bands

function interpColor(t) { // interpolate one colour from the COLORMAP anchors
  const x = t * (COLORMAP.length - 1);
  const k = Math.min(COLORMAP.length - 2, Math.floor(x));
  const u = x - k;
  return [
    Math.round(COLORMAP[k][0] + (COLORMAP[k + 1][0] - COLORMAP[k][0]) * u),
    Math.round(COLORMAP[k][1] + (COLORMAP[k + 1][1] - COLORMAP[k][1]) * u),
    Math.round(COLORMAP[k][2] + (COLORMAP[k + 1][2] - COLORMAP[k][2]) * u),
  ];
}
// only NBAND colours are used: compute exactly those once
const bandColors = [];
for (let b = 0; b < NBAND; b++)
  bandColors.push(interpColor(b / (NBAND - 1)));

/* Map f to colour through a log stretch: t = log(1 + A*u)/log(1 + A),
 * u = (f - fmin)/(fmax - fmin). Low values (the valleys) get many colour
 * bands, high "plateau" values are compressed near the top of the ramp. */
const LOG_A = 20;

/* --------------------------------------------------------------------------
 * Render one landscape and return a small canvas that callers drawImage()
 * onto their (full-size, dpr-scaled) canvas.
 * ------------------------------------------------------------------------ */
function render(land, W, H) {
  const G = clamp(Math.round(Math.max(W, H)), 220, 900);
  const buf = new Float32Array(G * G);
  const f = land.f;
  let mn = Infinity, mx = -Infinity;
  for (let j = 0; j < G; j++) {
    const y = 1 - (j + 0.5) / G;
    const row = j * G;
    for (let i = 0; i < G; i++) {
      const v = f((i + 0.5) / G, y);
      buf[row + i] = v;
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
  }
  const span = mx - mn;
  const inv = 1 / Math.log(1 + LOG_A); // normalize so u=1 -> t=1
  const out = document.createElement('canvas');
  out.width = G;
  out.height = G;
  const octx = out.getContext('2d');
  const img = octx.createImageData(G, G);
  const d8 = img.data;
  const scl = span > 1e-12 ? 1 / span : 1;
  for (let k = 0; k < G * G; k++) {
    let u = (buf[k] - mn) * scl; // 0 .. 1
    if (u < 0) u = 0;
    if (u > 1) u = 1;
    const t = Math.log(1 + LOG_A * u) * inv;
    let b = Math.floor(t * NBAND);
    if (b < 0) b = 0;
    if (b > NBAND - 1) b = NBAND - 1;
    const c = bandColors[b];
    d8[k * 4] = c[0];
    d8[k * 4 + 1] = c[1];
    d8[k * 4 + 2] = c[2];
    d8[k * 4 + 3] = 255;
  }
  octx.putImageData(img, 0, 0);
  return out;
}

root.Heatmap = { render: render, NBAND: NBAND };
})(typeof window !== 'undefined' ? window : globalThis);
