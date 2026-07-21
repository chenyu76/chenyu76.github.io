const H = 14;
const D = [
  [ 1, 0, -1 ], [ 1, -1, 0 ], [ 0, -1, 1 ], [ -1, 0, 1 ], [ -1, 1, 0 ],
  [ 0, 1, -1 ]
];
const dist = p => Math.abs(p[0]) + Math.abs(p[1]) + Math.abs(-p[0] - p[1]);
const pixel =
    (q, r) => [H * (1.732050808 * q + 0.866025404 * r), H * (1.5 * r)];

function makeSVG(viewBox) {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", viewBox);
  return s;
}

function drawHex(svg, q, r, fill, stroke, dash) {
  const [cx, cy] = pixel(q, r);
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 3 * (i + 0.5);
    pts.push(`${(cx + H * Math.cos(a)).toFixed(1)},${
        (cy + H * Math.sin(a)).toFixed(1)}`);
  }
  const p = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  p.setAttribute("points", pts.join(" "));
  p.setAttribute("fill", fill);
  p.setAttribute("stroke", stroke);
  p.setAttribute("stroke-width", "1.5");
  if (dash)
    p.setAttribute("stroke-dasharray", dash);
  svg.appendChild(p);
}

function addText(svg, x, y, text, color, size = "10") {
  const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
  t.setAttribute("x", x);
  t.setAttribute("y", y);
  t.setAttribute("fill", color);
  t.setAttribute("text-anchor", "middle");
  t.setAttribute("font-size", size);
  t.setAttribute("font-weight", "bold");
  t.textContent = text;
  svg.appendChild(t);
}

function generateGrid(maxDist) {
  const visited = new Set();
  const frontier = [ [ 0, 0, 0 ] ];
  visited.add("0,0,0");
  while (frontier.length) {
    const pos = frontier.shift();
    if (dist(pos) > maxDist)
      continue;
    for (const dir of D) {
      const n = [ pos[0] + dir[0], pos[1] + dir[1], pos[2] + dir[2] ];
      const k = n.join(",");
      if (!visited.has(k) && dist(n) <= maxDist) {
        visited.add(k);
        frontier.push(n);
      }
    }
  }
  return [...visited ].map(k => k.split(",").map(Number));
}

function clusterPositions(center, steps) {
  const out = [], seen = new Set();
  const front = [ [...center, 0 ] ];
  seen.add(center.join(","));
  while (front.length) {
    const [q, r, s, step] = front.shift();
    out.push([ q, r, s ]);
    if (step >= steps)
      continue;
    for (const dir of D) {
      const n = [ q + dir[0], r + dir[1], s + dir[2] ];
      const k = n.join(",");
      if (!seen.has(k)) {
        seen.add(k);
        front.push([...n, step + 1 ]);
      }
    }
  }
  return out;
}

function clusterBoundary(svg, positions, color) {
  const verts = [];
  for (const [q, r] of positions.map(p => [p[0], p[1]])) {
    const [cx, cy] = pixel(q, r);
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 3 * (i + 0.5);
      verts.push([ cx + H * Math.cos(a), cy + H * Math.sin(a) ]);
    }
  }

  let cx = 0, cy = 0;
  for (const v of verts) {
    cx += v[0];
    cy += v[1];
  }
  cx /= verts.length;
  cy /= verts.length;

  verts.sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) -
                       Math.atan2(b[1] - cy, b[0] - cx));

  const unique = [ verts[0] ];
  for (let i = 1; i < verts.length; i++) {
    const p = unique[unique.length - 1];
    const dx = verts[i][0] - p[0], dy = verts[i][1] - p[1];
    if (dx * dx + dy * dy > 1)
      unique.push(verts[i]);
  }

  const hull = [];
  for (const p of unique) {
    while (hull.length >= 2) {
      const a = hull[hull.length - 2], b = hull[hull.length - 1];
      const cross =
          (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
      if (cross <= 0)
        hull.pop();
      else
        break;
    }
    hull.push(p);
  }

  const poly =
      document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  poly.setAttribute(
      "points",
      hull.map(v => `${v[0].toFixed(1)},${v[1].toFixed(1)}`).join(" "));
  poly.setAttribute("fill", "none");
  poly.setAttribute("stroke", color);
  poly.setAttribute("stroke-width", "3");
  poly.setAttribute("stroke-dasharray", "6 3");
  svg.appendChild(poly);

  const ys = hull.map(v => v[1]);
  return {
    cx : hull.reduce((s, v) => s + v[0], 0) / hull.length,
    cy : (Math.min(...ys) + Math.max(...ys)) / 2
  };
}

