// Instructor dashboard: Line Balancing Puzzle
(function () {
  const D = LINE.DEFAULTS;
  function render(el, session, data) {
    DK.reset();
    const P = { ...D, ...session.params }, ps = DK.prep(data), bal = ps.flatMap((p) => p.ev("balance")), qz = ps.map((p) => p.ev("quiz")[0]).filter(Boolean);
    const R = P.demands.map((d, k) => { const ct = LINE.cycle(P, k); return { k, d, ct, min: LINE.minStations(ct), opt: LINE.optimum(ct), rows: bal.filter((b) => b.round === k + 1) }; });
    el.innerHTML = DK.kpis([["Joined", ps.length], ["Finished", ps.filter((p) => p.finished_at).length],
        ...R.map((r) => [`Round ${r.k + 1}: matched the best (${r.opt} stations)`, DK.pct(r.rows.length ? r.rows.filter((b) => b.stations === r.opt).length / r.rows.length : null)]),
        ["Median efficiency", DK.pct(DK.median(bal.map((b) => b.eff)))]]) +
      `<div class="grid2">${DK.card("Stations used, by round", DK.canvas("c1", 250))}${DK.card("Warm-up: correct on the first try", DK.canvas("c2", 200))}</div>
       <div class="card"><h3>Debrief</h3><ol class="small" style="margin:0;padding-left:18px">
        ${R.map((r) => `<li><b>Round ${r.k + 1}: ${r.d}/day.</b> Cycle time = ${P.minutes}×60 ÷ ${r.d} = ${+r.ct.toFixed(1)} s. Theoretical minimum = ${LINE.total} ÷ ${+r.ct.toFixed(1)} → ${r.min} stations. Best achievable: <b>${r.opt}</b> (efficiency ${(LINE.total / (r.opt * r.ct) * 100).toFixed(1)}%).</li>`).join("")}
        <li><b>Why can't you always reach the minimum?</b> Tasks can't be split, and precedence limits which tasks can share a station. Ask: which task "blocks" a tight packing?</li>
        <li><b>Heuristics.</b> Longest task time first, most following tasks, and ranked positional weight. Which one did students use without realizing it? (See the reflections.)</li>
        <li><b>Lower demand, longer cycle time.</b> When demand fell, the line could run with fewer stations (fewer workers), but only if it was rebalanced.</li>
        <li><b>Maximum output.</b> No line can run faster than its longest task (${Math.max(...LINE.TASKS.map((t) => t.t))} s), so the most it can make is ${Math.floor(P.minutes * 60 / Math.max(...LINE.TASKS.map((t) => t.t)))} units a day unless that task is split or done in parallel.</li></ol></div>
       <div class="grid2">${DK.card("Reflections", `<div class="small" style="max-height:340px;overflow:auto">${DK.reflections(ps)}</div>`)}${DK.card("Leaderboard (efficiency)", DK.leaderboard(ps, "Avg efficiency", (v) => (v * 100).toFixed(1) + "%"))}</div>`;
    const $ = (id) => el.querySelector("#" + id), xs = Array.from({ length: 7 }, (_, i) => i + 5);
    DK.chart($("c1"), { type: "bar", data: { labels: xs.map((x) => x + " stations"), datasets: R.map((r, i) => ({ label: `Round ${r.k + 1} (best ${r.opt})`, backgroundColor: DK.COLORS[i], data: xs.map((x) => r.rows.filter((b) => b.stations === x).length) })) } });
    DK.chart($("c2"), { type: "bar", data: { labels: ["Cycle time", "Sum of task times", "Minimum stations"], datasets: [{ label: "%", backgroundColor: "#00533e",
      data: ["ct", "sum", "min"].map((k) => qz.length ? qz.filter((q) => q[k + "_tries"] === 1 && q[k + "_ok"]).length / qz.length * 100 : null) }] },
      options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { min: 0, max: 100 } } } });
  }
  function demo(session) {
    const P = { ...D, ...session.params }, players = DK.fakePlayers(26), events = [];
    players.forEach((p, i) => {
      const rounds = P.demands.map((d, k) => { const ct = LINE.cycle(P, k), opt = LINE.optimum(ct), st = opt + (i % 3 === 0 ? 1 : 0) + (i % 7 === 0 ? 1 : 0);
        return { round: k + 1, demand: d, ct, stations: st, eff: LINE.total / (st * ct), opt }; });
      rounds.forEach((r) => events.push({ player_id: p.id, round: r.round, kind: "balance", data: r }));
      events.push({ player_id: p.id, round: 0, kind: "quiz", data: { ct_tries: 1, ct_ok: true, sum_tries: 1, sum_ok: i % 6 > 0, min_tries: i % 3 ? 1 : 2, min_ok: true } });
      if (p.finished_at) { p.summary = { score: rounds.reduce((t, r) => t + r.eff, 0) / rounds.length };
        events.push({ player_id: p.id, round: 0, kind: "reflection", data: { text: ["Put the longest available task first.", "Filled each station as full as possible in order.", "Trial and error."][i % 3] } }); }
    });
    return { players, events };
  }
  window.POM_GAMES.layout = { key: "layout", title: "Line Balancing Puzzle", codePrefix: "LINE", defaults: D,
    params: [{ key: "minutes", label: "Production minutes per day", type: "number" }, { key: "quiz", label: "Warm-up calculations", type: "select", options: [["true", "Yes"], ["false", "No"]] }],
    render, demo };
})();
