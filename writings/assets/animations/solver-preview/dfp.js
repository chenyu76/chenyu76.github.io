/* =========================================================================
 * DFP demo - the classic Davidon-Fletcher-Powell quasi-Newton method
 * (inverse-Hessian approximation H, DFP update), on the shared curved-valley
 * landscapes. Gradients are obtained numerically from the shared module
 * (window.Common.numGH), so the demo remains free of analytic derivatives.
 *
 * One iteration:
 *   1. search direction  d = -H g        (H = inverse Hessian approx)
 *   2. backtracking Armijo line search along d (projected into [0,1]^2)
 *   3. s = x+ - x,  y = g+ - g
 *      DFP update:  H <- H + s s'/s'y  -  H y y' H / y' H y
 *   4. restart with steepest descent if the metric is not a descent direction
 *
 * Animation language is identical to the other previews (shared heatmap,
 * black markers/trail, no text, warm start between problems).
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
  showCand : false,
  cand : null,
  acceptInFlight : false,
  move : null,
  rejectFlash : null,
  fade : null,
  H : null, // current inverse-Hessian approx (2x2), for the eigen axes
  crossAnim : null,
  grad : null, // gradient at the current point (for the -gradient arrow)
  gRef : 1,    // |gradient(x0)| of the current problem
};

/* ---- helpers ------------------------------------------------------------ */
// half-axis length (domain units) = CROSS_LEN * sqrt(lambda) - true absolute
// scale, not clipped. H = I gives lambda = 1, so the cross starts symmetric.
const CROSS_LEN = 0.16;
// -gradient arrow length = GRAD_BASE * |g| / |g(x0)| of the current problem,
// so the arrow is scaled by the true gradient magnitude relative to the
// starting point (|g| spans ~3 orders of magnitude, absolute scaling would
// be invisible or run off screen).
const GRAD_BASE = 0.24;
function eig2(a, b, c) { // eigen decomposition of symmetric [[a,b],[b,c]]
  const t = Math.sqrt(Math.max(0, (a - c) * (a - c) + 4 * b * b));
  const l1 = (a + c + t) / 2;
  const l2 = (a + c - t) / 2;
  let v1;
  if (Math.abs(b) > 1e-14) {
    v1 = [ b, l1 - a ];
    const n = Math.hypot(v1[0], v1[1]) || 1;
    v1 = [ v1[0] / n, v1[1] / n ];
  } else {
    // Diagonal H: eigenvalue a corresponds to [1,0], c to [0,1].
    // l1 is max(a,c), so use a >= c (the old l1 >= c was always true).
    v1 = a >= c ? [ 1, 0 ] : [ 0, 1 ];
  }
  const v2 = [ -v1[1], v1[0] ];
  return [ {l : l1, v : v1}, {l : l2, v : v2} ];
}
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

