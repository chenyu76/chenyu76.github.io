/* =========================================================================
 * Trust-region method kernel (window.TrustRegion).
 *
 *  - trSolve : exact solution of the 2-D trust-region subproblem
 *  - trLoop  : trust-region iteration whose quadratic model is the local
 *              Taylor model of the landscape. Derivatives come from the
 *              shared module (window.Common.numGH), so this file only
 *              contains trust-region specific logic.
 *
 * Expects common.js to have been loaded first.
 * ====================================================================== */
(function(root) {
'use strict';
var C = root.Common;
var TAU = C.TAU;
var CL01 = C.clamp01;
var numGH = C.numGH;

function trSolve(gx, gy, b00, b01, b11, Delta) {
  function qv(sx, sy) {
    return 0.5 * (b00 * sx * sx + 2 * b01 * sx * sy + b11 * sy * sy) + gx * sx +
           gy * sy;
  }
  var D2 = Delta * Delta;
  var best = [ 0, 0 ], bestVal = qv(0, 0);
  var det = b00 * b11 - b01 * b01;
  if (b00 > 0 && det > 0) {
    var sx = -(b11 * gx - b01 * gy) / det;
    var sy = -(-b01 * gx + b00 * gy) / det;
    if (sx * sx + sy * sy <= D2 + 1e-12 * D2) {
      var v = qv(sx, sy);
      if (v < bestVal) {
        bestVal = v;
        best = [ sx, sy ];
      }
    }
  }
  function dv(th) {
    var c = Math.cos(th), s = Math.sin(th);
    return D2 * ((b11 - b00) * c * s + b01 * (c * c - s * s)) +
           Delta * (gy * c - gx * s);
  }
  var K = 720, h = TAU / K;
  var d = new Float64Array(K + 1);
  for (var i = 0; i <= K; i++)
    d[i] = dv(i * h);
  var maxD = 0;
  for (var i = 0; i < K; i++)
    maxD = Math.max(maxD, Math.abs(d[i]));
  var flatTol = 1e-14 * Math.max(1, maxD);
  var roots = [];
  for (var i = 0; i < K; i++) {
    if (Math.abs(d[i]) < flatTol) {
      roots.push(i * h);
      continue;
    }
    if ((d[i] < 0) !== (d[i + 1] < 0)) {
      var lo = i * h, hi = (i + 1) * h, flo = d[i];
      for (var it = 0; it < 70; it++) {
        var mid = 0.5 * (lo + hi), fm = dv(mid);
        if ((fm < 0) === (flo < 0)) {
          lo = mid;
          flo = fm;
        } else {
          hi = mid;
        }
      }
      roots.push(0.5 * (lo + hi));
    }
  }
  for (var i = 0; i < roots.length; i++) {
    var th = roots[i];
    var px = Delta * Math.cos(th), py = Delta * Math.sin(th);
    var pv = qv(px, py);
    if (pv < bestVal) {
      bestVal = pv;
      best = [ px, py ];
    }
  }
  return {s : best, val : bestVal};
}

/* --------------------------------------------------------------------
 * Trust-region run with the local Taylor model (derivatives numeric),
 * classical acceptance ratio and radius rules. Stops when the model
 * predicts no descent, when Delta reaches the requested precision, or
 * when the iterate is pinned to the box. Iterations are recorded.
 * ------------------------------------------------------------------ */

function trLoop(land, x0, cfg) {
  var P = cfg || {};
  var Delta0 = P.Delta0 !== undefined ? P.Delta0 : 0.10;
  // no upper bound on the trust-region radius: good steps let it double freely
  var DeltaTol = P.DeltaTol !== undefined ? P.DeltaTol : 1e-2;
  var etaAccept = P.etaAccept !== undefined ? P.etaAccept : 0.1;
  var etaShrink = P.etaShrink !== undefined ? P.etaShrink : 0.25;
  var etaGrow = P.etaGrow !== undefined ? P.etaGrow : 0.75;
  var maxIter = P.maxIter !== undefined ? P.maxIter : 240;

  var x = {x : x0.x, y : x0.y};
  var fx = land.f(x.x, x.y);
  var Delta = Delta0;
  var history = [];
  var reason = 'maxiter';

  for (var k = 0; k < maxIter; k++) {
    var gh = numGH(land, x);
    // Per-iteration bindings so each snapshot keeps its own local quadratic
    // model; `var` here would make every stored model read the final
    // iteration's gradient/Hessian (classic closure-in-loop bug).
    const g = gh.g, hh = gh.h;
    const fxIter = fx;
    var gradNorm = Math.hypot(g[0], g[1]);
    var sv = trSolve(g[0], g[1], hh[0], hh[1], hh[2], Delta);
    var predicted = -sv.val;
    var cand = {x : CL01(x.x + sv.s[0]), y : CL01(x.y + sv.s[1])};
    var effLen = Math.hypot(cand.x - x.x, cand.y - x.y);
    const model = (sx, sy) => {
      return fxIter + g[0] * sx + g[1] * sy +
             0.5 * (hh[0] * sx * sx + 2 * hh[1] * sx * sy + hh[2] * sy * sy);
    };
    function snap(rho, accept, DN, fplus) {
      return {
        k : k,
        x : {x : x.x, y : x.y},
        fx : fx,
        Delta : Delta,
        DeltaNext : DN,
        cand : cand,
        model : {q : model},
        rho : rho,
        accept : accept,
        fplus : fplus !== undefined ? fplus : fx,
        gradNorm : gradNorm,
      };
    }
    if (effLen < 1e-12) { // pinned to the box boundary
      reason = 'boundary';
      history.push(snap(0, false, Delta, fx));
      break;
    }
    // loose tolerance for declaring a local minimizer found
    if (predicted <=
        1e-6 * Math.max(1, Math.abs(fx))) { // model sees no descent
      reason = 'gradient';
      history.push(snap(0, false, Delta, fx));
      break;
    }
    var fplus = land.f(cand.x, cand.y);
    var rho = (fx - fplus) / predicted;
    var accept = rho >= etaAccept && fplus <= fx;
    var DeltaNext = Delta;
    if (rho < etaShrink)
      DeltaNext = Delta * 0.5;
    else if (rho >= etaGrow && effLen >= 0.9 * Delta)
      DeltaNext = Delta * 2;

    history.push(snap(rho, accept, DeltaNext, fplus));
    if (accept) {
      x = cand;
      fx = fplus;
    }
    Delta = DeltaNext;
    if (Delta <= DeltaTol) {
      reason = 'radius';
      break;
    }
  }
  return {
    history : history,
    xFinal : x,
    fxFinal : fx,
    reason : reason,
    DeltaFinal : Delta
  };
}

/* Damped numerical Newton polish of a final point (cosmetic). */

root.TrustRegion = {
  trSolve : trSolve,
  trLoop : trLoop,
};
})(typeof window !== 'undefined' ? window : globalThis);
