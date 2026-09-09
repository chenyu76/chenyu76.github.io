(function() {
'use strict';
const Common = window.Common;
const TrustRegion = window.TrustRegion;
const clamp = Common.clamp;
const clamp01 = Common.clamp01;

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const isoCv = document.createElement('canvas');
const isoCtx = isoCv.getContext('2d');
const prevCv = document.createElement('canvas');
const prevCtx = prevCv.getContext('2d');

let W = 1, H = 1, dpr = 1;
let curR = 3.5; // radius of the current point (constant)
function px(x, y) { return [ x * W, (1 - y) * H ]; }

/* heat background: rendered once per problem by the shared heatmap.js
 * (loaded before this file); heatCv holds the latest banded heat canvas. */
let heatCv = null;

/* ---- state ------------------------------------------------------------ */
const state = {
  land : null,
  lo : 0,
  hi : 1,
  x : {x : 0.5, y : 0.5},
  fx : 0,
  Delta : 0.1,
  DeltaNext : 0.1,
  iso : null,
  showCand : false,
  cand : null,
  accept : null,
  acceptInFlight : false,
  trail : [],
  move : null,
  radAnim : null,
  rejectFlash : null,
  fade : null,
};

/* ---- iso-lines of the model: one simple black line -------------------- */
function drawIso() {
  isoCtx.clearRect(0, 0, W, H);
  const iso = state.iso;
  if (!iso)
    return;
  const {model, cx, cy, radius} = iso;
  const rx = radius * W, ry = radius * H;
  if (Math.hypot(rx, ry) < 12)
    return;
  const M = clamp(Math.round(Math.hypot(rx, ry) / 2.2), 10, 120);
  const step = 2 * radius / M;
  const n = M + 1;
  const qv = new Float64Array(n * n);
  let qmin = Infinity, qmax = -Infinity;
  for (let j = 0; j < n; j++) {
    const dy = cy - radius + j * step;
    for (let i = 0; i < n; i++) {
      const dx = cx - radius + i * step;
      const v = model.q(dx - cx, dy - cy);
      qv[j * n + i] = v;
      if (v < qmin)
        qmin = v;
      if (v > qmax)
        qmax = v;
    }
  }
  const span = qmax - qmin;
  if (!(span > 1e-12))
    return;
  isoCtx.save();
  isoCtx.beginPath();
  isoCtx.ellipse(cx * W, (1 - cy) * H, Math.max(0.5, rx), Math.max(0.5, ry), 0,
                 0, Math.PI * 2);
  isoCtx.clip();
  isoCtx.strokeStyle = 'rgb(12,12,14)';
  isoCtx.lineWidth = 1.1;
  for (let li = 0; li < 7; li++) {
    const level = qmin + span * ((li + 0.5) / 7);
    isoCtx.beginPath();
    marchLevel(level, qv, n, step, cx - radius, cy - radius, M);
    isoCtx.stroke();
  }
  isoCtx.restore();
}
function marchLevel(level, qv, n, step, x0, y0, M) {
  for (let j = 0; j < M; j++) {
    for (let i = 0; i < M; i++) {
      const a = qv[j * n + i], b = qv[j * n + i + 1];
      const d = qv[(j + 1) * n + i], c = qv[(j + 1) * n + i + 1];
      const x = x0 + i * step, y = y0 + j * step;
      const pts = [];
      if ((a >= level) !== (b >= level)) {
        const t = (level - a) / (b - a);
        pts.push([ x + t * step, y ]);
      }
      if ((b >= level) !== (c >= level)) {
        const t = (level - b) / (c - b);
        pts.push([ x + step, y + t * step ]);
      }
      if ((c >= level) !== (d >= level)) {
        const t = (level - c) / (d - c);
        pts.push([ x + (1 - t) * step, y + step ]);
      }
      if ((d >= level) !== (a >= level)) {
        const t = (level - d) / (a - d);
        pts.push([ x, y + (1 - t) * step ]);
      }
      if (pts.length === 2)
        addSeg(pts[0], pts[1]);
      else if (pts.length === 4) {
        addSeg(pts[0], pts[1]);
        addSeg(pts[2], pts[3]);
      }
    }
  }
  function addSeg(p1, p2) {
    isoCtx.moveTo(p1[0] * W, (1 - p1[1]) * H);
    isoCtx.lineTo(p2[0] * W, (1 - p2[1]) * H);
  }
}

/* ---- helpers ------------------------------------------------------------ */
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
function lerp(a, b, t) { return a + (b - a) * t; }
function animP(anim, now) {
  return anim ? clamp01((now - anim.t0) / anim.dur) : 1;
}
function whiteUnder(x, y, r) { // subtle white rim so black marks stay visible
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
}
/* ---- paint --------------------------------------------------------------- */
function draw(now) {
  // heatmap (cross-fade from the previous problem when present)
  if (state.fade) {
    ctx.globalAlpha = 1;
    ctx.drawImage(prevCv, 0, 0, W, H);
    ctx.globalAlpha = easeOut(animP(state.fade, now));
    if (heatCv)
      ctx.drawImage(heatCv, 0, 0, W, H);
    ctx.globalAlpha = 1;
  } else if (heatCv) {
    ctx.drawImage(heatCv, 0, 0, W, H);
  }
  if (state.iso)
    ctx.drawImage(isoCv, 0, 0, W, H);

  // current position (interpolated while moving)
  let cur = state.x;
  if (state.move) {
    const t = easeOut(animP(state.move, now));
    cur = {
      x : lerp(state.move.x0, state.move.x1, t),
      y : lerp(state.move.y0, state.move.y1, t)
    };
  }
  const [cx0, cy0] = px(cur.x, cur.y);

  // trail of accepted iterates (plain black line)
  if (state.trail.length > 1) {
    ctx.beginPath();
    for (let i = 0; i < state.trail.length; i++) {
      const [tx, ty] = px(state.trail[i].x, state.trail[i].y);
      if (i === 0)
        ctx.moveTo(tx, ty);
      else
        ctx.lineTo(tx, ty);
    }
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = 'rgb(10,10,12)';
    ctx.stroke();
  }

  // trust-region ellipse (radius morphs with Delta) - plain black line
  let rad = state.Delta;
  if (state.radAnim) {
    const p = animP(state.radAnim, now);
    rad = p < 1 ? lerp(state.radAnim.d0, state.radAnim.d1, easeOut(p))
                : state.radAnim.d1;
  }
  const rx = rad * W, ry = rad * H;
  if (rx > 2 && ry > 2) {
    ctx.beginPath();
    ctx.ellipse(cx0, cy0, rx, ry, 0, 0, Math.PI * 2);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = 'rgb(10,10,12)';
    ctx.stroke();
  }

  // movement arrow to the trial point
  if (state.showCand && state.cand) {
    const [tx1, ty1] = px(state.cand.x, state.cand.y);
    const a = Math.atan2(ty1 - cy0, tx1 - cx0);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath();
    ctx.moveTo(cx0, cy0);
    ctx.lineTo(tx1, ty1);
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgb(10,10,12)';
    ctx.beginPath();
    ctx.moveTo(cx0, cy0);
    ctx.lineTo(tx1, ty1);
    ctx.stroke();
    // arrowhead
    const hl = curR * 1.6;
    ctx.fillStyle = 'rgb(10,10,12)';
    ctx.beginPath();
    ctx.moveTo(tx1 + Math.cos(a) * hl, ty1 + Math.sin(a) * hl);
    ctx.lineTo(tx1 + Math.cos(a + 2.6) * hl, ty1 + Math.sin(a + 2.6) * hl);
    ctx.lineTo(tx1 + Math.cos(a - 2.6) * hl, ty1 + Math.sin(a - 2.6) * hl);
    ctx.closePath();
    ctx.fill();
    if (!state.acceptInFlight) {
      // trial point: small black ring
      ctx.beginPath();
      ctx.arc(tx1, ty1, curR * 1.45, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.strokeStyle = 'rgb(10,10,12)';
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
  }

  // current iterate: small filled black dot
  whiteUnder(cx0, cy0, curR + 0.4);
  ctx.beginPath();
  ctx.arc(cx0, cy0, curR, 0, Math.PI * 2);
  ctx.fillStyle = 'rgb(8,8,10)';
  ctx.fill();

  // rejection flash
  if (state.rejectFlash) {
    const p = animP(state.rejectFlash, now);
    const [fxp, fyp] = px(state.rejectFlash.x, state.rejectFlash.y);
    ctx.strokeStyle = 'rgba(10,10,12,' + (1 - p).toFixed(3) + ')';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(fxp, fyp, curR * (1.8 + 2.4 * p), 0, Math.PI * 2);
    ctx.stroke();
    const cw = curR * 0.9;
    ctx.beginPath();
    ctx.moveTo(fxp - cw, fyp - cw);
    ctx.lineTo(fxp + cw, fyp + cw);
    ctx.moveTo(fxp + cw, fyp - cw);
    ctx.lineTo(fxp - cw, fyp + cw);
    ctx.stroke();
    if (p >= 1)
      state.rejectFlash = null;
  }
}

/* ---- sizing ---------------------------------------------------------------
 */
let resizeTimer = null;
function scheduleRedraw() { // heavy re-render, debounced while resizing
  if (resizeTimer)
    return;
  resizeTimer = setTimeout(() => {
    resizeTimer = null;
    if (state.land) {
      heatCv = Heatmap.render(state.land, W, H);
      if (state.iso)
        drawIso();
    }
  }, 120);
}
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
  ctx.imageSmoothingEnabled = true;
  isoCv.width = Math.round(w * dpr);
  isoCv.height = Math.round(h * dpr);
  isoCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  prevCv.width = Math.round(w * dpr);
  prevCv.height = Math.round(h * dpr);
  prevCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  curR = clamp(Math.min(w, h) * 0.006, 2.2, 5.5);
  if (state.land)
    scheduleRedraw();
}

/* ---- playback
 * ---------------------------------------------------------------- */
const SETTINGS = {
  Delta0 : 0.10,
  DeltaTol : 1e-2,
  maxIter : 240
};
const T = {
  fit : 40,
  iso : 200,
  cand : 380,
  move : 330,
  reject : 450,
  radius : 220,
  settle : 80,
  beat : 1500,
  fade : 700,
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function playSnap(s, isLast) {
  state.x = {x : s.x.x, y : s.x.y};
  state.fx = s.fx;
  state.Delta = s.Delta;
  state.DeltaNext = s.DeltaNext;
  state.iso = null;
  state.showCand = false;
  state.cand = null;
  state.acceptInFlight = false;
  state.move = null;
  state.rejectFlash = null;
  isoCtx.clearRect(0, 0, W, H);
  await sleep(T.fit);
  state.iso = {model : s.model, cx : s.x.x, cy : s.x.y, radius : s.Delta};
  drawIso();
  await sleep(T.iso);
  state.cand = {x : s.cand.x, y : s.cand.y};
  state.showCand = true;
  await sleep(T.cand);
  // decision
  state.acceptInFlight = true;
  if (s.accept) {
    state.move = {
      x0 : s.x.x,
      y0 : s.x.y,
      x1 : s.cand.x,
      y1 : s.cand.y,
      t0 : performance.now(),
      dur : T.move,
    };
    await sleep(T.move);
    state.move = null;
    state.x = {x : s.cand.x, y : s.cand.y};
    state.fx = s.fplus;
    const last = state.trail[state.trail.length - 1];
    if (!last || last.x !== s.cand.x || last.y !== s.cand.y)
      state.trail.push({x : s.cand.x, y : s.cand.y});
  } else if (isLast && s.rho === 0 && s.DeltaNext === s.Delta) {
    await sleep(260);
  } else {
    state.rejectFlash = {
      t0 : performance.now(),
      dur : T.reject * (s.DeltaNext < s.Delta ? 1 : 0.55),
      x : s.cand.x,
      y : s.cand.y
    };
    await sleep(T.reject * (s.DeltaNext < s.Delta ? 1 : 0.55));
    state.rejectFlash = null;
  }
  state.showCand = false;
  state.cand = null;
  state.acceptInFlight = false;
  state.radAnim =
      {t0 : performance.now(), d0 : s.Delta, d1 : s.DeltaNext, dur : T.radius};
  await sleep(T.radius);
  state.radAnim = null;
  state.Delta = s.DeltaNext;
  await sleep(T.settle);
}

async function run() {
  const rng = Common.mulberry32((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
  let x0 = {x : 0.2 + rng() * 0.6, y : 0.2 + rng() * 0.6};
  for (;;) {
    const land = Common.makeLandscape(rng);
    const res = TrustRegion.trLoop(land, x0, SETTINGS);
    const pol = Common.polish(land, res.xFinal);
    // switch to the new landscape
    prevCtx.clearRect(0, 0, W, H);
    if (state.land && heatCv)
      prevCtx.drawImage(heatCv, 0, 0, W, H);
    heatCv = Heatmap.render(land, W, H);
    state.land = land;
    state.trail =
        [ {x : x0.x, y : x0.y} ]; // the walk starts at x0: the first
                                  // step must draw a segment right away
    state.x = {x : x0.x, y : x0.y};
    state.fx = land.f(x0.x, x0.y);
    state.Delta = SETTINGS.Delta0;
    state.DeltaNext = SETTINGS.Delta0;
    state.iso = null;
    isoCtx.clearRect(0, 0, W, H);
    state.fade = {t0 : performance.now(), dur : T.fade};
    await sleep(T.fade + 200);
    state.fade = null;
    // play the recorded steps
    for (let i = 0; i < res.history.length; i++) {
      await playSnap(res.history[i], i === res.history.length - 1);
    }
    // converged: settle on the polished solution for a beat
    state.x = pol.x;
    state.fx = pol.fx;
    state.move = null;
    state.trail.push({x : pol.x.x, y : pol.x.y});
    state.iso = null;
    isoCtx.clearRect(0, 0, W, H);
    await sleep(T.beat);
    x0 = {x : Common.clamp01(pol.x.x), y : Common.clamp01(pol.x.y)};
  }
}

/* ---- boot ---------------------------------------------------------------- */
resize();
window.addEventListener('resize', resize);
requestAnimationFrame(function frame(now) {
  draw(now);
  requestAnimationFrame(frame);
});
setTimeout(run, 250);
})();
