// Instructor dashboard: Control Chart Detective
(function () {
  const D = SPC.DEFAULTS, TYPES = ["none", "outside", "run", "trend", "spread"];
  const SHORT = { none: "In control", outside: "Point outside limits", run: "Run of 7", trend: "Trend", spread: "More variability (R)" };
  function render(el, session, data) {
    DK.reset();
    const P = { ...D, ...session.params }, G = SPC.charts(P), ps = DK.prep(data), all = ps.flatMap((p) => p.ev("chart"));
    const fin = ps.filter((p) => p.summary && p.finished_at), lim = ps.map((p) => p.ev("limits")[0]).filter(Boolean);
    const byType = (t, f) => { const a = all.filter((x) => x.type === t); return a.length ? a.filter(f).length / a.length : null; };
    const fa = byType("none", (x) => x.false_alarm), miss = DK.mean(["outside", "run", "trend", "spread"].map((t) => byType(t, (x) => x.miss)));
    el.innerHTML = DK.kpis([["Joined", ps.length], ["Finished", fin.length], ["Median score", fin.length ? DK.median(fin.map((p) => p.summary.score)) + " / " + G.charts.length * 4 : "–"],
        ["False-alarm rate (Type I)", DK.pct(fa)], ["Miss rate (Type II)", DK.pct(miss)]]) +
      `<div class="grid2">${DK.card("Accuracy by type of run", DK.canvas("c1", 260))}${DK.card("Each run: verdicts, in the order students saw them", DK.canvas("c2", 260))}</div>
       <div class="grid2">${DK.card("Setting up the charts: correct on the first try", DK.canvas("c3", 200) +
         `<p class="small">Correct limits: UCL x̄ = ${DK.f(G.L.ucl, 2)}, LCL x̄ = ${DK.f(G.L.lcl, 2)}, UCL R = ${DK.f(G.L.uclr, 2)} (x̿ = ${G.L.xbb}, R̄ = ${G.L.rbar}).</p>`)}
         ${DK.card("Where students marked the first signal (out-of-control runs)", DK.canvas("c4", 200) + `<p class="small muted">0 = exactly at the first signal. Negative = too early, positive = too late.</p>`)}</div>
       <div class="card"><h3>Debrief</h3><ol class="small" style="margin:0;padding-left:18px">
        <li><b>Natural vs. assignable variation.</b> Control limits (±3σ of x̄) separate random noise from a cause you can find and fix. Ask: what could cause each pattern on a bottling line (a worn nozzle, a new operator, temperature drift)?</li>
        <li><b>Two errors.</b> False alarms (stopping a good process): <b>${DK.pct(fa)}</b>. Misses (letting a bad process run): <b>${DK.pct(miss)}</b>. Wider limits mean fewer false alarms but more misses.</li>
        <li><b>Patterns inside the limits matter.</b> Runs and trends are usually caught later than a single point outside the limits. Compare the accuracy bars.</li>
        <li><b>Use both charts.</b> x̄ tracks the process center, R tracks its spread. A more variable process can look fine on the x̄ chart.</li>
        <li><b>Control ≠ capability.</b> A process can be in control and still not meet the specification. That is what Cp and Cpk measure.</li></ol></div>
       <div class="grid2">${DK.card("Reflections", `<div class="small" style="max-height:340px;overflow:auto">${DK.reflections(ps)}</div>`)}${DK.card("Leaderboard", DK.leaderboard(ps, "Score", (v) => v))}</div>`;
    const $ = (id) => el.querySelector("#" + id);
    DK.chart($("c1"), { type: "bar", data: { labels: TYPES.map((t) => SHORT[t]), datasets: [
      { label: "Right verdict", data: TYPES.map((t) => (byType(t, (x) => x.verdict_ok) || 0) * 100), backgroundColor: "#00533e" },
      { label: "Right pattern", data: TYPES.map((t) => t === "none" ? null : (byType(t, (x) => x.pattern_ok) || 0) * 100), backgroundColor: "#d08a00" },
      { label: "Right starting point (±1)", data: TYPES.map((t) => t === "none" ? null : (byType(t, (x) => x.point_ok) || 0) * 100), backgroundColor: "#3b6fb6" }] },
      options: { scales: { y: { min: 0, max: 100, ticks: { callback: (v) => v + "%" } } } } });
    const idx = G.charts.map((_, i) => i + 1);
    const cnt = (i, f) => all.filter((x) => x.chart === i && f(x)).length;
    DK.chart($("c2"), { type: "bar", data: { labels: G.charts.map((c, i) => `#${i + 1} ${SHORT[c.type]}`), datasets: [
      { label: "Said in control", data: idx.map((i) => cnt(i, (x) => x.verdict === "in")), backgroundColor: "#00533e", stack: "s" },
      { label: "Said out of control", data: idx.map((i) => cnt(i, (x) => x.verdict === "out")), backgroundColor: "#b23a2b", stack: "s" }] },
      options: { scales: { x: { ticks: { maxRotation: 60, minRotation: 40, font: { size: 10 } } } } } });
    DK.chart($("c3"), { type: "bar", data: { labels: ["UCL x̄", "LCL x̄", "UCL R"], datasets: [{ label: "% first try", backgroundColor: "#00533e",
      data: ["ucl", "lcl", "uclr"].map((k) => lim.length ? lim.filter((l) => l[k + "_tries"] === 1 && l[k + "_ok"]).length / lim.length * 100 : null) }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100 } } } });
    const errs = all.filter((x) => x.type !== "none" && x.verdict === "out" && x.point != null).map((x) => x.point - x.signal_at);
    const bins = Array.from({ length: 13 }, (_, i) => i - 6);
    DK.chart($("c4"), { type: "bar", data: { labels: bins.map((b) => (b > 0 ? "+" : "") + b), datasets: [{ label: "Students", backgroundColor: "#3b6fb6",
      data: bins.map((b) => errs.filter((e) => Math.max(-6, Math.min(6, e)) === b).length) }] }, options: { plugins: { legend: { display: false } } } });
  }
  function demo(session) {
    const P = { ...D, ...session.params }, G = SPC.charts(P), players = DK.fakePlayers(28), events = [];
    players.forEach((p, i) => {
      let tot = 0, fa = 0, mi = 0;
      G.charts.forEach((c, k) => {
        const skill = .55 + (i % 5) * .08, catchP = { none: .85, outside: .95, run: .6, trend: .65, spread: .5 }[c.type];
        const right = Math.random() < (c.type === "none" ? catchP : catchP * skill + .2);
        const ans = { verdict: (c.type === "none") === right ? "in" : "out" };
        ans.pattern = ans.verdict === "out" ? (Math.random() < .75 && c.type !== "none" ? c.type : "outside") : "none";
        ans.point = ans.verdict === "out" ? (c.signal ? c.signal.at + Math.round((Math.random() - .3) * 4) : 10) : null;
        const g = SPC.grade(c, ans); tot += g.points; fa += g.false_alarm; mi += g.miss;
        events.push({ player_id: p.id, round: k + 1, kind: "chart", data: { chart: k + 1, type: c.type, signal_at: c.signal ? c.signal.at : null, ...ans, ...g } });
      });
      events.push({ player_id: p.id, round: 0, kind: "limits", data: { ucl_tries: i % 3 ? 1 : 2, ucl_ok: true, lcl_tries: 1, lcl_ok: true, uclr_tries: i % 4 ? 1 : 3, uclr_ok: i % 4 > 0 } });
      if (p.finished_at) { p.summary = { score: tot, false_alarms: fa, misses: mi };
        events.push({ player_id: p.id, round: 0, kind: "reflection", data: { text: ["Trends were hardest because no point crossed the limit.", "I missed the R chart problem; I only watched x̄.", "Runs were sneaky."][i % 3] } }); }
    });
    return { players, events };
  }
  window.POM_GAMES.spc = { key: "spc", title: "Control Chart Detective", codePrefix: "SPC", defaults: D,
    params: [{ key: "charts", label: "Production runs to review", type: "number", min: 4, max: 12 },
      { key: "quiz", label: "Students calculate the control limits first", type: "select", options: [["true", "Yes"], ["false", "No"]] }],
    render, demo };
})();
