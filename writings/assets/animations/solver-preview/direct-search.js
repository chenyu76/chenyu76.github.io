/* =========================================================================
 * Direct-search demo (compass / coordinate poll).
 *
 * At every iteration the solver polls the four compass directions at the
 * current step size alpha (x +/- alpha and y +/- alpha), evaluated on the
 * true function f. If the best polled point improves f it is accepted and
 * the step size doubles; if no polled point improves, the step size is
 * halved. The search stops when alpha falls below the requested precision.
 * It uses the same shared machinery as the trust-region preview:
 *   - the random landscape is provided by the shared module common.js
 *     (window.Common),
 *   - the banded heatmap background by heatmap.js (window.Heatmap),
 *   - the animation language (black markers, trail, fades, warm start)
 *     mirrors the trust-region demo.
 * ====================================================================== */
(function() {
'use strict';
const Common = window.Common;
const Heatmap = window.Heatmap;
const clamp = Common.clamp;
const clamp01 = Common.clamp01;

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const prevCv = document.createElement('canvas');
const prevCtx = prevCv.getContext('2d');

let W = 1, H = 1, dpr = 1;
let curR = 3.5; // radius of the current point (constant)
function px(x, y) { return [ x * W, (1 - y) * H ]; }

let heatCv = null; // latest banded heatmap canvas from the shared renderer

/* ---- state ------------------------------------------------------------ */
const state = {
  land : null,
  x : {x : 0.5, y : 0.5},
  fx : 0,
  trail : [],
  probes : [],
  probeShow : 0,
  showCand : false,
  cand : null,
  acceptInFlight : false,
  move : null,
  rejectFlash : null,
  fade : null,
};

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

/* ---- direct-search iteration (records the film for playback) ---------- */
function searchLoop(land, x0, cfg) {
  const P = cfg || {};
  const alpha0 = P.alpha0 !== undefined ? P.alpha0 : 0.09;
  const alphaTol = P.alphaTol !== undefined ? P.alphaTol : 1e-2;
  const expand = P.expand !== undefined ? P.expand : 2;
  const shrink = P.shrink !== undefined ? P.shrink : 0.5;
  const maxIter = P.maxIter !== undefined ? P.maxIter : 240;

  const dirs = [
    {dx : 1, dy : 0}, {dx : -1, dy : 0},
    {dx : 0, dy : 1}, {dx : 0, dy : -1},
  ];
  let x = {x : x0.x, y : x0.y};
  let fx = land.f(x.x, x.y);
  let alpha = alpha0;
  const history = [];
  let reason = 'alpha';

  for (let k = 0; k < maxIter; k++) {
    const probes = [];
    for (let d = 0; d < dirs.length; d++) {
      const p = {x : clamp01(x.x + dirs[d].dx * alpha), y : clamp01(x.y + dirs[d].dy * alpha)};
      probes.push({p : p, v : land.f(p.x, p.y)});
    }
    let best = 0;
    for (let i = 1; i < probes.length; i++)
      if (probes[i].v < probes[best].v) best = i;
    const improved = probes[best].v < fx;
    const alphaNext = improved ? alpha * expand : alpha * shrink;
    history.push({
      k : k,
      x : {x : x.x, y : x.y},
      fx : fx,
      alpha : alpha,
      alphaNext : alphaNext,
      probes : probes,
      best : best,
      accept : improved,
    });
    if (improved) {
      x = probes[best].p;
      fx = probes[best].v;
    } else {
      if (alphaNext <= alphaTol) { reason = 'alpha'; break; }
    }
    alpha = alphaNext;
  }
  return {history : history, xFinal : x, fxFinal : fx, reason : reason, alphaFinal : alpha};
}

/* ---- paint --------------------------------------------------------------- */
function draw(now) {
  // current position (interpolated while moving)
  let cur = state.x;
  if (state.move) {
    const t = easeOut(animP(state.move, now));
    cur = {x : lerp(state.move.x0, state.move.x1, t), y : lerp(state.move.y0, state.move.y1, t)};
  }
  const [cx0, cy0] = px(cur.x, cur.y);

  // heatmap background (cross-fade from the previous problem)
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

  // trail of accepted iterates (plain black line)
  if (state.trail.length > 1) {
    ctx.beginPath();
    for (let i = 0; i < state.trail.length; i++) {
      const [tx, ty] = px(state.trail[i].x, state.trail[i].y);
      if (i === 0) ctx.moveTo(tx, ty); else ctx.lineTo(tx, ty);
    }
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = 'rgb(10,10,12)';
    ctx.stroke();
  }

  // polled probe points (revealed one by one; black ticks)
  for (let i = 0; i < state.probeShow; i++) {
    if (state.showCand && i === state.candProbe)
      continue; // the chosen probe is drawn as the ring/arrow below
    const [qx, qy] = px(state.probes[i].p.x, state.probes[i].p.y);
    ctx.strokeStyle = 'rgb(10,10,12)';
    ctx.lineWidth = 1.3;
    const s = curR * 0.55;
    ctx.beginPath();
    ctx.moveTo(qx - s, qy);
    ctx.lineTo(qx + s, qy);
    ctx.moveTo(qx, qy - s);
    ctx.lineTo(qx, qy + s);
    ctx.stroke();
  }

  // chosen probe / movement arrow
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
    const hl = curR * 1.6;
    ctx.fillStyle = 'rgb(10,10,12)';
    ctx.beginPath();
    ctx.moveTo(tx1 + Math.cos(a) * hl, ty1 + Math.sin(a) * hl);
    ctx.lineTo(tx1 + Math.cos(a + 2.6) * hl, ty1 + Math.sin(a + 2.6) * hl);
    ctx.lineTo(tx1 + Math.cos(a - 2.6) * hl, ty1 + Math.sin(a - 2.6) * hl);
    ctx.closePath();
    ctx.fill();
    if (!state.acceptInFlight) {
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

/* ---- sizing --------------------------------------------------------------- */
let resizeTimer = null;
function scheduleRedraw() { // heavy re-render, debounced while resizing
  if (resizeTimer)
    return;
  resizeTimer = setTimeout(() => {
    resizeTimer = null;
    if (state.land)
      heatCv = Heatmap.render(state.land, W, H);
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
  prevCv.width = Math.round(w * dpr);
  prevCv.height = Math.round(h * dpr);
  prevCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  curR = clamp(Math.min(w, h) * 0.006, 2.2, 5.5);
  if (state.land)
    scheduleRedraw();
}

/* ---- playback -------------------------------------------------------------- */
const SETTINGS = {alpha0 : 0.09, alphaTol : 1e-2, maxIter : 240};
const T = {
  probe : 150,
  cand : 320,
  move : 300,
  reject : 420,
  settle : 80,
  beat : 1500,
  fade : 700,
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function playStep(s) {
  state.x = {x : s.x.x, y : s.x.y};
  state.fx = s.fx;
  state.probes = s.probes;
  state.probeShow = 0;
  state.showCand = false;
  state.cand = null;
  state.candProbe = -1;
  state.acceptInFlight = false;
  state.move = null;
  state.rejectFlash = null;
  // reveal the four polled points
  for (let i = 0; i < s.probes.length; i++) {
    state.probeShow = i + 1;
    await sleep(T.probe);
  }
  await sleep(T.cand * 0.5);
  // decision
  state.candProbe = s.best;
  if (s.accept) {
    const chosen = s.probes[s.best].p;
    state.cand = {x : chosen.x, y : chosen.y};
    state.showCand = true;
    state.acceptInFlight = true;
    await sleep(T.cand);
    state.move = {
      x0 : s.x.x, y0 : s.x.y, x1 : chosen.x, y1 : chosen.y,
      t0 : performance.now(), dur : T.move,
    };
    await sleep(T.move);
    state.move = null;
    state.x = {x : chosen.x, y : chosen.y};
    state.fx = s.probes[s.best].v;
    const last = state.trail[state.trail.length - 1];
    if (!last || last.x !== chosen.x || last.y !== chosen.y)
      state.trail.push({x : chosen.x, y : chosen.y});
  } else {
    // no improving polled point: flash it and halve the step size
    state.rejectFlash = {
      t0 : performance.now(), dur : T.reject,
      x : s.probes[s.best].p.x, y : s.probes[s.best].p.y,
    };
    await sleep(T.reject);
    state.rejectFlash = null;
  }
  state.showCand = false;
  state.cand = null;
  state.candProbe = -1;
  state.probes = [];
  state.probeShow = 0;
  state.acceptInFlight = false;
  await sleep(T.settle);
}

async function run() {
  const rng = Common.mulberry32((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
  let x0 = {x : 0.2 + rng() * 0.6, y : 0.2 + rng() * 0.6};
  for (;;) {
    const land = Common.makeLandscape(rng);
    const res = searchLoop(land, x0, SETTINGS);
    const pol = Common.polish(land, res.xFinal);
    // switch to the new landscape
    prevCtx.clearRect(0, 0, W, H);
    if (state.land && heatCv)
      prevCtx.drawImage(heatCv, 0, 0, W, H);
    heatCv = Heatmap.render(land, W, H);
    state.land = land;
    state.trail = [{x : x0.x, y : x0.y}];
    state.x = {x : x0.x, y : x0.y};
    state.fx = land.f(x0.x, x0.y);
    state.probes = [];
    state.probeShow = 0;
    state.fade = {t0 : performance.now(), dur : T.fade};
    await sleep(T.fade + 200);
    state.fade = null;
    // play the recorded steps
    for (let i = 0; i < res.history.length; i++)
      await playStep(res.history[i]);
    // converged: settle on the polished solution for a beat
    state.x = pol.x;
    state.fx = pol.fx;
    state.move = null;
    state.trail.push({x : pol.x.x, y : pol.x.y});
    await sleep(T.beat);
    x0 = {x : clamp01(pol.x.x), y : clamp01(pol.x.y)};
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
