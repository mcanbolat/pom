// Instructor dashboard: Cost of Quality
(function () {
  const D = QUAL.DEFAULTS, COL = { prevention: "#00533e", appraisal: "#3b6fb6", internal: "#d08a00", external: "#b23a2b" };
  function render(el, session, data) {
    DK.reset();
    const P = { ...D, ...session.params }, ps = DK.prep(data), played = ps.filter((p) => p.ev("month").length);
    const months = Array.from({ length: P.months }, (_, i) => i + 1);
    const at = (m, f) => DK.mean(played.map((p) => { const r = p.ev("month").find((x) => x.month === m); return r ? f(r) : null; }));
    const fin = ps.filter((p) => p.summary && p.finished_at), bench = QUAL.benchmarks(P);
    const cls = ps.map((p) => p.ev("classify")[0]).filter(Boolean);
    el.innerHTML = DK.kpis([["Joined", ps.length], ["Finished", fin.length], ["Median total COQ", DK.money(DK.median(fin.map((p) => p.summary.score)))],
        ["Best plan (benchmark)", DK.money(Object.values(bench)[2])], ["Warm-up: avg correct", cls.length ? DK.f(DK.mean(cls.map((c) => c.correct)), 1) + " / 8" : "–"]]) +
      `<div class="grid2">${DK.card("Average spending choices by month", DK.canvas("c1"))}${DK.card("Average cost of quality by month, by category", DK.canvas("c2"))}</div>
       <div class="grid2">${DK.card("Each student: total COQ vs total prevention spending", DK.canvas("c3", 260) + `<p class="small muted">The dashed lines are the benchmarks, played on the same random months.</p>`)}
       ${DK.card("Warm-up: share correct by item", DK.canvas("c4", 260))}</div>
       <div class="card"><h3>Debrief</h3><ol class="small" style="margin:0;padding-left:18px">
        <li><b>Total COQ = prevention + appraisal + internal failure + external failure.</b> On the same months: ${Object.entries(bench).map(([k, v]) => `${k}: <b>${DK.money(v)}</b>`).join("; ")}. Class median: <b>${DK.money(DK.median(fin.map((p) => p.summary.score)))}</b>.</li>
        <li><b>You can't inspect quality in.</b> Inspection only sorts out defects that were already made (and misses ${Math.round((1 - P.inspect_eff) * 100)}% of them). Prevention stops them from being made.</li>
        <li><b>The timing trade-off.</b> Prevention pays off with a delay because its effect builds up. Inspection is worth it while the defect rate is high. Once prevention has lowered the defect rate, inspection costs more than it saves. Break-even: inspect when defect rate × ${Math.round(P.inspect_eff * 100)}% × ($${P.external} − $${P.internal}) &gt; $${P.inspect_cost} per unit, i.e. at a defect rate above ${(P.inspect_cost / (P.inspect_eff * (P.external - P.internal)) * 100).toFixed(1)}%.</li>
        <li><b>External failures cost the most</b> (they include lost customers). Ask: which of these costs never show up in an accounting report?</li>
        <li>This links to TQM, Deming and Juran, and to the Taguchi loss idea that quality costs keep rising as you move away from the target.</li></ol></div>
       <div class="grid2">${DK.card("Reflections", `<div class="small" style="max-height:340px;overflow:auto">${DK.reflections(ps)}</div>`)}${DK.card("Leaderboard (lowest COQ)", DK.leaderboard(ps, "Total COQ", DK.money, true))}</div>`;
    const $ = (id) => el.querySelector("#" + id);
    DK.chart($("c1"), { type: "line", data: { labels: months.map((m) => "M" + m), datasets: [
      { label: "Prevention $ (left)", data: months.map((m) => at(m, (r) => r.prevention)), borderColor: COL.prevention, yAxisID: "y" },
      { label: "% inspected (right)", data: months.map((m) => at(m, (r) => r.inspect * 100)), borderColor: COL.appraisal, yAxisID: "y1" }] },
      options: { scales: { y1: { position: "right", min: 0, max: 100, grid: { drawOnChartArea: false } } } } });
    DK.chart($("c2"), { type: "bar", data: { labels: months.map((m) => "M" + m), datasets: Object.keys(COL).map((k) => ({ label: QUAL.CATS[k], data: months.map((m) => at(m, (r) => r.cost[k])), backgroundColor: COL[k], stack: "s" })) } });
    const bvals = Object.values(bench), xmax = P.max_prev * P.months;
    DK.chart($("c3"), { type: "scatter", data: { datasets: [
      { label: "Students", data: fin.map((p) => ({ x: p.summary.total_prev, y: p.summary.score, n: p.nickname })), backgroundColor: "#00533ecc", pointRadius: 6 },
      { label: "Inspect everything", type: "line", data: [{ x: 0, y: bvals[0] }, { x: xmax, y: bvals[0] }], borderColor: "#3b6fb6", borderDash: [6, 4], pointRadius: 0 },
      { label: "Best simple plan", type: "line", data: [{ x: 0, y: bvals[2] }, { x: xmax, y: bvals[2] }], borderColor: "#d08a00", borderDash: [6, 4], pointRadius: 0 }] },
      options: { plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (t) => `${t.raw.n || ""} ${DK.money(t.raw.y)}` } } },
        scales: { x: { type: "linear", title: { display: true, text: "Total prevention spending ($)" } }, y: { title: { display: true, text: "Total cost of quality ($)" } } } } });
    DK.chart($("c4"), { type: "bar", data: { labels: QUAL.ITEMS.map((it) => it.t.length > 34 ? it.t.slice(0, 32) + "…" : it.t),
      datasets: [{ label: "% correct", data: QUAL.ITEMS.map((it, i) => cls.length ? cls.filter((c) => c.answers[i] === it.c).length / cls.length * 100 : null), backgroundColor: "#00533e" }] },
      options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { min: 0, max: 100 } } } });
  }
  function demo(session) {
    const P = { ...D, ...session.params }, players = DK.fakePlayers(26), events = [];
    players.forEach((p, i) => {
      const style = i % 3; let Q = 0; const sh = QUAL.shocks(P), rows = [];
      for (let m = 1; m <= P.months; m++) {
        const d = style === 0 ? { prevention: 0, inspect: 1 } : style === 1 ? { prevention: Math.min(P.max_prev, 4000 + m * 2000), inspect: m < 4 ? 1 : .25 } : { prevention: 8000, inspect: .5 };
        const r = QUAL.month(P, d, Q, sh[m]); Q = r.Q; rows.push(r);
        events.push({ player_id: p.id, round: m, kind: "month", data: { month: m, ...r, quiz_done: true } });
      }
      const ans = {}; QUAL.ITEMS.forEach((it, k) => ans[k] = Math.random() < .7 ? it.c : "appraisal");
      events.push({ player_id: p.id, round: 0, kind: "classify", data: { correct: Object.entries(ans).filter(([k, v]) => QUAL.ITEMS[k].c === v).length, n: 8, answers: ans } });
      if (p.finished_at) { p.summary = { score: rows.reduce((t, r) => t + r.coq, 0), total_prev: rows.reduce((t, r) => t + r.prevention, 0) };
        events.push({ player_id: p.id, round: 0, kind: "reflection", data: { text: ["I inspected everything to be safe.", "Inspected early, then shifted money to prevention.", "Kept a steady middle ground."][style] } }); }
    });
    return { players, events };
  }
  window.POM_GAMES.quality = { key: "quality", title: "Cost of Quality", codePrefix: "QUAL", defaults: D,
    params: [{ key: "months", label: "Months", type: "number", min: 3, max: 15 },
      { key: "external", label: "External failure cost per defect ($)", type: "number" },
      { key: "internal", label: "Internal failure cost per defect ($)", type: "number" },
      { key: "inspect_cost", label: "Inspection cost per unit ($)", type: "number", step: 0.1 },
      { key: "quiz_months", label: "Months with calculation check", type: "number", min: 0, max: 15 }],
    render, demo };
})();
