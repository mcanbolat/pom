// Instructor dashboard module for the Bakery Productivity Challenge.
// Registered into window.POM_GAMES; admin.html calls render(), demo(), csv().
(function () {
  const D = window.PROD.DEFAULTS;
  const COND = { labor: { label: "Paid on labor productivity", color: "#00533e", cls: "a" },
                 mfp:   { label: "Paid on multifactor productivity", color: "#d08a00", cls: "b" } };
  const charts = [];
  const mean = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
  const share = (a) => a.length ? a.filter(Boolean).length / a.length : null;
  const pct = (x) => x == null ? "–" : Math.round(x * 100) + "%";
  const f = (x, d) => x == null || !isFinite(x) ? "–" : Number(x).toFixed(d);
  const money = (x) => x == null ? "–" : (x < 0 ? "−$" : "$") + Math.round(Math.abs(x)).toLocaleString("en-US");
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function analyse(session, data) {
    const P = { ...D, ...(session.params || {}) };
    const byP = {};
    data.players.forEach(p => byP[p.id] = { ...p, weeks: [], reflection: "" });
    data.events.forEach(e => {
      const p = byP[e.player_id]; if (!p) return;
      if (e.kind === "week") p.weeks.push(e.data);
      if (e.kind === "reflection") p.reflection = (e.data || {}).text || "";
    });
    const players = Object.values(byP);
    players.forEach(p => { p.weeks.sort((a, b) => a.week - b.week); p.s = p.weeks.length ? window.PROD.summarize(P, p.weeks, p.condition) : null; });
    const conds = Object.keys(COND).filter(c => players.some(p => p.condition === c));
    return { P, players, conds, played: players.filter(p => p.weeks.length) };
  }

  function render(el, session, data) {
    charts.splice(0).forEach(c => c.destroy());
    const A = analyse(session, data), P = A.P;
    const fin = A.players.filter(p => p.finished_at).length;
    const weeks = Array.from({ length: P.weeks }, (_, i) => i + 1);
    const wk = (c, n, k) => mean(A.played.filter(p => p.condition === c).map(p => (p.weeks.find(w => w.week === n) || {})[k]).filter(v => v != null));
    const base = window.PROD.week(P, window.PROD.BASELINE, false, 1);

    el.innerHTML = `
      <div class="kpis">
        <div class="kpi"><div class="k">Joined</div><div class="v">${A.players.length}</div></div>
        <div class="kpi"><div class="k">Finished</div><div class="v">${fin}</div></div>
        ${A.conds.map(c => `<div class="kpi"><div class="k">${c === "labor" ? "LP group" : "MFP group"}</div><div class="v">${A.players.filter(p => p.condition === c).length}</div></div>`).join("")}
        <div class="kpi"><div class="k">Decisions logged</div><div class="v">${A.played.reduce((s, p) => s + p.weeks.length, 0)}</div></div>
      </div>
      <div class="grid2">
        <div class="card"><h3>Mean labor productivity by week</h3><div style="height:240px"><canvas id="cLP"></canvas></div></div>
        <div class="card"><h3>Mean multifactor productivity by week</h3><div style="height:240px"><canvas id="cMFP"></canvas></div></div>
      </div>
      <div class="grid2">
        <div class="card"><h3>Each student: average LP vs average MFP</h3><div style="height:280px"><canvas id="cSc"></canvas></div>
          <p class="small muted">Each dot is one student. The grey square is the bakery before the game started.</p></div>
        <div class="card"><h3>How the groups ran the bakery (averages over all weeks)</h3><div class="scroll"><table id="tDec"></table></div>
          <h3 style="margin-top:16px">Calculation check: share correct on the first try</h3><div style="height:170px"><canvas id="cQ"></canvas></div></div>
      </div>
      <div class="card"><h3>Debrief</h3><div class="small" id="debrief"></div></div>
      <div class="grid2">
        <div class="card"><h3>Reflections</h3><div id="refl" class="small" style="max-height:360px;overflow:auto"></div></div>
        <div class="card"><h3>Leaderboards</h3><div id="lbs" class="small"></div></div>
      </div>`;

    const $ = (id) => el.querySelector("#" + id);
    const line = (id, k, digits, baseVal) => charts.push(new Chart($(id), { type: "line",
      data: { labels: ["Before"].concat(weeks.map(w => "W" + w)),
        datasets: A.conds.map(c => ({ label: COND[c].label, data: [baseVal].concat(weeks.map(n => wk(c, n, k))), borderColor: COND[c].color, backgroundColor: COND[c].color, spanGaps: true }))},
      options: { maintainAspectRatio: false, animation: false, plugins: { legend: { position: "bottom" },
        tooltip: { callbacks: { label: (t) => `${t.dataset.label}: ${f(t.parsed.y, digits)}` } } } } }));
    line("cLP", "lp", 2, base.lp); line("cMFP", "mfp", 3, base.mfp);

    charts.push(new Chart($("cSc"), { type: "scatter",
      data: { datasets: A.conds.map(c => ({ label: COND[c].label, backgroundColor: COND[c].color + "cc", pointRadius: 6,
        data: A.played.filter(p => p.condition === c).map(p => ({ x: p.s.avg_lp, y: p.s.avg_mfp, n: p.nickname })) }))
        .concat([{ label: "Before the game", data: [{ x: base.lp, y: base.mfp, n: "Before" }], backgroundColor: "#888", pointStyle: "rect", pointRadius: 8 }]) },
      options: { maintainAspectRatio: false, animation: false, plugins: { legend: { position: "bottom" },
        tooltip: { callbacks: { label: (t) => `${t.raw.n}: LP ${f(t.raw.x, 2)}, MFP ${f(t.raw.y, 3)}` } } },
        scales: { x: { title: { display: true, text: "Avg labor productivity (revenue / labor $)" } }, y: { title: { display: true, text: "Avg MFP (revenue / input $)" } } } } }));

    const rowsOf = (c) => A.played.filter(p => p.condition === c).flatMap(p => p.weeks);
    const metrics = [
      ["Bakers", r => mean(r.map(w => w.bakers)), 1], ["Ovens", r => mean(r.map(w => w.ovens)), 2],
      ["Mixer used", r => share(r.map(w => w.mixer)), "%"], ["Robot used", r => share(r.map(w => w.robot)), "%"],
      ["Trained by last week", (r, c) => share(A.played.filter(p => p.condition === c).map(p => p.weeks.some(w => w.training))), "%"],
      ["Output (loaves)", r => mean(r.map(w => w.out)), 0], ["Labor productivity", r => mean(r.map(w => w.lp)), 2],
      ["Multifactor productivity", r => mean(r.map(w => w.mfp)), 3], ["Profit per week", r => mean(r.map(w => w.profit)), "$"]];
    $("tDec").innerHTML = `<tr><th></th><th>Before</th>${A.conds.map(c => `<th><span class="pill ${COND[c].cls}">${c === "labor" ? "LP group" : "MFP group"}</span></th>`).join("")}</tr>` +
      metrics.map(([lab, fn, d]) => {
        const bv = { "Bakers": 5, "Ovens": 1, "Mixer used": 0, "Robot used": 0, "Trained by last week": 0, "Output (loaves)": base.out,
                     "Labor productivity": base.lp, "Multifactor productivity": base.mfp, "Profit per week": base.profit }[lab];
        const fm = (v) => d === "%" ? pct(v) : d === "$" ? money(v) : f(v, d);
        return `<tr><td>${lab}</td><td class="muted">${fm(bv)}</td>${A.conds.map(c => `<td>${fm(fn(rowsOf(c), c))}</td>`).join("")}</tr>`;
      }).join("");

    const ft = (n, k) => { const r = A.played.map(p => p.weeks.find(w => w.week === n)).filter(w => w && w[k + "_tries"] > 0);
      return r.length ? r.filter(w => w[k + "_tries"] === 1 && w[k + "_ok"]).length / r.length * 100 : null; };
    charts.push(new Chart($("cQ"), { type: "bar",
      data: { labels: weeks.map(w => "W" + w), datasets: [
        { label: "Labor productivity", data: weeks.map(n => ft(n, "lp")), backgroundColor: "#00533e" },
        { label: "Multifactor productivity", data: weeks.map(n => ft(n, "mfp")), backgroundColor: "#d08a00" }] },
      options: { maintainAspectRatio: false, animation: false, plugins: { legend: { position: "bottom" } }, scales: { y: { min: 0, max: 100, ticks: { callback: v => v + "%" } } } } }));

    const g = (c, k) => mean(A.played.filter(p => p.condition === c).map(p => p.s[k]));
    const two = A.conds.length === 2;
    $("debrief").innerHTML = `<ol style="margin:0;padding-left:18px">
      <li><b>Productivity = output ÷ input, both in $.</b> Before the game: revenue = ${base.out.toLocaleString()} loaves × $${P.price.toFixed(2)} = $${base.revenue.toLocaleString()}. LP = $${base.revenue.toLocaleString()} ÷ $${base.labor.toLocaleString()} labor = ${f(base.lp, 2)}; MFP = $${base.revenue.toLocaleString()} ÷ $${base.total.toLocaleString()} total input = ${f(base.mfp, 3)}.</li>
      <li><b>MFP above 1.00 means profit.</b> When everything is in dollars, MFP &gt; 1 exactly when revenue exceeds the cost of all inputs. Labor productivity can be well above 1 while the bakery loses money.</li>
      ${two ? `<li><b>You get what you measure.</b> The LP group averaged LP ${f(g("labor", "avg_lp"), 2)} and MFP ${f(g("labor", "avg_mfp"), 3)}, with total profit of ${money(g("labor", "total_profit"))}. The MFP group averaged LP ${f(g("mfp", "avg_lp"), 2)} and MFP ${f(g("mfp", "avg_mfp"), 3)}, with total profit of ${money(g("mfp", "total_profit"))}. Ask: which manager would you hire?</li>` : ""}
      <li><b>Single-factor measures can mislead.</b> You can raise labor productivity by cutting bakers and leasing machines. Revenue per labor $ goes up, but capital and energy costs go up as well, so output per dollar of <i>all</i> inputs may fall.</li>
      <li><b>Scale and bottlenecks.</b> The robot only pays for itself at high volume, and that needs more ovens. When the ovens are the bottleneck, extra bakers add cost but no output (this links to Ch. 7).</li>
      <li><b>Investment timing.</b> Training lowers MFP in the week you pay for it and raises it in every week after that. Productivity growth = (new − old) ÷ old.</li>
      <li>Heizer's three productivity variables are <b>labor</b> (training), <b>capital</b> (ovens, mixer, robot) and <b>management</b> (how you combine them). Which one did each group lean on?</li></ol>`;

    $("refl").innerHTML = A.players.filter(p => p.reflection).map(p => `<p><span class="pill ${COND[p.condition] ? COND[p.condition].cls : ""}">${p.condition === "labor" ? "LP" : "MFP"}</span> <b>${esc(p.nickname)}</b>: ${esc(p.reflection)}</p>`).join("") || `<p class="muted">No reflections yet.</p>`;
    $("lbs").innerHTML = A.conds.map(c => {
      const l = A.players.filter(p => p.condition === c && p.s && p.finished_at).sort((a, b) => b.s.score - a.s.score).slice(0, 10);
      return `<p><span class="pill ${COND[c].cls}">${COND[c].label}</span></p><table><tr><th>#</th><th>Student</th><th>${c === "labor" ? "Avg LP" : "Avg MFP"}</th><th>Profit</th></tr>` +
        l.map((p, i) => `<tr><td>${i + 1}</td><td style="text-align:left">${esc(p.nickname)}</td><td>${f(p.s.score, c === "labor" ? 2 : 3)}</td><td>${money(p.s.total_profit)}</td></tr>`).join("") + `</table>`;
    }).join("");
  }

  // simulated class for demo mode
  function demo(session) {
    const P = { ...D, ...(session.params || {}) }; const SH = window.PROD.shocks(P);
    const players = [], events = []; let id = 0;
    for (let i = 0; i < 28; i++) {
      const cond = i % 2 ? "labor" : "mfp", pid = "p" + (++id);
      players.push({ id: pid, nickname: (cond === "labor" ? "Lena" : "Max") + i, student_ref: null, condition: cond,
        joined_at: new Date().toISOString(), finished_at: i < 24 ? new Date().toISOString() : null });
      let trained = false, b = 5, o = 1;
      for (let n = 1; n <= P.weeks; n++) {
        const skill = Math.random();
        if (cond === "labor") { b = Math.max(1, b - (Math.random() < .5 ? 1 : 0)); }
        else { b = Math.min(P.max_bakers, b + (Math.random() < .5 ? 1 : 0)); if (n > 2 && Math.random() < .4 && o < 3) o++; }
        const d = { bakers: b, ovens: o, mixer: n > 1 && Math.random() < (cond === "labor" ? .85 : .6), robot: n > 2 && Math.random() < (cond === "labor" ? .7 : .3),
                    training: !trained && n > 1 && Math.random() < .4 };
        const w = window.PROD.week(P, d, trained, SH[n]); trained = trained || d.training;
        const lt = skill < .2 + n * .07 ? 1 : 2, mt = skill < .05 + n * .08 ? 1 : 3;
        events.push({ player_id: pid, round: n, kind: "week", data: { week: n, ...w, lp_tries: lt, lp_ok: true, mfp_tries: mt, mfp_ok: mt < 3 } });
      }
      if (i < 24) events.push({ player_id: pid, round: 0, kind: "reflection", data: { text: cond === "labor"
        ? ["I cut bakers and leased the robot, so LP went way up but profit dropped.", "Fewer workers + machines = higher LP. MFP fell a bit."][i % 2 ? 0 : 1]
        : ["Added an oven and more bakers so fixed costs were spread over more loaves.", "Trained early; MFP dipped that week and then rose."][i % 4 ? 0 : 1] } });
    }
    return { players, events };
  }

  window.POM_GAMES = window.POM_GAMES || {};
  window.POM_GAMES.productivity = {
    key: "productivity", title: "Bakery Productivity Challenge", codePrefix: "BAKE", defaults: D,
    params: [
      { key: "weeks", label: "Weeks", type: "number", min: 3, max: 15 },
      { key: "assignment", label: "Bonus condition", type: "select", options: [["random", "Random: half LP, half MFP (recommended)"], ["labor", "Everyone paid on labor productivity"], ["mfp", "Everyone paid on multifactor productivity"]] },
      { key: "quiz", label: "Students calculate LP & MFP each week", type: "select", options: [["true", "Yes (3 tries each)"], ["false", "No, just show them"]] },
      { key: "price", label: "Price per loaf ($)", type: "number", step: 0.25 },
      { key: "wage", label: "Wage ($/hour)", type: "number" },
      { key: "noise", label: "Weekly efficiency variation (± share)", type: "number", step: 0.01, min: 0, max: 0.3 }
    ],
    render, demo
  };
})();
