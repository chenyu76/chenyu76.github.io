/* =========================================================================
 * Shared machinery for the solver previews (no DOM).
 *
 *  - mulberry32 : deterministic PRNG
 *  - makeLandscape : random smooth curved-valley test problems on [0,1]^2
 *  - numGH       : numerical gradient + Hessian (central differences)
 *  - polish      : damped numerical Newton polish of a final point
 *
 * Exposed as window.Common. The individual solver kernels (trust-region,
 * direct search, blockwise direct search) are separate files that consume
 * this shared module, so a demo page never needs to load another solver.
 * ====================================================================== */
(function(root) {
'use strict';
var TAU = Math.PI * 2;
function CL(v, a, b) { return v < a ? a : (v > b ? b : v); }
function CL01(v) { return CL(v, 0, 1); }

function mulberry32(seed) {
  var a = seed >>> 0;
  return function() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* --------------------------------------------------------------------
 * Random structured landscape.
 * Components (all smooth, all with closed-form values; derivatives are
 * obtained numerically by numGH, so only f needs to be implemented):
 *
 *  1) primary curved valley, generalized Rosenbrock:
 *       wv * (v - [q2 u^2 + q1 u + q0])^2 + wu * (u - u*)^2
 *     in coordinates (u,v) rotated by a random angle; the valley is the
 *     parabola v = q2 u^2 + q1 u + q0 and its bottom falls towards the
 *     vertex (u*, v*) -- exactly the long curved trough that makes a
 *     nice trust-region trajectory.
 *  2) occasionally a second, weaker valley at another orientation,
 *  3) random high-power terms with random offsets: radial bowls
 *     c*((x-a)^2+(y-b)^2)^m  (m = 1..2) and soft straight grooves
 *     c*(d.x - t)^e  (e = 4 or 6),
 *  4) a little plane-wave texture to give the far field gentle relief.
 * ------------------------------------------------------------------ */

function makeLandscape(rng) {
  // -- primary curved valley ------------------------------------------------
  var th = rng() * Math.PI;
  var cT = Math.cos(th), sT = Math.sin(th);
  var Px = 0.22 + rng() * 0.56, Py = 0.22 + rng() * 0.56; // valley vertex
  var uV = cT * (Px - 0.5) + sT * (Py - 0.5);
  var vV = -sT * (Px - 0.5) + cT * (Py - 0.5);
  var q2 = (rng() < 0.5 ? -1 : 1) * (0.5 + rng() * 2.6); // curvature
  var q1 = -2 * q2 * uV;
  var q0 = vV + q2 * uV * uV;
  var wv = 8 + rng() * 28;    // walls
  var wu = 0.5 + rng() * 1.2; // descent along valley
  // -- secondary weaker valley ----------------------------------------------
  var has2 = rng() < 0.5, th2 = 0, q22 = 0, q12 = 0, q02 = 0, wv2 = 0, wu2 = 0,
      uV2 = 0, vV2 = 0;
  if (has2) {
    th2 = rng() * Math.PI;
    var c2 = Math.cos(th2), s2 = Math.sin(th2);
    var a2 = 0.25 + rng() * 0.5, b2 = 0.25 + rng() * 0.5;
    uV2 = c2 * (a2 - 0.5) + s2 * (b2 - 0.5);
    vV2 = -s2 * (a2 - 0.5) + c2 * (b2 - 0.5);
    q22 = (rng() < 0.5 ? -1 : 1) * (0.4 + rng() * 2.0);
    q12 = -2 * q22 * uV2;
    q02 = vV2 + q22 * uV2 * uV2;
    wv2 = 3 + rng() * 12;
    wu2 = 0.2 + rng() * 0.8;
  }
  // -- high-power terms with offsets -----------------------------------------
  var nb = 2 + Math.floor(rng() * 2);
  var terms = [];
  var i;
  for (i = 0; i < nb; i++) {
    if (rng() < 0.65) {
      var a = 0.12 + rng() * 0.76, b = 0.12 + rng() * 0.76;
      var m = 1 + Math.floor(rng() * 2);
      terms.push({
        kind : 0,
        a : a,
        b : b,
        m : m,
        c : (rng() < 0.5 ? -1 : 1) * (0.4 + rng() * 1.6)
      });
    } else {
      var ph = rng() * Math.PI;
      terms.push({
        kind : 1,
        dx : Math.cos(ph),
        dy : Math.sin(ph),
        t : -0.6 + rng() * 1.6,
        e : 2 * (2 + Math.floor(rng() * 2)),
        c : (rng() < 0.5 ? -1 : 1) * (0.02 + rng() * 0.08),
      });
    }
  }
  // -- gentle plane-wave texture ---------------------------------------------
  var tex = [];
  var nt = 2 + Math.floor(rng() * 2);
  for (i = 0; i < nt; i++) {
    var phT = rng() * Math.PI, fq = 1.6 + rng() * 2.4;
    tex.push({
      dx : Math.cos(phT),
      dy : Math.sin(phT),
      fq : fq,
      amp : (rng() < 0.5 ? -1 : 1) * (0.05 + rng() * 0.15),
      ph2 : rng() * TAU,
    });
  }
  var M = 0.8 + rng() * 1.4; // overall magnitude (visual only)

  function f(x, y) {
    var v = 0;
    var dx0 = x - 0.5, dy0 = y - 0.5;
    var u = cT * dx0 + sT * dy0, vv = -sT * dx0 + cT * dy0;
    var cv = q2 * u * u + q1 * u + q0;
    v += wv * (vv - cv) * (vv - cv) + wu * (u - uV) * (u - uV);
    if (has2) {
      var c2 = Math.cos(th2), s2 = Math.sin(th2);
      var u2 = c2 * dx0 + s2 * dy0, v2 = -s2 * dx0 + c2 * dy0;
      var cv2 = q22 * u2 * u2 + q12 * u2 + q02;
      v += wv2 * (v2 - cv2) * (v2 - cv2) + wu2 * (u2 - uV2) * (u2 - uV2);
    }
    for (var i = 0; i < terms.length; i++) {
      var t = terms[i];
      if (t.kind === 0) {
        var ddx = x - t.a, ddy = y - t.b, r2 = ddx * ddx + ddy * ddy;
        var p = 1;
        for (var k = 0; k < t.m; k++)
          p *= r2;
        v += t.c * p;
      } else {
        var z = t.dx * x + t.dy * y - t.t;
        var q = 1;
        for (var k = 0; k < t.e; k++)
          q *= z;
        v += t.c * q;
      }
    }
    for (var i = 0; i < tex.length; i++) {
      var s = tex[i];
      v += s.amp * Math.cos(TAU * s.fq * (s.dx * x + s.dy * y) + s.ph2);
    }
    return v * M;
  }
  return {f : f, M : M};
}

