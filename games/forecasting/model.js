// Forecasting Contest — model. Heizer Ch. 4 (naive, moving average, exponential smoothing, MAD/MAPE).
(function () {
  const DEFAULTS = { history: 12, rounds: 12, level: 500, noise: 40, drift: 10, jump: 90, jump_at: 6, alpha: 0.3, quiz: true };
  function normal(r) { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
  function demand(P) {
    const r = POM.rng((P.seed || 1) + 303), n = P.history + P.rounds, out = []; let L = P.level;
    for (let t = 1; t <= n; t++) { L += P.drift * normal(r); if (t === P.history + P.jump_at) L += P.jump; out.push(Math.max(0, Math.round(L + P.noise * normal(r)))); }
    return out;
  }
  // method forecasts for every period t (1-based) using data before t
  function methods(P, d) {
    const n = d.length, naive = [null], ma = [null, null, null];
    for (let t = 2; t <= n; t++) naive.push(d[t - 2]);
    for (let t = 4; t <= n; t++) ma.push((d[t - 2] + d[t - 3] + d[t - 4]) / 3);
    // recompute ES cleanly: F2 = start, F(t+1) = F(t) + α(A(t) − F(t))
    const ES = [null]; let F = d.slice(0, 3).reduce((a, b) => a + b, 0) / 3; ES.push(F);
    for (let t = 2; t < n; t++) { F = F + P.alpha * (d[t - 1] - F); ES.push(F); }
    return { naive, ma, es: ES };
  }
  const err = (f, a) => f.map((x, i) => x == null ? null : a[i] - x);
  function mad(fc, act) { const e = fc.map((f, i) => f == null ? null : Math.abs(act[i] - f)).filter((x) => x != null); return e.length ? e.reduce((a, b) => a + b, 0) / e.length : null; }
  function mape(fc, act) { const e = fc.map((f, i) => f == null ? null : Math.abs(act[i] - f) / act[i]).filter((x) => x != null); return e.length ? 100 * e.reduce((a, b) => a + b, 0) / e.length : null; }
  // the forecasting window: periods history+1 … history+rounds
  function contest(P) {
    const d = demand(P), m = methods(P, d), lo = P.history, hi = P.history + P.rounds;
    const win = (arr) => arr.slice(lo, hi);
    return { d, m, actual: win(d), naive: win(m.naive), ma: win(m.ma), es: win(m.es) };
  }
  // implied α: slope of (F_t − F_{t−1}) on (A_{t−1} − F_{t−1})
  function impliedAlpha(fc, act) {
    const xs = [], ys = [];
    for (let i = 1; i < fc.length; i++) if (fc[i] != null && fc[i - 1] != null) { xs.push(act[i - 1] - fc[i - 1]); ys.push(fc[i] - fc[i - 1]); }
    if (xs.length < 3) return null;
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
    let sxy = 0, sxx = 0; xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; });
    return sxx ? sxy / sxx : null;
  }
  window.FCST = { DEFAULTS, demand, methods, contest, mad, mape, impliedAlpha, err };
})();
