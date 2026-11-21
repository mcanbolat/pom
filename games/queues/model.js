// Staff the Checkout — model. Heizer Module D (M/M/1, M/M/s, cost of service vs. cost of waiting).
(function () {
  const DEFAULTS = { mu: 30, wage: 18, wait_cost: 12, rates: [20, 45, 70, 110, 85, 50, 25, 60], start_hour: 9, max_s: 8, quiz: true };
  function fact(n) { let f = 1; for (let i = 2; i <= n; i++) f *= i; return f; }
  // exact M/M/s measures (times in hours)
  function mms(lambda, mu, s) {
    const r = lambda / mu, rho = r / s;
    if (rho >= 1) return { s, rho, stable: false };
    let sum = 0; for (let n = 0; n < s; n++) sum += Math.pow(r, n) / fact(n);
    const P0 = 1 / (sum + Math.pow(r, s) / (fact(s) * (1 - rho)));
    const Lq = P0 * Math.pow(r, s) * rho / (fact(s) * Math.pow(1 - rho, 2));
    const L = Lq + r, Wq = Lq / lambda, W = Wq + 1 / mu, Pwait = P0 * Math.pow(r, s) / (fact(s) * (1 - rho));
    return { s, rho, stable: true, P0, Lq, L, Wq, W, Pwait };
  }
  function hourCost(P, lambda, s) {
    const q = mms(lambda, P.mu, s); if (!q.stable) return { ...q, service: s * P.wage, waiting: null, total: null };
    return { ...q, service: s * P.wage, waiting: q.Lq * P.wait_cost, total: s * P.wage + q.Lq * P.wait_cost };
  }
  function best(P, lambda) {
    let b = null; for (let s = 1; s <= P.max_s; s++) { const c = hourCost(P, lambda, s); if (c.stable && (!b || c.total < b.total)) b = c; } return b;
  }
  window.QUEUE = { DEFAULTS, mms, hourCost, best };
})();