function drawTutorial() {
  const svg = makeSVG("-85 -90 170 175");
  const grid = generateGrid(8);

  for (const pos of grid) {
    const [q, r] = [ pos[0], pos[1] ];
    const d = dist(pos);
    if (d === 0) {
      drawHex(svg, q, r, "#888", "#555");
    } else if (d === 2) {
      drawHex(svg, q, r, "#888", "#555");
    } else if (d === 4) {
      drawHex(svg, q, r, "#FF9800", "#E65100");
    } else if (d === 6) {
      drawHex(svg, q, r, "#FFCC80", "#FF9800", "3 3");
    } else if (d === 8) {
      drawHex(svg, q, r, "#E0E0E0", "#ccc", "3 3");
    }
  }

  for (const pos of grid) {
    if (dist(pos) === 4) {
      const [cx, cy] = pixel(pos[0], pos[1]);
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 3 * (i + 0.5);
        pts.push(`${(cx + (H + 3) * Math.cos(a)).toFixed(1)},${
            (cy + (H + 3) * Math.sin(a)).toFixed(1)}`);
      }
      const ring =
          document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      ring.setAttribute("points", pts.join(" "));
      ring.setAttribute("fill", "none");
      ring.setAttribute("stroke", "#D84315");
      ring.setAttribute("stroke-width", "2");
      ring.setAttribute("stroke-dasharray", "2 2");
      svg.appendChild(ring);
    }
  }

  const [, ringY] = pixel(0, 4);
  addText(svg, 75, ringY - 22, "Complete ring", "#D84315");
  addText(svg, 75, ringY - 10, "= eliminated!", "#D84315");

  const c = document.getElementById("tutorial-diagram");
  c.innerHTML = "";
  c.appendChild(svg);
  document.getElementById("tutorial-text").textContent =
      "Fill a complete ring of hexagons to eliminate it! Outer hexes then fall inward — if they complete another ring, chain reactions score big.";
}

function drawBlockMassTutorial() {
  const svg = makeSVG("-60 -160 180 200");
  const grid = generateGrid(12);

  const center = [ 3, -4, 1 ];
  const cluster = clusterPositions(center, 2);

  for (const pos of grid) {
    const [q, r] = [ pos[0], pos[1] ];
    const d = dist(pos);
    const inCluster = cluster.some(cp => cp[0] === pos[0] && cp[1] === pos[1] &&
                                         cp[2] === pos[2]);
    if (inCluster) {
      drawHex(svg, q, r, "#FFB74D", "#E65100");
    } else if (d === 0 || d === 2) {
      drawHex(svg, q, r, "#888", "#555");
    } else {
      drawHex(svg, q, r, "#F5F5F5", "#ddd", "3 3");
    }
  }

  const info = clusterBoundary(svg, cluster, "#4CAF50");

  const deltaX = 90;
  addText(svg, info.cx + deltaX, info.cy - 16, "Form a large", "#4CAF50");
  addText(svg, info.cx + deltaX, info.cy, "hexagon", "#4CAF50");
  addText(svg, info.cx + deltaX, info.cy + 16, "= eliminated!", "#4CAF50");

  const c = document.getElementById("tutorial-diagram2");
  c.innerHTML = "";
  c.appendChild(svg);
  document.getElementById("tutorial-text2").textContent =
      "When enough blocks stack together into a larger hexagon shape, the whole cluster gets cleared — even outside a complete ring. Tight, organized building pays off!";
}

drawTutorial();
drawBlockMassTutorial();