/* ---- DFP iteration (records the film for playback) --------------------- */
function dfpLoop(land, x0, cfg) {
  const P = cfg || {};
  const gtolRel = P.gtolRel !== undefined ? P.gtolRel : 5e-4;
  const maxIter = P.maxIter !== undefined ? P.maxIter : 80;

  let x = {x : x0.x, y : x0.y};
  let gh = Common.numGH(land, x);
  let g = gh.g.slice();
  let fx = land.f(x.x, x.y);
  const g0n = Math.hypot(g[0], g[1]);
  let H = [ [ 1, 0 ], [ 0, 1 ] ]; // inverse-Hessian approximation
  const history = [];
  let reason = 'maxiter';

  for (let k = 0; k < maxIter; k++) {
    const gn = Math.hypot(g[0], g[1]);
    if (gn <= Math.max(gtolRel * g0n, 1e-8)) {
      reason = 'gradient';
      break;
    }
    const H0 =
        [ [ H[0][0], H[0][1] ], [ H[1][0], H[1][1] ] ]; // before the step

    // d = -H g ; if it is not a descent direction, restart with steepest
    // descent
    let d = [
      -(H[0][0] * g[0] + H[0][1] * g[1]),
      -(H[1][0] * g[0] + H[1][1] * g[1]),
    ];
    let gd = g[0] * d[0] + g[1] * d[1];
    if (gd >= 0) {
      H = [ [ 1, 0 ], [ 0, 1 ] ];
      d = [ -g[0], -g[1] ];
      gd = -gn * gn;
    }

    // backtracking Armijo line search (projected back into the box)
    const fx0 = fx;
    let alpha = 1, found = false;
    for (let ls = 0; ls < 60; ls++) {
      const nx = clamp01(x.x + alpha * d[0]);
      const ny = clamp01(x.y + alpha * d[1]);
      if (land.f(nx, ny) <= fx0 + 1e-4 * alpha * gd) {
        found = true;
        break;
      }
      alpha *= 0.5;
      if (alpha < 1e-10)
        break;
    }
    if (!found) {
      reason = 'stuck';
      break;
    } // no feasible decrease found

    const xnext = {
      x : clamp01(x.x + alpha * d[0]),
      y : clamp01(x.y + alpha * d[1])
    };
    const fnext = land.f(xnext.x, xnext.y);
    const gh2 = Common.numGH(land, xnext);
    const g2 = gh2.g;

    // DFP update of the inverse-Hessian approximation
    const s = [ xnext.x - x.x, xnext.y - x.y ];
    const y = [ g2[0] - g[0], g2[1] - g[1] ];
    const sy = s[0] * y[0] + s[1] * y[1];
    if (sy > 1e-12) {
      const Hy =
          [ H[0][0] * y[0] + H[0][1] * y[1], H[1][0] * y[0] + H[1][1] * y[1] ];
      const yHy = y[0] * Hy[0] + y[1] * Hy[1];
      if (yHy > 1e-12) {
        const Hn = [ [ 0, 0 ], [ 0, 0 ] ];
        for (let i = 0; i < 2; i++)
          for (let j = 0; j < 2; j++)
            Hn[i][j] = H[i][j] + s[i] * s[j] / sy - Hy[i] * Hy[j] / yHy;
        H = Hn;
      }
    }

    const H1 =
        [ [ H[0][0], H[0][1] ], [ H[1][0], H[1][1] ] ]; // after the update
    history.push({
      k : k,
      x : {x : x.x, y : x.y},
      xnext : {x : xnext.x, y : xnext.y},
      fx : fx,
      fnext : fnext,
      alpha : alpha,
      gn : gn,
      H : H0,
      Hnext : H1,
      g : [ g[0], g[1] ],
      gnext : [ g2[0], g2[1] ],
    });
    x = xnext;
    fx = fnext;
    g = g2.slice();
  }
  return {history : history, xFinal : x, fxFinal : fx, reason : reason};
}

