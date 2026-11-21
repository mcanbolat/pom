// Instructor dashboard: Product Mix Puzzle
(function () {
  const D = LP.DEFAULTS, C = LP.CONS;
  function render(el, session, data) {
    DK.reset();
    const P = { ...D, ...session.params }, ps = DK.prep(data), o = LP.solve(P), cr = LP.corners();
    const allTries = ps.flatMap((p) => p.ev("try")), firsts = ps.map((p) => p.ev("try")[0]).filter(Boolean), gq = ps.map((p) => p.ev("graph")[0]).filter(Boolean);
    const bests = ps.map((p) => { const f = p.ev("try").filter((t) => t.feasible); return f.length ? Math.max(...f.map((t) => t.profit)) : null; }).filter((v) => v != null);
    const onlyJ = firsts.filter((t) => t.x === 0 && t.y > 0).length;
    el.innerHTML = DK.kpis([["Joined", ps.length], ["Finished", ps.filter((p) => p.finished_at).length], ["First guess feasible", DK.pct(firsts.length ? firsts.filter((t) => t.feasible).length / firsts.length : null)],
        ["Found the optimum by trying", DK.pct(bests.length ? bests.filter((b) => b >= o.z - 1e-6).length / bests.length : null)], ["First guess: jackets only", DK.pct(firsts.length ? onlyJ / firsts.length : null)], ["Optimum", DK.money(o.z)]]) +
      `<div class="grid2">${DK.card("Every plan students tried", DK.canvas("c1", 380) + `<p class="small muted">Gold = first tries, green = later feasible tries, red = infeasible tries. The star marks the optimum.</p>`)}
        <div>${DK.card("Best plan profit (after up to " + P.tries + " tries)", DK.canvas("c2", 200))}${DK.card("Graphical method & sensitivity: correct on the first try", DK.canvas("c3", 200))}</div></div>
       <div class="card"><h3>Debrief</h3><ol class="small" style="margin:0;padding-left:18px">
        <li><b>Formulation.</b> Max ${P.px}H + ${P.py}J subject to ${C.map((c) => `${c.name.toLowerCase()} ${c.a}H + ${c.b}J ≤ ${c.rhs}`).join("; ")}; H, J ≥ 0.</li>
        <li><b>Corner points.</b> ${cr.map((p) => `(${+p.x.toFixed(1)}, ${+p.y.toFixed(1)}) → ${DK.money(LP.profit(P, p.x, p.y))}`).join("; ")}. Optimum: ${o.x} hoodies and ${o.y} jackets = ${DK.money(o.z)}.</li>
        <li><b>Greedy intuition fails.</b> ${onlyJ} students' first guess was jackets only (the higher profit per unit). Jackets use a lot of finishing, the scarce resource. What matters is profit per unit of the <i>binding</i> resource, and combining products lets you use both scarce resources fully.</li>
        <li><b>Shadow prices.</b> Sewing $${LP.shadow(P, "sew")}/hour, finishing $${LP.shadow(P, "fin")}/hour, cutting $${LP.shadow(P, "cut")} (it has slack). Ask: would you pay a worker $25/hour overtime for sewing? For finishing?</li>
        <li><b>From the graph to Solver.</b> With more than two products the graph doesn't work, but Excel Solver finds the same corner. Its sensitivity report gives these shadow prices and the ranges where they hold.</li></ol></div>
       <div class="grid2">${DK.card("Reflections", `<div class="small" style="max-height:340px;overflow:auto">${DK.reflections(ps)}</div>`)}${DK.card("Leaderboard (best plan)", DK.leaderboard(ps, "Profit", DK.money))}</div>`;
    const $ = (id) => el.querySelector("#" + id), cols = ["#3b6fb6", "#d08a00", "#7a5bb5"];
    const later = allTries.filter((t) => t.n > 1);
    DK.chart($("c1"), { type: "scatter", data: { datasets: [
      { type: "line", label: "Feasible region", data: cr.concat([cr[0]]), backgroundColor: "#00533e18", borderColor: "#00533e55", fill: "shape", pointRadius: 0, borderWidth: 1 },
      ...C.map((c, i) => ({ type: "line", label: c.name, data: [{ x: 0, y: c.rhs / c.b }, { x: c.rhs / c.a, y: 0 }], borderColor: cols[i], pointRadius: 0, borderWidth: 1.5 })),
      { label: "Later tries (feasible)", data: later.filter((t) => t.feasible).map((t) => ({ x: t.x, y: t.y })), backgroundColor: "#00533e88", pointRadius: 4 },
      { label: "Infeasible tries", data: allTries.filter((t) => !t.feasible).map((t) => ({ x: t.x, y: t.y })), backgroundColor: "#b23a2b88", pointRadius: 4 },
      { label: "First tries", data: firsts.map((t) => ({ x: t.x, y: t.y })), backgroundColor: "#d08a00", pointRadius: 6 },
      { label: "Optimum", data: [{ x: o.x, y: o.y }], backgroundColor: "#18201d", pointStyle: "star", pointRadius: 12 }] },
      options: { scales: { x: { min: 0, max: 80, title: { display: true, text: "Hoodies" } }, y: { min: 0, max: 110, title: { display: true, text: "Jackets" } } } } });
    const h = DK.hist(bests, 8, Math.min(1500, ...bests), o.z + 1);
    DK.chart($("c2"), { type: "bar", data: { labels: h.labels.map((l) => l.split("–").map((v) => "$" + Math.round(v)).join("–")), datasets: [{ label: "Students", data: h.counts, backgroundColor: "#00533e" }] }, options: { plugins: { legend: { display: false } } } });
    DK.chart($("c3"), { type: "bar", data: { labels: ["Optimal hoodies", "Optimal jackets", "Max profit", "Shadow price (sewing)", "Slack (cutting)"], datasets: [{ label: "%", backgroundColor: "#00533e",
      data: ["x", "y", "z", "sp", "cut"].map((k) => gq.length ? gq.filter((q) => q[k + "_tries"] === 1 && q[k + "_ok"]).length / gq.length * 100 : null) }] },
      options: { indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { min: 0, max: 100 } } } });
  }
  function demo(session) {
    const P = { ...D, ...session.params }, o = LP.solve(P), players = DK.fakePlayers(28), events = [];
    const guesses = [[0, 50], [20, 30], [30, 30], [40, 20], [10, 45], [0, 60], [25, 35], [15, 45]];
    players.forEach((p, i) => {
      const n = 2 + (i % 4); const ts = [];
      for (let k = 0; k < n; k++) { const g = k === 0 ? guesses[i % guesses.length] : [Math.max(0, Math.round(o.x + (Math.random() - .5) * 20 / (k))), Math.max(0, Math.round(o.y + (Math.random() - .5) * 20 / k))];
        const c = LP.check(g[0], g[1]); ts.push({ n: k + 1, x: g[0], y: g[1], feasible: c.feasible, violated: c.violated, profit: LP.profit(P, g[0], g[1]) }); }
      ts.forEach((t) => events.push({ player_id: p.id, round: t.n, kind: "try", data: t }));
      events.push({ player_id: p.id, round: 0, kind: "graph", data: { x_tries: 1, x_ok: i % 5 > 0, y_tries: 1, y_ok: i % 5 > 0, z_tries: 1, z_ok: i % 5 > 0, sp_tries: i % 2 ? 1 : 2, sp_ok: i % 3 > 0, cut_tries: 1, cut_ok: i % 4 > 0 } });
      const f = ts.filter((t) => t.feasible);
      if (p.finished_at) { p.summary = { score: f.length ? Math.max(...f.map((t) => t.profit)) : 0, first: ts[0].feasible ? ts[0].profit : 0 };
        events.push({ player_id: p.id, round: 0, kind: "reflection", data: { text: ["Jackets earn more, so I made only jackets.", "I tried to use all the sewing hours.", "Split production about evenly."][i % 3] } }); }
    });
    return { players, events };
  }
  window.POM_GAMES.lp = { key: "lp", title: "Product Mix Puzzle", codePrefix: "MIX", defaults: D,
    params: [{ key: "tries", label: "Tries before the graph", type: "number", min: 1, max: 10 }, { key: "px", label: "Profit per hoodie ($)", type: "number" }, { key: "py", label: "Profit per jacket ($)", type: "number" },
      { key: "quiz", label: "Graphical method & shadow price questions", type: "select", options: [["true", "Yes"], ["false", "No"]] }],
    render, demo };
})();
