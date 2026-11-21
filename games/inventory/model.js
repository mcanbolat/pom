// Order Up! — model. Heizer Ch. 12 (EOQ, reorder point, safety stock, total cost).
(function () {
  const DEFAULTS = { weeks: 26, mean: 100, sd: 25, lead: 2, S: 60, h: 0.5, stockout: 5, start: 250, z: 1.65, quiz: true };
  // annual figures for the quiz (52 weeks)
  const annual = (P) => ({ D: P.mean * 52, H: P.h * 52 });
  const eoq = (P) => { const a = annual(P); return Math.sqrt(2 * a.D * P.S / a.H); };
  const rop = (P) => P.mean * P.lead;
  const safety = (P) => P.z * P.sd * Math.sqrt(P.lead);
  function normal(r) { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
  function demand(P) { const r = POM.rng((P.seed || 1) + 404); return Array.from({ length: P.weeks }, () => Math.max(0, Math.round(P.mean + P.sd * normal(r)))); }
  // one week: state = {onHand, pipe: [{due, q}]}, q = order placed at the start of week w (arrives at the start of week w+lead)
  function step(P, st, q, w, d) {
    let onHand = st.onHand; const pipe = st.pipe.slice();
    const arrived = pipe.filter((o) => o.due === w).reduce((s, o) => s + o.q, 0);
    onHand += arrived;
    const pipeLeft = pipe.filter((o) => o.due > w);
    if (q > 0) pipeLeft.push({ due: w + P.lead, q });
    const sales = Math.min(onHand, d), lost = d - sales; onHand -= sales;
    const cost = { order: q > 0 ? P.S : 0, holding: +(onHand * P.h).toFixed(2), stockout: lost * P.stockout };
    cost.total = cost.order + cost.holding + cost.stockout;
    const position = onHand + pipeLeft.reduce((s, o) => s + o.q, 0);
    return { state: { onHand, pipe: pipeLeft }, row: { week: w, order: q, arrived, demand: d, sales, lost, on_hand: onHand, position, cost } };
  }
  const init = (P) => ({ onHand: P.start, pipe: [] });
  const position = (st) => st.onHand + st.pipe.reduce((s, o) => s + o.q, 0);
  // (Q, R) policy: at the start of each week, if inventory position (after arrivals) ≤ R, order Q
  function runPolicy(P, Q, R, d) {
    let st = init(P); const rows = [];
    for (let w = 1; w <= P.weeks; w++) {
      const arr = st.pipe.filter((o) => o.due === w).reduce((s, o) => s + o.q, 0);
      const pos = position(st);                       // arrivals don't change the position
      const q = pos <= R ? Q : 0;
      const r = step(P, st, q, w, d[w - 1]); st = r.state; rows.push(r.row);
    }
    return { rows, total: rows.reduce((s, r) => s + r.cost.total, 0) };
  }
  function benchmarks(P) {
    const d = demand(P), Q = Math.round(eoq(P)), R0 = Math.round(rop(P)), R1 = Math.round(rop(P) + safety(P));
    let best = null;
    for (let q = 50; q <= 500; q += 10) for (let r = 100; r <= 400; r += 10) { const t = runPolicy(P, q, r, d).total; if (!best || t < best.total) best = { total: t, Q: q, R: r }; }
    return { eoq: { Q, R: R0, total: runPolicy(P, Q, R0, d).total }, eoq_ss: { Q, R: R1, total: runPolicy(P, Q, R1, d).total }, best };
  }
  window.INV = { DEFAULTS, annual, eoq, rop, safety, demand, step, init, position, runPolicy, benchmarks };
})();