/* ---- paint --------------------------------------------------------------- */
function draw(now) {
  let cur = state.x;
  if (state.move) {
    const t = easeOut(animP(state.move, now));
    cur = {
      x : lerp(state.move.x0, state.move.x1, t),
      y : lerp(state.move.y0, state.move.y1, t)
    };
  }
  const [cx0, cy0] = px(cur.x, cur.y);

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
      if (i === 0)
        ctx.moveTo(tx, ty);
      else
        ctx.lineTo(tx, ty);
    }
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = 'rgb(10,10,12)';
    ctx.stroke();
  }

  // eigen axes of H: two perpendicular lines through the current point,
  // half-length CROSS_LEN*sqrt(lambda_i) (true scale, not clipped)
  if (state.H) {
    let H = state.H;
    if (state.crossAnim) {
      const p = animP(state.crossAnim, now);
      const t = p < 1 ? p : 1;
      H = [
        [
          lerp(state.crossAnim.H0[0][0], state.crossAnim.H1[0][0], t),
          lerp(state.crossAnim.H0[0][1], state.crossAnim.H1[0][1], t)
        ],
        [
          lerp(state.crossAnim.H0[1][0], state.crossAnim.H1[1][0], t),
          lerp(state.crossAnim.H0[1][1], state.crossAnim.H1[1][1], t)
        ],
      ];
    }
    const ax = eig2(H[0][0], H[0][1], H[1][1]);
    ctx.lineCap = 'round';
    for (let e = 0; e < 2; e++) {
      if (!(ax[e].l > 1e-12))
        continue;
      const half = CROSS_LEN * Math.sqrt(ax[e].l);
      const [px0, py0] =
          px(state.x.x - half * ax[e].v[0], state.x.y - half * ax[e].v[1]);
      const [px1, py1] =
          px(state.x.x + half * ax[e].v[0], state.x.y + half * ax[e].v[1]);
      ctx.lineWidth = 3.4;
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.moveTo(px0, py0);
      ctx.lineTo(px1, py1);
      ctx.stroke();
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = 'rgb(10,10,12)';
      ctx.beginPath();
      ctx.moveTo(px0, py0);
      ctx.lineTo(px1, py1);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  // -gradient (steepest descent direction) at the current point: thin dashed
  // arrow whose length is proportional to |g| (relative to the problem start)
  if (state.grad) {
    const gn2 = Math.hypot(state.grad[0], state.grad[1]);
    const ref = state.gRef > 1e-9 ? state.gRef : 1;
    if (gn2 > 1e-6) {
      const ux = -state.grad[0] / gn2, uy = -state.grad[1] / gn2;
      const glen = GRAD_BASE * Math.min(gn2 / ref, 3); // a bit of head-room
      const [ax0, ay0] = px(state.x.x, state.x.y);
      const [ax1, ay1] = px(state.x.x + glen * ux, state.x.y + glen * uy);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.moveTo(ax0, ay0);
      ctx.lineTo(ax1, ay1);
      ctx.stroke();
      ctx.lineWidth = 1.0;
      ctx.strokeStyle = 'rgb(10,10,12)';
      ctx.setLineDash([ 3, 4 ]);
      ctx.beginPath();
      ctx.moveTo(ax0, ay0);
      ctx.lineTo(ax1, ay1);
      ctx.stroke();
      ctx.setLineDash([]);
      // open (hollow) arrowhead
      const ang = Math.atan2(ay1 - ay0, ax1 - ax0);
      const hl = curR * 1.2, hw = Math.PI * 0.42;
      ctx.beginPath();
      ctx.moveTo(ax1, ay1);
      ctx.lineTo(ax1 - Math.cos(ang - hw) * hl, ay1 - Math.sin(ang - hw) * hl);
      ctx.moveTo(ax1, ay1);
      ctx.lineTo(ax1 - Math.cos(ang + hw) * hl, ay1 - Math.sin(ang + hw) * hl);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgb(10,10,12)';
      ctx.stroke();
    }
  }

  // quasi-Newton step: arrow + ring to the trial point
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
}

/* ---- sizing ---------------------------------------------------------------
 */
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

/* ---- playback --------------------------------------------------------------
 */
const SETTINGS = {
  gtolRel : 5e-4,
  maxIter : 80
};
const T = {
  cand : 240,
  cross : 420,
  move : 440,
  settle : 90,
  beat : 1500,
  fade : 700,
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function playStep(s) {
  state.x = {x : s.x.x, y : s.x.y};
  state.fx = s.fx;
  state.H = s.H || null;
  state.crossAnim = null;
  state.grad = (s.g && s.g[0] !== undefined) ? s.g : null;
  state.showCand = false;
  state.cand = null;
  state.acceptInFlight = false;
  state.move = null;
  state.cand = {x : s.xnext.x, y : s.xnext.y};
  state.showCand = true;
  state.acceptInFlight = false;
  // 1) at x_k: H_k cross + arrow to x+ (the direction comes from H_k)
  await sleep(T.cand);
  // 2) move the dot only; the cross stays anchored at x_k with H_k
  state.acceptInFlight = true;
  state.move = {
    x0 : s.x.x,
    y0 : s.x.y,
    x1 : s.xnext.x,
    y1 : s.xnext.y,
    t0 : performance.now(),
    dur : T.move,
  };
  await sleep(T.move);
  state.move = null;
  state.x = {x : s.xnext.x, y : s.xnext.y};
  state.fx = s.fnext;
  if (s.gnext)
    state.grad = s.gnext;
  const last = state.trail[state.trail.length - 1];
  if (!last || last.x !== s.xnext.x || last.y !== s.xnext.y)
    state.trail.push({x : s.xnext.x, y : s.xnext.y});
  state.showCand = false;
  state.cand = null;
  state.acceptInFlight = false;
  // 3) after arrival, update the metric in place: morph cross to H_{k+1}
  if (s.H && s.Hnext) {
    state.crossAnim = {
      H0 : s.H,
      H1 : s.Hnext,
      t0 : performance.now(),
      dur : T.cross,
    };
    await sleep(T.cross);
    state.crossAnim = null;
    state.H = s.Hnext;
  }
  await sleep(T.settle);
}

async function run() {
  const rng =
      Common.mulberry32((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
  let x0 = {x : 0.2 + rng() * 0.6, y : 0.2 + rng() * 0.6};
  for (;;) {
    const land = Common.makeLandscape(rng);
    const res = dfpLoop(land, x0, SETTINGS);
    const pol = Common.polish(land, res.xFinal);
    // switch to the new landscape
    prevCtx.clearRect(0, 0, W, H);
    if (state.land && heatCv)
      prevCtx.drawImage(heatCv, 0, 0, W, H);
    heatCv = Heatmap.render(land, W, H);
    state.land = land;
    state.trail = [ {x : x0.x, y : x0.y} ];
    state.x = {x : x0.x, y : x0.y};
    state.fx = land.f(x0.x, x0.y);
    state.H = [ [ 1, 0 ], [ 0, 1 ] ];
    state.crossAnim = null;
    state.grad = null;
    const gg0 = Common.numGH(land, x0).g;
    state.gRef = Math.hypot(gg0[0], gg0[1]);
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
    const ggPol = Common.numGH(land, pol.x).g;
    state.grad =
        ggPol; // keep the -gradient arrow consistent with the polished point
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
