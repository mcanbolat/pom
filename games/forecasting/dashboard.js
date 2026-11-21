// Instructor dashboard: Forecasting Contest
(function () {
  const D = FCST.DEFAULTS;
  function render(el, session, data) {
    DK.reset();
    const P = { ...D, ...session.params }, C = FCST.contest(P), ps = DK.prep(data), played = ps.filter((p) => p.ev("forecast").length);
    const rounds = Array.from({ length: P.rounds }, (_, i) => i + 1), act = C.actual;
    const stat = played.map((p) => { const r = p.ev("forecast"), n = r.length, fc = r.map((x) => x.forecast), a = r.map((x) => x.actual);
      return { p, n, mad: FCST.mad(fc, a), es: FCST.mad(C.es.slice(0, n), a), alpha: FCST.impliedAlpha(fc, a), bias: DK.mean(r.map((x) => x.error)) }; }).filter((s) => s.n >= 3);
    const crowd = rounds.map((k) => DK.mean(played.map((p) => (p.ev("forecast").find((x) => x.round === k) || {}).forecast)));
    const crowdMad = FCST.mad(crowd.map((v, i) => v == null ? null : v), act);
    const madAll = { naive: FCST.mad(C.naive, act), ma: FCST.mad(C.ma, act), es: FCST.mad(C.es, act) };
    const qz = ps.map((p) => p.ev("quiz")[0]).filter(Boolean);
    el.innerHTML = DK.kpis([["Joined", ps.length], ["Finished", ps.filter((p) => p.finished_at).length], ["Median student MAD", DK.f(DK.median(stat.map((s) => s.mad)), 1)],
        ["Beat exp. smoothing", DK.pct(stat.length ? stat.filter((s) => s.mad < s.es).length / stat.length : null)], ["Class-average forecast MAD", DK.f(crowdMad, 1)], ["Median implied α", DK.f(DK.median(stat.map((s) => s.alpha)), 2)]]) +
      `<div class="grid2">${DK.card("Actual demand vs. the class's average forecast", DK.canvas("c1", 260))}${DK.card("Students' MAD", DK.canvas("c2", 260) + `<p class="small">Methods over all ${P.rounds} months: naive ${DK.f(madAll.naive, 1)}, 3-month MA ${DK.f(madAll.ma, 1)}, exp. smoothing (α=${P.alpha}) ${DK.f(madAll.es, 1)}, class average ${DK.f(crowdMad, 1)}.</p>`)}</div>
       <div class="grid2">${DK.card("How strongly students reacted to their last error", DK.canvas("c3", 260) + `<p class="small muted">Implied α = slope of (change in forecast) on (last month's error). The dashed line marks α = ${P.alpha}.</p>`)}
         ${DK.card("Warm-up: correct on the first try", DK.canvas("c4", 180) + `<p class="small">Bias (average error, + = forecasts too low): class median ${DK.f(DK.median(stat.map((s) => s.bias)), 1)}.</p>`)}</div>
       <div class="card"><h3>Debrief</h3><ol class="small" style="margin:0;padding-left:18px">
        <li><b>MAD = Σ|actual − forecast| ÷ n.</b> The class median was ${DK.f(DK.median(stat.map((s) => s.mad)), 1)}, compared with ${DK.f(madAll.es, 1)} for exponential smoothing. ${DK.pct(stat.length ? stat.filter((s) => s.mad < s.es).length / stat.length : null)} of students beat it.</li>
        <li><b>Chasing noise.</b> A high implied α (close to 1) means a student adjusts almost fully to each surprise. That behaves like the naive method, which does badly when month-to-month noise is large.</li>
        <li><b>Responsiveness vs. stability.</b> Demand jumped in month ${P.history + P.jump_at}. A larger α (or a shorter moving average) catches up faster, but it also reacts to random ups and downs in normal months.</li>
        <li><b>Wisdom of the crowd.</b> Averaging the class's forecasts gave a MAD of ${DK.f(crowdMad, 1)}, better than ${DK.pct(stat.length ? stat.filter((s) => s.mad > crowdMad).length / stat.length : null)} of individuals. Combining forecasts cancels out individual errors.</li>
        <li><b>Bias vs. accuracy.</b> MAD hides the direction of errors. A tracking signal (running sum of errors ÷ MAD) shows when forecasts are consistently too high or too low.</li></ol></div>
       <div class="grid2">${DK.card("Reflections", `<div class="small" style="max-height:340px;overflow:auto">${DK.reflections(ps)}</div>`)}${DK.card("Leaderboard (lowest MAD)", DK.leaderboard(ps, "MAD", (v) => DK.f(v, 1), true))}</div>`;
    const $ = (id) => el.querySelector("#" + id), months = rounds.map((k) => "M" + (P.history + k));
    DK.chart($("c1"), { type: "line", data: { labels: months, datasets: [
      { label: "Actual", data: act, borderColor: "#00533e", backgroundColor: "#00533e", borderWidth: 3 },
      { label: "Class average forecast", data: crowd, borderColor: "#d08a00", borderDash: [5, 3] },
      { label: `Exp. smoothing α=${P.alpha}`, data: C.es, borderColor: "#3b6fb6", borderDash: [2, 2] }] } });
    const mads = stat.map((s) => s.mad), lo = Math.floor(Math.min(...mads, madAll.es) / 5) * 5, hi = Math.max(...mads, madAll.naive) + 1, h = DK.hist(mads, 10, lo, hi);
    DK.chart($("c2"), { type: "bar", data: { labels: h.labels, datasets: [{ label: "Students", data: h.counts, backgroundColor: "#00533e" }] }, options: { plugins: { legend: { display: false } } } });
    DK.chart($("c3"), { type: "scatter", data: { datasets: [{ label: "Students", data: stat.filter((s) => s.alpha != null).map((s) => ({ x: s.alpha, y: s.mad, n: s.p.nickname })), backgroundColor: "#00533ecc", pointRadius: 6 },
      { label: "α used by exp. smoothing", type: "line", data: [{ x: P.alpha, y: lo }, { x: P.alpha, y: hi }], borderColor: "#d08a00", borderDash: [6, 4], pointRadius: 0 }] },
      options: { plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (t) => `${t.raw.n || ""} α ${DK.f(t.raw.x, 2)}, MAD ${DK.f(t.raw.y, 1)}` } } },
        scales: { x: { type: "linear", title: { display: true, text: "Implied α" } }, y: { title: { display: true, text: "MAD" } } } } });
    DK.chart($("c4"), { type: "bar", data: { labels: ["3-month moving average", "Exponential smoothing"], datasets: [{ label: "%", backgroundColor: "#00533e",
      data: ["ma", "es"].map((k) => qz.length ? qz.filter((q) => q[k + "_tries"] === 1 && q[k + "_ok"]).length / qz.length * 100 : null) }] },
      options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { min: 0, max: 100 } } } });
  }
  function demo(session) {
    const P = { ...D, ...session.params }, C = FCST.contest(P), players = DK.fakePlayers(28), events = [];
    players.forEach((p, i) => {
      const a = .1 + (i % 9) * .1; let f = C.d.slice(P.history - 3, P.history).reduce((s, v) => s + v, 0) / 3; const fc = [];
      for (let k = 0; k < P.rounds; k++) {
        const v = Math.round(f + (Math.random() - .5) * 30); fc.push(v);
        events.push({ player_id: p.id, round: k + 1, kind: "forecast", data: { round: k + 1, forecast: v, actual: C.actual[k], error: C.actual[k] - v } });
        f = f + a * (C.actual[k] - f);
      }
      events.push({ player_id: p.id, round: 0, kind: "quiz", data: { ma_tries: 1, ma_ok: i % 5 > 0, es_tries: i % 3 ? 1 : 2, es_ok: true } });
      if (p.finished_at) { p.summary = { score: FCST.mad(fc, C.actual) };
        events.push({ player_id: p.id, round: 0, kind: "reflection", data: { text: ["Averaged the last few months.", "I followed the last actual closely.", "Adjusted halfway toward the last actual."][i % 3] } }); }
    });
    return { players, events };
  }
  window.POM_GAMES.forecasting = { key: "forecasting", title: "Forecasting Contest", codePrefix: "FCST", defaults: D,
    params: [{ key: "rounds", label: "Months to forecast", type: "number", min: 4, max: 20 }, { key: "noise", label: "Random noise (std. dev.)", type: "number" },
      { key: "jump", label: "Level jump (+ or −)", type: "number" }, { key: "jump_at", label: "Jump happens in contest month", type: "number", min: 1 },
      { key: "alpha", label: "α for the exp. smoothing benchmark", type: "number", step: 0.05, min: 0.05, max: 0.95 },
      { key: "quiz", label: "Warm-up calculations", type: "select", options: [["true", "Yes"], ["false", "No"]] }],
    render, demo };
})();
