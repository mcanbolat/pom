// Instructor dashboard: Order Up! (EOQ & ROP)
(function () {
  const D0 = INV.DEFAULTS;
  function render(el, session, data) {
    DK.reset();
    const P = { ...D0, ...session.params }, ps = DK.prep(data), played = ps.filter((p) => p.ev("week").length), fin = ps.filter((p) => p.summary && p.finished_at);
    const b = INV.benchmarks(P), Q = INV.eoq(P), R0 = INV.rop(P), R1 = R0 + INV.safety(P), weeks = Array.from({ length: P.weeks }, (_, i) => i + 1);
    const orders = played.flatMap((p) => p.ev("week").filter((r) => r.order > 0)), qz = ps.map((p) => p.ev("quiz")[0]).filter(Boolean);
    const dem = INV.demand(P), eoqRun = INV.runPolicy(P, Math.round(Q), Math.round(R1), dem);
    el.innerHTML = DK.kpis([["Joined", ps.length], ["Finished", fin.length], ["Median total cost", DK.money(DK.median(fin.map((p) => p.summary.score)))],
        ["EOQ + safety stock", DK.money(b.eoq_ss.total)], ["Beat EOQ + safety stock", DK.pct(fin.length ? fin.filter((p) => p.summary.score < b.eoq_ss.total).length / fin.length : null)], ["Median order size", DK.f(DK.median(orders.map((o) => o.order)), 0)]]) +
      `<div class="grid2">${DK.card("Order sizes the class chose", DK.canvas("c1", 250) + `<p class="small muted">EOQ = ${Q.toFixed(0)}</p>`)}${DK.card("Inventory position when students ordered", DK.canvas("c2", 250) + `<p class="small muted">ROP = ${R0}; with safety stock ≈ ${R1.toFixed(0)}</p>`)}</div>
       <div class="grid2">${DK.card("Average on-hand inventory by week", DK.canvas("c3", 250))}${DK.card("Each student: lost sales vs. average inventory", DK.canvas("c4", 250))}</div>
       <div class="card"><h3>Debrief</h3><ol class="small" style="margin:0;padding-left:18px">
        <li><b>EOQ = √(2DS/H) = ${Q.toFixed(1)}.</b> At the EOQ, annual ordering cost (D/Q × S) equals annual holding cost (Q/2 × H). The total-cost curve is flat near the EOQ, so being 20% off costs little.</li>
        <li><b>ROP = d × L = ${R0}.</b> With uncertain demand, that runs out about half the time before the order arrives. Safety stock z·σ·√L ≈ ${INV.safety(P).toFixed(0)} raises the ROP to ≈ ${R1.toFixed(0)}.</li>
        <li><b>Benchmarks on the same demand:</b> EOQ + ROP with no safety stock ${DK.money(b.eoq.total)}; with safety stock ${DK.money(b.eoq_ss.total)}; best fixed (Q, R) in hindsight ${DK.money(b.best.total)} (Q=${b.best.Q}, R=${b.best.R}). Class median ${DK.money(DK.median(fin.map((p) => p.summary.score)))}.</li>
        <li><b>Inventory position, not on-hand.</b> A common mistake is to reorder based on what's on the shelf and forget what's already on order, which leads to double orders and too much stock.</li>
        <li><b>Service level trade-off.</b> More safety stock means fewer lost sales but higher holding cost. The right z depends on stockout cost vs. holding cost (${DK.money(P.stockout)} vs ${DK.money(P.h)}/week).</li></ol></div>
       <div class="grid2">${DK.card("Reflections", `<div class="small" style="max-height:340px;overflow:auto">${DK.reflections(ps)}</div>`)}${DK.card("Leaderboard (lowest cost)", DK.leaderboard(ps, "Total cost", DK.money, true))}</div>`;
    const $ = (id) => el.querySelector("#" + id);
    const h1 = DK.hist(orders.map((o) => o.order), 10, 0, Math.max(400, ...orders.map((o) => o.order)) + 1);
    DK.chart($("c1"), { type: "bar", data: { labels: h1.labels.map((l) => l.split("–").map(Math.round).join("–")), datasets: [{ label: "Orders", data: h1.counts, backgroundColor: "#00533e" }] }, options: { plugins: { legend: { display: false } } } });
    const h2 = DK.hist(orders.map((o) => o.position_before), 10, 0, Math.max(450, ...orders.map((o) => o.position_before || 0)) + 1);
    DK.chart($("c2"), { type: "bar", data: { labels: h2.labels.map((l) => l.split("–").map(Math.round).join("–")), datasets: [{ label: "Orders", data: h2.counts, backgroundColor: "#3b6fb6" }] }, options: { plugins: { legend: { display: false } } } });
    DK.chart($("c3"), { type: "line", data: { labels: weeks.map((w) => "W" + w), datasets: [
      { label: "Class average", data: weeks.map((w) => DK.mean(played.map((p) => (p.ev("week").find((r) => r.week === w) || {}).on_hand))), borderColor: "#00533e", borderWidth: 3 },
      { label: "EOQ + safety stock policy", data: eoqRun.rows.map((r) => r.on_hand), borderColor: "#d08a00", borderDash: [5, 3] }] } });
    DK.chart($("c4"), { type: "scatter", data: { datasets: [{ label: "Students", backgroundColor: "#00533ecc", pointRadius: 6, data: fin.map((p) => ({ x: p.summary.avg_on_hand, y: p.summary.lost, n: p.nickname })) }] },
      options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (t) => `${t.raw.n}: avg stock ${t.raw.x}, lost ${t.raw.y}` } } },
        scales: { x: { title: { display: true, text: "Average units on hand" } }, y: { title: { display: true, text: "Lost sales (units)" } } } } });
  }
  function demo(session) {
    const P = { ...D0, ...session.params }, d = INV.demand(P), players = DK.fakePlayers(26), events = [];
    players.forEach((p, i) => {
      const Q = 100 + (i % 6) * 40, R = 150 + (i % 5) * 30; let st = INV.init(P); const rows = [];
      for (let w = 1; w <= P.weeks; w++) { const pos = INV.position(st), q = pos <= R ? Q : 0; const r = INV.step(P, st, q, w, d[w - 1]); st = r.state; rows.push({ ...r.row, position_before: pos });
        events.push({ player_id: p.id, round: w, kind: "week", data: rows[rows.length - 1] }); }
      if (p.finished_at) { p.summary = { score: rows.reduce((t, r) => t + r.cost.total, 0), lost: rows.reduce((t, r) => t + r.lost, 0), avg_on_hand: Math.round(rows.reduce((t, r) => t + r.on_hand, 0) / rows.length) };
        events.push({ player_id: p.id, round: 0, kind: "reflection", data: { text: ["Ordered the EOQ whenever stock fell near 200.", "Ordered big batches to avoid running out.", "Ordered small amounts every week."][i % 3] } }); }
    });
    return { players, events };
  }
  window.POM_GAMES.inventory = { key: "inventory", title: "Order Up! (EOQ & ROP)", codePrefix: "INV", defaults: D0,
    params: [{ key: "weeks", label: "Weeks", type: "number", min: 8, max: 52 }, { key: "sd", label: "Demand std. dev. (per week)", type: "number" }, { key: "lead", label: "Lead time (weeks)", type: "number", min: 1, max: 4 },
      { key: "S", label: "Ordering cost per order ($)", type: "number" }, { key: "h", label: "Holding cost per unit per week ($)", type: "number", step: 0.05 },
      { key: "stockout", label: "Cost per lost sale ($)", type: "number" }, { key: "quiz", label: "Warm-up calculations", type: "select", options: [["true", "Yes"], ["false", "No"]] }],
    render, demo };
})();
