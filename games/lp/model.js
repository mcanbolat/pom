// Product Mix Puzzle — model. Heizer Module B (graphical LP, corner points, shadow prices).
(function () {
  const DEFAULTS = { tries: 5, px: 30, py: 50, quiz: true };
  // constraints: a·x + b·y ≤ rhs   (x = hoodies, y = jackets)
  const CONS = [
    { id: "cut", name: "Cutting", a: 2, b: 1, rhs: 100, unit: "hours" },
    { id: "sew", name: "Sewing", a: 1, b: 1, rhs: 60, unit: "hours" },
    { id: "fin", name: "Finishing", a: 1, b: 3, rhs: 150, unit: "hours" }
  ];
  const profit = (P, x, y) => P.px * x + P.py * y;
  function check(x, y, cons) {
    cons = cons || CONS;
    const use = cons.map((c) => ({ ...c, used: c.a * x + c.b * y })), bad = use.filter((c) => c.used > c.rhs + 1e-9);
    return { use, feasible: x >= 0 && y >= 0 && !bad.length, violated: bad.map((c) => c.id) };
  }
  // corner points by enumerating pairs of boundary lines (incl. axes)
  function corners(cons) {
    cons = cons || CONS;
    const lines = cons.map((c) => [c.a, c.b, c.rhs]).concat([[1, 0, 0], [0, 1, 0]]), pts = [];
    for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) {
      const [a1, b1, c1] = lines[i], [a2, b2, c2] = lines[j], det = a1 * b2 - a2 * b1; if (Math.abs(det) < 1e-12) continue;
      const x = (c1 * b2 - c2 * b1) / det, y = (a1 * c2 - a2 * c1) / det;
      if (check(x, y, cons).feasible && !pts.some((p) => Math.abs(p.x - x) < 1e-9 && Math.abs(p.y - y) < 1e-9)) pts.push({ x: +x.toFixed(6), y: +y.toFixed(6) });
    }
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length, cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    return pts.sort((p, q) => Math.atan2(p.y - cy, p.x - cx) - Math.atan2(q.y - cy, q.x - cx));
  }
  function solve(P, cons) { const c = corners(cons); return c.map((p) => ({ ...p, z: profit(P, p.x, p.y) })).sort((a, b) => b.z - a.z)[0]; }
  function shadow(P, id) { const base = solve(P).z, cons = CONS.map((c) => c.id === id ? { ...c, rhs: c.rhs + 1 } : c); return +(solve(P, cons).z - base).toFixed(4); }
  window.LP = { DEFAULTS, CONS, profit, check, corners, solve, shadow };
})();
