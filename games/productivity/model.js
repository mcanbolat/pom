// Bakery Productivity Challenge — shared model (used by the game and the dashboard).
// Heizer, Render & Munson, Ch. 1: single-factor (labor) and multifactor productivity.
(function () {
  const DEFAULTS = {
    weeks: 8,
    hours: 40,            // hours per baker per week
    wage: 15,             // $ per labor-hour
    rate: 6,              // loaves per labor-hour (base)
    oven_cap: 1500,       // loaves per oven per week
    oven_capital: 400,    // $ per oven per week (lease/depreciation)
    oven_energy: 200,     // $ per oven per week
    material: 0.80,       // $ per loaf
    price: 4.00,          // $ per loaf (for profit only)
    mixer_lease: 350, mixer_energy: 50, mixer_mult: 1.30,
    robot_lease: 2400, robot_energy: 100, robot_mult: 1.50,
    training_cost: 1200, training_mult: 1.10,
    noise: 0.05,          // weekly kitchen efficiency varies ± this share
    max_bakers: 12, max_ovens: 3,
    quiz: true,           // students must calculate LP and MFP each week
    conditions: ["labor", "mfp"],
    assignment: "random"  // "random" (balanced) | "labor" | "mfp"
  };
  const BASELINE = { bakers: 5, ovens: 1, mixer: false, robot: false, training: false };
  const METRIC = {
    labor: { key: "lp", name: "Labor productivity", unit: "loaves per labor-hour", short: "LP" },
    mfp:   { key: "mfp", name: "Multifactor productivity", unit: "loaves per $ of input", short: "MFP" }
  };

  // weekly efficiency shocks, identical for everyone in the session
  function shocks(P) {
    const r = window.POM ? window.POM.rng(P.seed || 1) : Math.random;
    return Array.from({ length: P.weeks + 1 }, (_, i) => i === 0 ? 1 : +(1 + P.noise * (2 * r() - 1)).toFixed(3));
  }

  // d = {bakers, ovens, mixer, robot, training (bought this week)}, trained = already trained before this week
  function week(P, d, trained, shock) {
    const t = trained || d.training;
    const mult = (d.mixer ? P.mixer_mult : 1) * (d.robot ? P.robot_mult : 1) * (t ? P.training_mult : 1);
    const laborHours = d.bakers * P.hours;
    const laborCap = laborHours * P.rate * mult * (shock || 1);
    const ovenCap = d.ovens * P.oven_cap;
    const out = Math.floor(Math.min(laborCap, ovenCap));
    const labor = laborHours * P.wage;
    const materials = +(out * P.material).toFixed(2);
    const energy = d.ovens * P.oven_energy + (d.mixer ? P.mixer_energy : 0) + (d.robot ? P.robot_energy : 0);
    const capital = d.ovens * P.oven_capital + (d.mixer ? P.mixer_lease : 0) + (d.robot ? P.robot_lease : 0);
    const training = d.training ? P.training_cost : 0;
    const total = +(labor + materials + energy + capital + training).toFixed(2);
    return {
      bakers: d.bakers, ovens: d.ovens, mixer: !!d.mixer, robot: !!d.robot, training: !!d.training, trained: !!t,
      shock: shock || 1, out, laborHours, labor, materials, energy, capital, training_cost: training, total,
      lp: out / laborHours, mfp: out / total, profit: +(out * P.price - total).toFixed(2),
      oven_limited: laborCap > ovenCap
    };
  }

  // grading for the calculation check: within 1% (or rounding)
  function close(ans, truth, dec) {
    const a = parseFloat(String(ans).replace(/[$,\s]/g, ""));
    if (!isFinite(a)) return false;
    return Math.abs(a - truth) <= Math.max(Math.abs(truth) * 0.01, 0.5 * Math.pow(10, -dec) + 1e-9);
  }

  function summarize(P, rows, condition) {
    const n = rows.length || 1, avg = (k) => rows.reduce((s, r) => s + r[k], 0) / n;
    const first = rows[0] || {}, last = rows[rows.length - 1] || {};
    const fr = (k) => { const q = rows.filter(r => r[k + "_tries"] > 0); return q.length ? +(q.filter(r => r[k + "_tries"] === 1 && r[k + "_ok"]).length / q.length).toFixed(3) : null; };
    const s = {
      avg_lp: +avg("lp").toFixed(4), avg_mfp: +avg("mfp").toFixed(5),
      total_profit: +rows.reduce((t, r) => t + r.profit, 0).toFixed(2),
      lp_growth: first.lp ? +((last.lp - first.lp) / first.lp).toFixed(4) : null,
      mfp_growth: first.mfp ? +((last.mfp - first.mfp) / first.mfp).toFixed(4) : null,
      lp_first_try: fr("lp"), mfp_first_try: fr("mfp"),
      weeks: rows.length
    };
    s.metric = condition || "mfp";
    s.score = condition === "labor" ? s.avg_lp : s.avg_mfp;
    return s;
  }

  window.PROD = { DEFAULTS, BASELINE, METRIC, shocks, week, close, summarize };
})();
