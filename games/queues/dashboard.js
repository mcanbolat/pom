// Instructor dashboard: Staff the Checkout
(function () {
  const D = QUEUE.DEFAULTS;
  function render(el, session, data) {
    DK.reset();
    const P = { ...D, ...session.params }, ps = DK.prep(data), fin = ps.filter((p) => p.summary && p.finished_at), all = ps.flatMap((p) => p.ev("hour"));
    const H = P.rates.map((l, k) => ({ k, l, b: QUEUE.best(P, l), rows: all.filter((r) => r.hour === k + 1) })), qz = ps.map((p) => p.ev("quiz")[0]).filter(Boolean);
    const bestDay = H.reduce((t, h) => t + h.b.total, 0), lab = (k) => { const h = P.start_hour + k; return `${((h + 11) % 12) + 1}${h < 12 ? "am" : "pm"}`; };
    el.innerHTML = DK.kpis([["Joined", ps.length], ["Finished", fin.length], ["Median day cost", DK.money(DK.median(fin.map((p) => p.summary.score)))], ["Optimal day", DK.money(bestDay)],
        ["Hours staffed optimally", DK.pct(all.length ? all.filter((r) => r.s === r.best_s).length / all.length : null)], ["Understaffed hours", DK.pct(all.length ? all.filter((r) => r.s < r.best_s).length / all.length : null)]]) +
      `<div class="grid2">${DK.card("Average cashiers scheduled vs. optimal, by hour", DK.canvas("c1", 250))}${DK.card("Utilization: class average vs. optimal, by hour", DK.canvas("c2", 250))}</div>
       <div class="grid2">${DK.card("Each student: day cost vs. average utilization", DK.canvas("c3", 250))}${DK.card("Warm-up (M/M/1): correct on the first try", DK.canvas("c4", 200))}</div>
       <div class="card"><h3>Debrief</h3><ol class="small" style="margin:0;padding-left:18px">
        <li><b>Total cost = cost of service + cost of waiting</b> = s × $${P.wage} + Lq × $${P.wait_cost}. The optimal day costs ${DK.money(bestDay)}; the class median was ${DK.money(DK.median(fin.map((p) => p.summary.score)))}.</li>
        <li><b>Nonlinear waiting.</b> For M/M/1, Lq = ρ²/(1 − ρ): going from 80% to 90% busy more than doubles the line. Ask: why do lines blow up long before 100%?</li>
        <li><b>No single "right" utilization.</b> The optimal ρ by hour was ${H.map((h) => `${lab(h.k)} ${Math.round(h.b.rho * 100)}%`).join(", ")}. Busier hours with more cashiers can run at higher utilization, because pooled servers absorb the randomness.</li>
        <li><b>Stability.</b> You need s·μ &gt; λ. At ${Math.max(...P.rates)} customers an hour that means at least ${Math.floor(Math.max(...P.rates) / P.mu) + 1} cashiers.</li>
        <li><b>Model assumptions.</b> Poisson arrivals, exponential service, a single line, first come first served, no balking. Which of these hold at a real checkout? What changes with self-checkout?</li></ol></div>
       <div class="grid2">${DK.card("Reflections", `<div class="small" style="max-height:340px;overflow:auto">${DK.reflections(ps)}</div>`)}${DK.card("Leaderboard (lowest cost)", DK.leaderboard(ps, "Day cost", DK.money, true))}</div>`;
    const $ = (id) => el.querySelector("#" + id), labels = H.map((h) => `${lab(h.k)} (λ=${h.l})`);
    DK.chart($("c1"), { type: "bar", data: { labels, datasets: [{ label: "Class average", data: H.map((h) => DK.mean(h.rows.map((r) => r.s))), backgroundColor: "#00533e" },
      { label: "Optimal", data: H.map((h) => h.b.s), backgroundColor: "#d08a00" }] } });
    DK.chart($("c2"), { type: "line", data: { labels, datasets: [{ label: "Class average ρ", data: H.map((h) => (DK.mean(h.rows.map((r) => r.rho)) || 0) * 100), borderColor: "#00533e", borderWidth: 3 },
      { label: "Optimal ρ", data: H.map((h) => h.b.rho * 100), borderColor: "#d08a00", borderDash: [5, 3] }] }, options: { scales: { y: { min: 0, max: 100, ticks: { callback: (v) => v + "%" } } } } });
    DK.chart($("c3"), { type: "scatter", data: { datasets: [{ label: "Students", backgroundColor: "#00533ecc", pointRadius: 6, data: fin.map((p) => ({ x: p.summary.avg_rho * 100, y: p.summary.score, n: p.nickname })) }] },
      options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (t) => `${t.raw.n}: ρ ${t.raw.x.toFixed(0)}%, ${DK.money(t.raw.y)}` } } },
        scales: { x: { title: { display: true, text: "Average utilization (%)" } }, y: { title: { display: true, text: "Day cost ($)" } } } } });
    DK.chart($("c4"), { type: "bar", data: { labels: ["Utilization (rho)", "Lq", "Wq"], datasets: [{ label: "%", backgroundColor: "#00533e",
      data: ["rho", "lq", "wq"].map((k) => qz.length ? qz.filter((q) => q[k + "_tries"] === 1 && q[k + "_ok"]).length / qz.length * 100 : null) }] },
      options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { min: 0, max: 100 } } } });
  }
  function demo(session) {
    const P = { ...D, ...session.params }, players = DK.fakePlayers(27), events = [];
    players.forEach((p, i) => {
      const rows = P.rates.map((l, k) => { const b = QUEUE.best(P, l), minS = Math.floor(l / P.mu) + 1;
        const s = Math.max(minS, b.s + (i % 4 === 0 ? 1 : i % 4 === 1 ? -1 : 0) + (Math.random() < .2 ? 1 : 0));
        const c = QUEUE.hourCost(P, l, s); return { hour: k + 1, lambda: l, s, rho: c.rho, Lq: c.Lq, Wq: c.Wq, service: c.service, waiting: c.waiting, total: c.total, best_s: b.s, best_total: b.total }; });
      rows.forEach((r) => events.push({ player_id: p.id, round: r.hour, kind: "hour", data: r }));
      events.push({ player_id: p.id, round: 0, kind: "quiz", data: { rho_tries: 1, rho_ok: true, lq_tries: i % 3 ? 1 : 2, lq_ok: true, wq_tries: i % 2 ? 1 : 3, wq_ok: i % 2 > 0 } });
      if (p.finished_at) { p.summary = { score: rows.reduce((t, r) => t + r.total, 0), avg_rho: rows.reduce((t, r) => t + r.rho, 0) / rows.length };
        events.push({ player_id: p.id, round: 0, kind: "reflection", data: { text: ["Kept cashiers about 80% busy.", "Used the minimum that kept the line stable.", "Added an extra cashier in busy hours."][i % 3] } }); }
    });
    return { players, events };
  }
  window.POM_GAMES.queues = { key: "queues", title: "Staff the Checkout", codePrefix: "QUEUE", defaults: D,
    params: [{ key: "mu", label: "Service rate per cashier (customers/hr)", type: "number" }, { key: "wage", label: "Cashier wage ($/hr)", type: "number" },
      { key: "wait_cost", label: "Cost of a customer waiting in line ($/hr)", type: "number" }, { key: "quiz", label: "Warm-up M/M/1 calculation", type: "select", options: [["true", "Yes"], ["false", "No"]] }],
    render, demo };
})();