/* --------------------------------------------------------------------
 * Numerical gradient + Hessian of land.f at x (central differences).
 * ------------------------------------------------------------------ */

function numGH(land, x) {
  var f = land.f;
  var h = 1e-4;
  var x0 = x.x, y0 = x.y;
  var f0 = f(x0, y0);
  var fxp = f(x0 + h, y0), fxm = f(x0 - h, y0);
  var fyp = f(x0, y0 + h), fym = f(x0, y0 - h);
  var fpp = f(x0 + h, y0 + h), fmm = f(x0 - h, y0 - h);
  var fpm = f(x0 + h, y0 - h), fmp = f(x0 - h, y0 + h);
  var h2 = h * h;
  return {
    g : [ (fxp - fxm) / (2 * h), (fyp - fym) / (2 * h) ],
    h : [
      (fxp - 2 * f0 + fxm) / h2, (fpp - fpm - fmp + fmm) / (4 * h2),
      (fyp - 2 * f0 + fym) / h2
    ],
    f0 : f0,
  };
}

/* --------------------------------------------------------------------
 * Exact solution of  min q(s) = 1/2 s^T B s + g^T s  s.t. ||s|| <= Delta
 * ------------------------------------------------------------------ */

function polish(land, x0) {
  var f = land.f;
  var p = [ CL(x0.x, 1e-4, 1 - 1e-4), CL(x0.y, 1e-4, 1 - 1e-4) ];
  var g0n = Infinity, gEnd = Infinity;
  for (var it = 0; it < 50; it++) {
    var gh = numGH(land, {x : p[0], y : p[1]});
    var g = gh.g, hh = gh.h;
    var gn = Math.hypot(g[0], g[1]);
    if (it === 0)
      g0n = gn;
    if (gn < 1e-9 || gn > 1e6)
      break;
    var det = hh[0] * hh[2] - hh[1] * hh[1];
    var d;
    if (hh[0] > 0 && det > 1e-12) {
      d = [
        -(hh[2] * g[0] - hh[1] * g[1]) / det,
        -(-hh[1] * g[0] + hh[0] * g[1]) / det
      ];
    } else {
      d = [ -g[0], -g[1] ];
    }
    var dl = Math.hypot(d[0], d[1]);
    if (dl > 0.2) {
      d[0] *= 0.2 / dl;
      d[1] *= 0.2 / dl;
    }
    var f0 = f(p[0], p[1]);
    var gd = g[0] * d[0] + g[1] * d[1];
    if (gd >= 0)
      break;
    var alpha = 1, ok = false;
    for (var ls = 0; ls < 30; ls++) {
      var nx = CL(p[0] + alpha * d[0], 1e-5, 1 - 1e-5);
      var ny = CL(p[1] + alpha * d[1], 1e-5, 1 - 1e-5);
      if (f(nx, ny) <= f0 + 1e-4 * alpha * gd) {
        p[0] = nx;
        p[1] = ny;
        ok = true;
        break;
      }
      alpha *= 0.5;
    }
    if (!ok)
      break;
  }
  var gh2 = numGH(land, {x : p[0], y : p[1]});
  gEnd = Math.hypot(gh2.g[0], gh2.g[1]);
  if (gEnd > g0n)
    return {x : x0, fx : f(x0.x, x0.y), g : g0n};
  return {x : {x : p[0], y : p[1]}, fx : f(p[0], p[1]), g : gEnd};
}


root.Common = {
  TAU : TAU,
  clamp : CL,
  clamp01 : CL01,
  mulberry32 : mulberry32,
  makeLandscape : makeLandscape,
  numGH : numGH,
  polish : polish,
};
})(typeof window !== 'undefined' ? window : globalThis);
