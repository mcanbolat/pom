// Cost of Quality — shared model (game + dashboard). Heizer Ch. 6.
(function () {
  const DEFAULTS = {
    months: 8, units: 10000, price: 50,
    d0: 0.08, dmin: 0.01, qscale: 25000, carry: 0.8,   // defect rate = dmin + (d0-dmin)·exp(−Q/qscale); Q = carry·Q + prevention
    inspect_cost: 1.5, inspect_eff: 0.8,                // $ per unit inspected; share of defects inspection catches
    internal: 30, external: 120,                        // $ per defect caught inside / reaching the customer
    max_prev: 25000, noise: 0.10, quiz_months: 3
  };
  const ITEMS = [   // classification mini-quiz (Heizer Fig. 6.x categories)
    { t: "Training workers in quality methods", c: "prevention" },
    { t: "Testing incoming parts from suppliers", c: "appraisal" },
    { t: "Reworking a defective unit before it ships", c: "internal" },
    { t: "Warranty repairs and product returns", c: "external" },
    { t: "Designing the product to be easier to assemble right", c: "prevention" },
    { t: "Scrap from units that fail final inspection", c: "internal" },
    { t: "Lost future sales from unhappy customers", c: "external" },
    { t: "Wages of inspectors checking finished units", c: "appraisal" }
  ];
  const CATS = { prevention: "Prevention", appraisal: "Appraisal", internal: "Internal failure", external: "External failure" };

  function shocks(P) { const r = POM.rng((P.seed || 1) + 7); return Array.from({ length: P.months + 1 }, () => +(1 + P.noise * (2 * r() - 1)).toFixed(3)); }

  // d = {prevention $, inspect share 0..1}, Qprev = quality capital before this month
  function month(P, d, Qprev, shock) {
    const Q = P.carry * Qprev + d.prevention;
    const rate = (P.dmin + (P.d0 - P.dmin) * Math.exp(-Q / P.qscale)) * (shock || 1);
    const defects = Math.round(P.units * rate);
    const caught = Math.round(defects * d.inspect * P.inspect_eff), escaped = defects - caught;
    const c = { prevention: d.prevention, appraisal: Math.round(P.units * d.inspect * P.inspect_cost), internal: caught * P.internal, external: escaped * P.external };
    c.total = c.prevention + c.appraisal + c.internal + c.external;
    return { prevention: d.prevention, inspect: d.inspect, Q: Math.round(Q), rate: +rate.toFixed(4), defects, caught, escaped, cost: c, coq: c.total, pct_sales: c.total / (P.units * P.price) };
  }
  function play(P, policy) { // policy(m) → decision; returns rows
    const sh = shocks(P); let Q = 0; const rows = [];
    for (let m = 1; m <= P.months; m++) { const r = month(P, policy(m), Q, sh[m]); Q = r.Q; rows.push(r); }
    return rows;
  }
  function benchmarks(P) {
    const tot = (rows) => rows.reduce((s, r) => s + r.coq, 0);
    const b = { "Inspect everything, no prevention": tot(play(P, () => ({ prevention: 0, inspect: 1 }))),
                "Do nothing (no prevention, no inspection)": tot(play(P, () => ({ prevention: 0, inspect: 0 }))) };
    let best = null;
    for (let prev = 0; prev <= P.max_prev; prev += 1000) for (let k = 0; k <= P.months; k++) {
      const t = tot(play(P, (m) => ({ prevention: prev, inspect: m <= k ? 1 : 0 })));
      if (!best || t < best.t) best = { t, prev, k };
    }
    b[`Good plan: $${best.prev.toLocaleString()}/mo prevention, inspect all in months 1–${best.k}`] = best.t;
    return b;
  }
  window.QUAL = { DEFAULTS, ITEMS, CATS, shocks, month, play, benchmarks };
})();
