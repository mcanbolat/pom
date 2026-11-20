// POM Games — helpers for instructor dashboard modules.
(function () {
  const charts = [];
  const DK = {
    esc: (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])),
    mean: (a) => { a = a.filter((x) => x != null && isFinite(x)); return a.length ? a.reduce((s, x) => s + x, 0) / a.length : null; },
    median: (a) => { a = a.filter((x) => x != null && isFinite(x)).sort((x, y) => x - y); return a.length ? (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : null; },
    f: (x, d) => x == null || !isFinite(x) ? "–" : Number(x).toFixed(d),
    pct: (x) => x == null || !isFinite(x) ? "–" : Math.round(x * 100) + "%",
    money: (x) => x == null || !isFinite(x) ? "–" : (x < 0 ? "−$" : "$") + Math.round(Math.abs(x)).toLocaleString("en-US"),
    COLORS: ["#00533e", "#d08a00", "#3b6fb6", "#b23a2b", "#7a5bb5", "#5d6762"],
    // players with their events grouped: p.ev(kind) → sorted data list
    prep(data) {
      const byP = {};
      data.players.forEach((p) => byP[p.id] = { ...p, events: [] });
      data.events.forEach((e) => { const p = byP[e.player_id]; if (p) p.events.push(e); });
      return Object.values(byP).map((p) => Object.assign(p, {
        ev(kind) { return this.events.filter((e) => e.kind === kind).sort((a, b) => a.round - b.round).map((e) => ({ round: e.round, ...e.data })); }
      }));
    },
    reset() { charts.splice(0).forEach((c) => c.destroy()); },
    chart(canvas, cfg) {
      cfg.options = Object.assign({ maintainAspectRatio: false, animation: false, plugins: { legend: { position: "bottom" } } }, cfg.options || {});
      const c = new Chart(canvas, cfg); charts.push(c); return c;
    },
    kpis: (arr) => `<div class="kpis">${arr.map(([k, v]) => `<div class="kpi"><div class="k">${k}</div><div class="v">${v}</div></div>`).join("")}</div>`,
    card: (title, inner, extra) => `<div class="card" ${extra || ""}><h3>${title}</h3>${inner}</div>`,
    canvas: (id, h) => `<div style="height:${h || 240}px"><canvas id="${id}"></canvas></div>`,
    table: (head, rows) => `<div class="scroll"><table><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</table></div>`,
    hist(values, bins, lo, hi) {
      const w = (hi - lo) / bins || 1, counts = Array(bins).fill(0);
      values.forEach((v) => { if (v == null || !isFinite(v)) return; counts[Math.max(0, Math.min(bins - 1, Math.floor((v - lo) / w)))]++; });
      return { labels: counts.map((_, i) => `${+(lo + i * w).toFixed(2)}–${+(lo + (i + 1) * w).toFixed(2)}`), counts };
    },
    leaderboard(players, label, fmt, lowerBetter) {
      const l = players.filter((p) => p.summary && p.summary.score != null && p.finished_at)
        .sort((a, b) => lowerBetter ? a.summary.score - b.summary.score : b.summary.score - a.summary.score).slice(0, 15);
      return DK.table(["Student", label], l.map((p, i) => [`${i + 1}. ${DK.esc(p.nickname)}`, fmt(p.summary.score)]));
    },
    reflections(players) {
      return players.filter((p) => p.ev("reflection").length).map((p) => `<p><b>${DK.esc(p.nickname)}</b>: ${DK.esc(p.ev("reflection")[0].text)}</p>`).join("") || `<p class="muted">No reflections yet.</p>`;
    },
    // demo helper: fake player list
    fakePlayers(n, finishedShare) {
      const names = ["Ava", "Ben", "Cara", "Dev", "Eli", "Fay", "Gus", "Hana", "Ivan", "Jade", "Kai", "Lia", "Milo", "Nora", "Omar", "Pia", "Quin", "Rosa", "Sam", "Tess", "Uri", "Vera", "Wes", "Xena", "Yuri", "Zoe"];
      return Array.from({ length: n }, (_, i) => ({ id: "p" + i, nickname: names[i % names.length] + (i >= names.length ? i : ""), student_ref: null, condition: null,
        joined_at: new Date().toISOString(), finished_at: i < n * (finishedShare || .9) ? new Date().toISOString() : null }));
    }
  };
  window.DK = DK;
})();
