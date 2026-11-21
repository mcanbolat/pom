// Instructor dashboard: Find the Bottleneck
(function () {
  const D = CAP.DEFAULTS, S = CAP.STATIONS, COL = ["#00533e", "#d08a00", "#b23a2b", "#3b6fb6", "#7a5bb5"];
  function render(el, session, data) {
    DK.reset();
    const P = { ...D, ...session.params }, ps = DK.prep(data), played = ps.filter((p) => p.ev("month").length), toc = CAP.tocPlan(P);
    const months = Array.from({ length: P.months }, (_, i) => i + 1), fin = ps.filter((p) => p.summary && p.finished_at);
    const at = (m, f) => DK.mean(played.map((p) => { const r = p.ev("month").find((x) => x.month === m); return r ? f(r) : null; }));
    const tocTotal = toc.reduce((t, r) => t + r.profit, 0), qz = ps.map((p) => p.ev("quiz")[0]).filter(Boolean);
    const allRows = played.flatMap((p) => p.ev("month")), totalSpend = allRows.reduce((t, r) => t + r.spend, 0), totalWaste = allRows.reduce((t, r) => t + r.wasted, 0);
    el.innerHTML = DK.kpis([["Joined", ps.length], ["Finished", fin.length], ["Median profit", DK.money(DK.median(fin.map((p) => p.summary.score)))], ["Bottleneck strategy", DK.money(tocTotal)],
        ["Share of spending wasted", DK.pct(totalSpend ? totalWaste / totalSpend : null)], ["Found the bottleneck", DK.pct(qz.length ? qz.filter((q) => q.bn_ok).length / qz.length : null)]]) +
      `<div class="grid2">${DK.card("Average capacity vs. demand by month", DK.canvas("c1", 250))}${DK.card("Where the class invested (units bought, all months)", DK.canvas("c2", 250))}</div>
       <div class="grid2">${DK.card("Each student: total profit vs. wasted investment", DK.canvas("c3", 260))}${DK.card("Warm-up: correct on the first try", DK.canvas("c4", 200))}</div>
       <div class="card"><h3>Debrief</h3><ol class="small" style="margin:0;padding-left:18px">
        <li><b>Capacity of a step = 60 ÷ minutes × parallel units.</b> At the start: ${S.map((s) => `${s.name.toLowerCase()} ${CAP.cap(s, s.n)}/hr`).join(", ")}. The process can only go as fast as its slowest step: ${CAP.analyse(CAP.base()).C}/hr (delivery).</li>
        <li><b>Bottleneck time vs. throughput time.</b> Bottleneck time (${CAP.analyse(CAP.base()).bottleneck_time.toFixed(2)} min) sets how often a pizza comes out. Throughput time (${CAP.analyse(CAP.base()).throughput_time} min) is how long one pizza takes from start to finish.</li>
        <li><b>The bottleneck moves.</b> The theory-of-constraints plan bought ${toc.map((r) => Object.keys(r.buy).map((k) => S.find((s) => s.id === k).name.toLowerCase()).join(" + ") || "nothing").join(" → ")}, and earned ${DK.money(tocTotal)}.</li>
        <li><b>Wasted capacity.</b> ${DK.pct(totalSpend ? totalWaste / totalSpend : null)} of the class's spending did not raise output when it was made: it was at a step that wasn't the bottleneck, or it added capacity beyond demand.</li>
        <li><b>Utilization = actual output ÷ capacity.</b> Only the bottleneck runs near 100%. A step that isn't the bottleneck will always have idle time, and that's expected.</li></ol></div>
       <div class="grid2">${DK.card("Reflections", `<div class="small" style="max-height:340px;overflow:auto">${DK.reflections(ps)}</div>`)}${DK.card("Leaderboard (profit)", DK.leaderboard(ps, "Profit", DK.money))}</div>`;
    const $ = (id) => el.querySelector("#" + id);
    DK.chart($("c1"), { type: "line", data: { labels: months.map((m) => "M" + m), datasets: [
      { label: "Class average capacity", data: months.map((m) => at(m, (r) => r.capacity)), borderColor: "#00533e", borderWidth: 3 },
      { label: "Demand", data: months.map((m) => CAP.demandAt(P, m)), borderColor: "#b23a2b", borderDash: [6, 4] },
      { label: "Bottleneck strategy", data: toc.map((r) => r.capacity), borderColor: "#d08a00", borderDash: [2, 2] }] } });
    DK.chart($("c2"), { type: "bar", data: { labels: S.map((s) => s.name), datasets: [{ label: "Units bought", backgroundColor: COL,
      data: S.map((s) => allRows.reduce((t, r) => t + (r.buy[s.id] || 0), 0)) }] }, options: { plugins: { legend: { display: false } } } });
    DK.chart($("c3"), { type: "scatter", data: { datasets: [{ label: "Students", backgroundColor: "#00533ecc", pointRadius: 6,
      data: fin.map((p) => ({ x: p.summary.wasted, y: p.summary.score, n: p.nickname })) }] },
      options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (t) => `${t.raw.n}: ${DK.money(t.raw.y)}, wasted ${DK.money(t.raw.x)}` } } },
        scales: { x: { title: { display: true, text: "Wasted investment ($)" } }, y: { title: { display: true, text: "Total profit ($)" } } } } });
    DK.chart($("c4"), { type: "bar", data: { labels: ["Bottleneck step", "Process capacity", "Bottleneck time", "Throughput time"], datasets: [{ label: "%", backgroundColor: "#00533e",
      data: [qz.length ? qz.filter((q) => q.bn_ok).length / qz.length * 100 : null, ...["cap", "bt", "tt"].map((k) => qz.length ? qz.filter((q) => q[k + "_tries"] === 1 && q[k + "_ok"]).length / qz.length * 100 : null)] }] },
      options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { min: 0, max: 100 } } } });
  }
  function demo(session) {
    const P = { ...D, ...session.params }, players = DK.fakePlayers(26), events = [];
    players.forEach((p, i) => {
      let sv = CAP.base(), cash = 0; const rows = [];
      for (let m = 1; m <= P.months; m++) {
        cash += P.budget; const buy = {}; let tmp = { ...sv };
        for (let k = 0; k < 3; k++) {
          const a = CAP.analyse(tmp); let s = S.find((x) => x.id === a.bottleneck);
          if (Math.random() < .15 + (i % 4) * .12) s = S[Math.floor(Math.random() * S.length)];
          if (s.cost > cash || (a.C >= CAP.demandAt(P, m) && Math.random() < .7)) break;
          buy[s.id] = (buy[s.id] || 0) + 1; tmp[s.id]++; cash -= s.cost;
        }
        const r = CAP.month(P, sv, buy, m); sv = r.servers; rows.push(r);
        events.push({ player_id: p.id, round: m, kind: "month", data: r });
      }
      events.push({ player_id: p.id, round: 0, kind: "quiz", data: { bn_ok: i % 5 > 0, cap_tries: 1, cap_ok: i % 4 > 0, bt_tries: i % 2 ? 1 : 2, bt_ok: true, tt_tries: 1, tt_ok: i % 3 > 0 } });
      if (p.finished_at) { p.summary = { score: rows.reduce((t, r) => t + r.profit, 0), wasted: rows.reduce((t, r) => t + r.wasted, 0) };
        events.push({ player_id: p.id, round: 0, kind: "reflection", data: { text: ["Always bought at the slowest step.", "Bought ovens because baking takes longest.", "Added capacity ahead of the demand jump."][i % 3] } }); }
    });
    return { players, events };
  }
  window.POM_GAMES.capacity = { key: "capacity", title: "Find the Bottleneck", codePrefix: "CAP", defaults: D,
    params: [{ key: "months", label: "Months", type: "number", min: 3, max: 12 }, { key: "budget", label: "New cash per month ($)", type: "number" },
      { key: "demand1", label: "Demand at start (pizzas/hr)", type: "number" }, { key: "demand2", label: "Demand after growth (pizzas/hr)", type: "number" },
      { key: "grow_at", label: "Demand grows in month", type: "number", min: 1 }, { key: "quiz", label: "Warm-up analysis", type: "select", options: [["true", "Yes"], ["false", "No"]] }],
    render, demo };
})();
