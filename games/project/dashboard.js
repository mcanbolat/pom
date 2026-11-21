// Instructor dashboard: Crash the Project
(function () {
  const D = PROJ.DEFAULTS, A = PROJ.ACTS.filter((a) => a.t > a.min);
  function render(el, session, data) {
    DK.reset();
    const P = { ...D, ...session.params }, ps = DK.prep(data), plans = ps.map((p) => p.ev("plan")[0]).filter(Boolean), qs = ps.map((p) => p.ev("cpm")[0]).filter(Boolean);
    const o = PROJ.optimum(P), normal = PROJ.cost(P, {}), crit = PROJ.cpm({}).critical.join("");
    el.innerHTML = DK.kpis([["Joined", ps.length], ["Plans submitted", plans.length], ["Found the optimum", DK.pct(plans.length ? plans.filter((p) => p.total <= o.total).length / plans.length : null)],
        ["Median cost", DK.money(DK.median(plans.map((p) => p.total)))], ["Optimum", DK.money(o.total) + " · " + o.T + " wks"], ["Critical path right", DK.pct(qs.length ? qs.filter((q) => q.critical_ok).length / qs.length : null)]]) +
      `<div class="grid2">${DK.card("Total cost of each plan", DK.canvas("c1", 250))}${DK.card("Project duration chosen", DK.canvas("c2", 250))}</div>
       <div class="grid2">${DK.card("Average weeks crashed per activity (vs. the optimal plan)", DK.canvas("c3", 250) + `<p class="small muted">Crash cost per week: ${A.map((a) => `${a.id} $${a.c}`).join(", ")}</p>`)}
         ${DK.card("Common mistakes", DK.canvas("c4", 250))}</div>
       <div class="card"><h3>Debrief</h3><ol class="small" style="margin:0;padding-left:18px">
        <li><b>Critical path.</b> Without crashing it is ${crit.split("").join("–")} (${normal.T} weeks), and the total cost is ${DK.money(normal.total)}, including a ${DK.money(normal.penalty)} late penalty. ${DK.pct(qs.length ? qs.filter((q) => q.critical_ok).length / qs.length : null)} of students identified it correctly.</li>
        <li><b>The crashing rule.</b> Crash the cheapest critical activity, one week at a time. Keep going while the cost per week is below the weekly savings: $${P.indirect.toLocaleString()} indirect, plus $${P.penalty.toLocaleString()} penalty while you are late. The optimum (${DK.money(o.total)}, ${o.T} weeks) crashes ${Object.entries(o.x).filter(([, w]) => w).map(([id, w]) => `${id}×${w}`).join(", ")}.</li>
        <li><b>Beat the deadline?</b> The optimum finishes in ${o.T} weeks. Going faster than the deadline still pays as long as crashing is cheaper than the indirect cost it saves.</li>
        <li><b>New critical paths.</b> As you crash, other paths become critical. After that, saving a week means shortening every critical path at once, so the cost of each extra week goes up quickly.</li>
        <li><b>Wasted money.</b> Crashing an activity that has slack shortens nothing. On average students spent <b>${DK.money(DK.mean(plans.map((p) => p.wasted)))}</b> this way.</li></ol></div>
       <div class="grid2">${DK.card("Reflections", `<div class="small" style="max-height:340px;overflow:auto">${DK.reflections(ps)}</div>`)}${DK.card("Leaderboard (lowest cost)", DK.leaderboard(ps, "Total cost", DK.money, true))}</div>`;
    const $ = (id) => el.querySelector("#" + id);
    const vals = plans.map((p) => p.total), lo = Math.floor(Math.min(o.total, ...vals) / 2000) * 2000, hi = Math.max(normal.total, ...vals) + 1;
    const h = DK.hist(vals, 10, lo, hi);
    DK.chart($("c1"), { type: "bar", data: { labels: h.labels.map((l) => l.split("–").map((v) => "$" + Math.round(v / 1000) + "k").join("–")), datasets: [{ label: "Students", data: h.counts, backgroundColor: "#00533e" }] },
      options: { plugins: { legend: { display: false }, subtitle: { display: true, text: `Optimum ${DK.money(o.total)} · No crashing ${DK.money(normal.total)}` } } } });
    const wk = Array.from({ length: normal.T - 8 }, (_, i) => i + 9);
    DK.chart($("c2"), { type: "bar", data: { labels: wk.map((w) => w + (w === P.deadline ? " (deadline)" : w === o.T ? " (optimum)" : "")), datasets: [{ label: "Students", data: wk.map((w) => plans.filter((p) => p.weeks === w).length), backgroundColor: wk.map((w) => w === o.T ? "#d08a00" : "#3b6fb6") }] },
      options: { plugins: { legend: { display: false } } } });
    DK.chart($("c3"), { type: "bar", data: { labels: A.map((a) => a.id), datasets: [
      { label: "Class average", data: A.map((a) => DK.mean(plans.map((p) => p.x[a.id] || 0))), backgroundColor: "#00533e" },
      { label: "Optimal plan", data: A.map((a) => o.x[a.id] || 0), backgroundColor: "#d08a00" }] } });
    const m = [["Crashed a non-critical activity", plans.filter((p) => p.wasted > 0).length], ["Stopped while still late", plans.filter((p) => p.weeks > P.deadline).length],
      ["Crashed too far (cost went up)", plans.filter((p) => p.weeks < o.T).length], ["Found the optimum", plans.filter((p) => p.total <= o.total).length]];
    DK.chart($("c4"), { type: "bar", data: { labels: m.map((r) => r[0]), datasets: [{ label: "Students", data: m.map((r) => r[1]), backgroundColor: ["#b23a2b", "#d08a00", "#3b6fb6", "#00533e"] }] },
      options: { indexAxis: "y", plugins: { legend: { display: false } } } });
  }
  function demo(session) {
    const P = { ...D, ...session.params }, o = PROJ.optimum(P), players = DK.fakePlayers(27), events = [];
    players.forEach((p, i) => {
      const x = { ...o.x };
      if (i % 4 === 1) x.B = 1; if (i % 5 === 2) delete x.H; if (i % 6 === 3) x.G = 1; if (i % 7 === 4) { x.D = 1; x.E = 1; } if (i % 3 === 2) x.A = 0;
      const c = PROJ.cost(P, x);
      events.push({ player_id: p.id, round: 1, kind: "plan", data: { x, weeks: c.T, crash: c.crash, total: c.total, opt_total: o.total, wasted: PROJ.wasted(x), clicks: 10 + i } });
      events.push({ player_id: p.id, round: 0, kind: "cpm", data: { critical_ok: i % 4 !== 0, T_ok: true, T_tries: 1 } });
      if (p.finished_at) { p.summary = { score: c.total, weeks: c.T };
        events.push({ player_id: p.id, round: 0, kind: "reflection", data: { text: ["Crashed the cheapest critical activity first.", "I crashed until I hit the deadline.", "I crashed B because it was long, but it had slack."][i % 3] } }); }
    });
    return { players, events };
  }
  window.POM_GAMES.project = { key: "project", title: "Crash the Project", codePrefix: "PROJ", defaults: D,
    params: [{ key: "deadline", label: "Deadline (weeks)", type: "number", min: 10, max: 20 },
      { key: "indirect", label: "Indirect cost per week ($)", type: "number" }, { key: "penalty", label: "Late penalty per week ($)", type: "number" },
      { key: "quiz", label: "Students find the critical path first", type: "select", options: [["true", "Yes"], ["false", "No"]] }],
    render, demo };
})();
