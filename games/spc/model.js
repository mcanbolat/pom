// Control Chart Detective — model. Heizer Supplement 6 (x̄ and R charts, n = 5).
(function () {
  const DEFAULTS = { charts: 8, points: 20, target: 500, sigma: 4, n: 5, quiz: true };
  const A2 = 0.577, D3 = 0, D4 = 2.115, d2 = 2.326;   // Heizer Table S6.1, n = 5
  const PATTERNS = { none: "No problem (in control)", outside: "A point outside the control limits", run: "A run: 7+ points in a row on one side of the center line",
                     trend: "A trend: 6+ points in a row steadily rising or falling", spread: "More variability (R chart out of control)" };
  // chart order: a fixed mix, shuffled by the session seed
  const MIX = ["none", "outside", "run", "none", "trend", "spread", "outside", "none", "run", "trend", "spread", "none"];

  function normal(r) { let u = 0, v = 0; while (!u) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function sample(r, mu, sd, n) { const x = Array.from({ length: n }, () => mu + sd * normal(r)); const m = x.reduce((a, b) => a + b, 0) / n; return { mean: m, range: Math.max(...x) - Math.min(...x) }; }

  // limits computed from the phase-1 data (the same for every chart)
  function phase1(P) {
    const r = POM.rng((P.seed || 1) + 101), S = Array.from({ length: 20 }, () => sample(r, P.target, P.sigma, P.n));
    const xbb = +(S.reduce((a, s) => a + s.mean, 0) / S.length).toFixed(2), rbar = +(S.reduce((a, s) => a + s.range, 0) / S.length).toFixed(2);
    return { samples: S, xbb, rbar, ucl: xbb + A2 * rbar, lcl: xbb - A2 * rbar, uclr: D4 * rbar, lclr: D3 * rbar };
  }
  // first sample (1-based) that breaks a rule, and which rule
  function firstSignal(pts, L) {
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (p.mean > L.ucl || p.mean < L.lcl) return { at: i + 1, rule: "outside" };
      if (p.range > L.uclr) return { at: i + 1, rule: "spread" };
      if (i >= 6) { const w = pts.slice(i - 6, i + 1); if (w.every((q) => q.mean > L.xbb) || w.every((q) => q.mean < L.xbb)) return { at: i + 1, rule: "run" }; }
      if (i >= 5) { const w = pts.slice(i - 5, i + 1); let up = true, dn = true; for (let k = 1; k < w.length; k++) { up = up && w[k].mean > w[k - 1].mean; dn = dn && w[k].mean < w[k - 1].mean; } if (up || dn) return { at: i + 1, rule: "trend" }; }
    }
    return null;
  }
  function charts(P) {
    const L = phase1(P), r = POM.rng((P.seed || 1) + 202), sdx = P.sigma / Math.sqrt(P.n), out = [];
    const order = MIX.slice(0, Math.max(P.charts, 1)).map((t) => ({ t, k: r() })).sort((a, b) => a.k - b.k).map((o) => o.t);
    while (order.length < P.charts) order.push(MIX[order.length % MIX.length]);
    order.forEach((type) => {
      for (let tries = 0; tries < 400; tries++) {
        const start = 6 + Math.floor(r() * 8); let pts = [];
        for (let i = 0; i < P.points; i++) {
          const after = i + 1 >= start; let mu = L.xbb, sd = P.sigma;
          if (type === "run" && after) mu += 1.3 * sdx * (r() < .5 ? 1 : 1);
          if (type === "trend" && after) mu += 0.9 * sdx * (i + 2 - start);
          if (type === "spread" && after) sd *= 2.3;
          let s = sample(r, mu, sd, P.n);
          if (type === "outside" && i + 1 === start) s = { mean: L.xbb + (r() < .5 ? 1 : -1) * (3.6 + r()) * sdx, range: s.range };
          if (type === "trend" && after && i + 1 < start + 7) s.mean = Math.max(s.mean, (pts[i - 1] || { mean: -1e9 }).mean + 0.15 * sdx);
          pts.push({ mean: +s.mean.toFixed(2), range: +s.range.toFixed(2) });
        }
        const sig = firstSignal(pts, L);
        if (type === "none" ? !sig : (sig && sig.rule === type && sig.at >= 4)) { out.push({ type, pts, signal: sig }); break; }
      }
    });
    return { L, charts: out };
  }
  function grade(c, ans) {
    const isOut = c.type !== "none", saidOut = ans.verdict === "out";
    const v = isOut === saidOut, pat = !isOut ? v : ans.pattern === c.type, pt = !isOut ? v : (ans.point != null && Math.abs(ans.point - c.signal.at) <= 1);
    return { verdict_ok: v, pattern_ok: pat, point_ok: pt, points: !isOut ? (v ? 4 : 0) : (v ? 2 : 0) + (pat ? 1 : 0) + (pt ? 1 : 0),
             false_alarm: !isOut && saidOut, miss: isOut && !saidOut };
  }
  window.SPC = { DEFAULTS, A2, D3, D4, d2, PATTERNS, phase1, charts, firstSignal, grade };
})();
