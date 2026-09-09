/* Gradient-descent and stochastic-gradient-descent preview.
 * GD uses the full gradient of the shared landscape.  The SGD view uses a
 * random-coordinate version: at every iteration it differentiates one
 * randomly selected coordinate and updates only that coordinate.
 */
(function() {
'use strict';
const Common = window.Common;
const Heatmap = window.Heatmap;
const clamp = Common.clamp;
const clamp01 = Common.clamp01;
const stochastic = document.body.dataset.mode === 'sgd';
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const prevCv = document.createElement('canvas');
const prevCtx = prevCv.getContext('2d');
let W = 1, H = 1, dpr = 1, curR = 3.5, heatCv = null;
function px(x, y) { return [ x * W, (1 - y) * H ]; }
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
function lerp(a, b, t) { return a + (b - a) * t; }
function progress(a, now) { return a ? clamp01((now - a.t0) / a.dur) : 1; }
function whiteUnder(x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
}
const state = {
  land : null,
  x : {x : 0.5, y : 0.5},
  trail : [],
  grad : null,
  arrow : null,
  arrowOrigin : null,
  move : null,
  fade : null,
  flash : null
};

function gradient(land, x, rng) {
  if (!stochastic)
    return Common.numGH(land, x).g;
  const axis = rng() < 0.5 ? 0 : 1;
  const h = 1e-4;
  if (axis === 0)
    return {
      g : [ (land.f(x.x + h, x.y) - land.f(x.x - h, x.y)) / (2 * h), 0 ],
      axis : axis
    };
  return {
    g : [ 0, (land.f(x.x, x.y + h) - land.f(x.x, x.y - h)) / (2 * h) ],
    axis : axis
  };
}

function solve(land, x0, rng) {
  let x = {x : x0.x, y : x0.y};
  const history = [], maxIter = stochastic ? 110 : 85;
  for (let k = 0; k < maxIter; k++) {
    const result = gradient(land, x, rng);
    const g = result.g || result;
    const norm = Math.hypot(g[0], g[1]);
    if (!Number.isFinite(norm) || norm < 1e-6)
      break;
    const step = (stochastic ? 0.035 : 0.042) *
                 (stochastic ? 1 / Math.sqrt(1 + k * 0.018) : 1);
    const dx = -step * g[0] / norm, dy = -step * g[1] / norm;
    const cand = {x : clamp01(x.x + dx), y : clamp01(x.y + dy)};
    history.push({
      x : {x : x.x, y : x.y},
      cand : cand,
      g : g,
      axis : result.axis,
      k : k
    });
    x = cand;
  }
  return {history : history, xFinal : x};
}

function draw(now) {
  let cur = state.x;
  if (state.move) {
    const t = easeOut(progress(state.move, now));
    cur = {
      x : lerp(state.move.x0, state.move.x1, t),
      y : lerp(state.move.y0, state.move.y1, t)
    };
  }
  const [cx, cy] = px(cur.x, cur.y);
  if (state.fade) {
    ctx.globalAlpha = 1;
    ctx.drawImage(prevCv, 0, 0, W, H);
    ctx.globalAlpha = easeOut(progress(state.fade, now));
    if (heatCv)
      ctx.drawImage(heatCv, 0, 0, W, H);
    ctx.globalAlpha = 1;
  } else if (heatCv)
    ctx.drawImage(heatCv, 0, 0, W, H);
  if (state.trail.length > 1) {
    ctx.beginPath();
    state.trail.forEach((p, i) => {
      const q = px(p.x, p.y);
      if (i)
        ctx.lineTo(q[0], q[1]);
      else
        ctx.moveTo(q[0], q[1]);
    });
    ctx.lineWidth = stochastic ? 1.5 : 1.8;
    ctx.strokeStyle = 'rgb(10,10,12)';
    ctx.stroke();
  }
  if (state.arrow && state.arrowOrigin) {
    const g = state.arrow.g, n = Math.hypot(g[0], g[1]) || 1;
    const [ax, ay] = px(state.arrowOrigin.x, state.arrowOrigin.y);
    const len = Math.min(Math.min(W, H) * 0.16,
                         Math.min(W, H) * 0.028 * (1 + Math.log1p(n)));
    const tx = ax - len * g[0] / n, ty = ay + len * g[1] / n;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.strokeStyle = 'rgb(10,10,12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    const a = Math.atan2(ty - cy, tx - cx), h = curR * 1.8;
    ctx.fillStyle = 'rgb(10,10,12)';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - h * Math.cos(a - 0.5), ty - h * Math.sin(a - 0.5));
    ctx.lineTo(tx - h * Math.cos(a + 0.5), ty - h * Math.sin(a + 0.5));
    ctx.closePath();
    ctx.fill();
  }
  whiteUnder(cx, cy, curR + 0.4);
  ctx.beginPath();
  ctx.arc(cx, cy, curR, 0, Math.PI * 2);
  ctx.fillStyle = 'rgb(8,8,10)';
  ctx.fill();
  if (state.flash) {
    const p = progress(state.flash, now), q = px(state.flash.x, state.flash.y);
    ctx.strokeStyle = 'rgba(10,10,12,' + (1 - p).toFixed(3) + ')';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(q[0], q[1], curR * (1.5 + 2 * p), 0, Math.PI * 2);
    ctx.stroke();
  }
}

let resizeTimer = null;
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  dpr = Math.min(2.5, window.devicePixelRatio || 1);
  W = w;
  H = h;
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  cv.style.width = w + 'px';
  cv.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  prevCv.width = Math.round(w * dpr);
  prevCv.height = Math.round(h * dpr);
  prevCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  curR = clamp(Math.min(w, h) * 0.006, 2.2, 5.5);
  if (state.land) {
    clearTimeout(resizeTimer);
    resizeTimer =
        setTimeout(() => { heatCv = Heatmap.render(state.land, W, H); }, 120);
  }
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function play(s) {
  // Clear the previous step before installing the new one.  This prevents
  // the first frame of a step from briefly reusing the previous arrow.
  state.move = null;
  state.arrow = null;
  state.arrowOrigin = null;
  state.x = {x : s.x.x, y : s.x.y};
  state.grad = s.g;
  state.arrow = {g : [s.g[0], s.g[1]]};
  state.arrowOrigin = {x : s.x.x, y : s.x.y};
  await sleep(250);
  state.move = {
    x0 : s.x.x,
    y0 : s.x.y,
    x1 : s.cand.x,
    y1 : s.cand.y,
    t0 : performance.now(),
    dur : 620
  };
  await sleep(state.move.dur);
  state.move = null;
  state.x = s.cand;
  state.trail.push({x : s.cand.x, y : s.cand.y});
  state.arrow = null;
  state.arrowOrigin = null;
  if (stochastic) {
    state.flash =
        {x : s.cand.x, y : s.cand.y, t0 : performance.now(), dur : 350};
    await sleep(350);
    state.flash = null;
  }
  await sleep(60);
}
async function run() {
  const rng =
      Common.mulberry32((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
  let x0 = {x : 0.2 + rng() * 0.6, y : 0.2 + rng() * 0.6};
  for (;;) {
    const land = Common.makeLandscape(rng);
    const res = solve(land, x0, rng), pol = Common.polish(land, res.xFinal);
    prevCtx.clearRect(0, 0, W, H);
    if (state.land && heatCv)
      prevCtx.drawImage(heatCv, 0, 0, W, H);
    heatCv = Heatmap.render(land, W, H);
    state.land = land;
    state.x = x0;
    state.trail = [ x0 ];
    state.arrow = null;
    state.fade = {t0 : performance.now(), dur : 700};
    await sleep(900);
    state.fade = null;
    for (const s of res.history)
      await play(s);
    state.arrow = null;
    state.x = pol.x;
    state.trail.push(pol.x);
    await sleep(1500);
    x0 = {x : clamp01(pol.x.x), y : clamp01(pol.x.y)};
  }
}
resize();
window.addEventListener('resize', resize);
requestAnimationFrame(function frame(now) {
  draw(now);
  requestAnimationFrame(frame);
});
setTimeout(run, 250);
})();
