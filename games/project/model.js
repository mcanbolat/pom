// Crash the Project — model. Heizer Ch. 3 (CPM, slack, crashing).
(function () {
  const ACTS = [
    { id: "A", name: "Define requirements", t: 3, min: 2, c: 800, pre: [] },
    { id: "B", name: "Order servers", t: 5, min: 3, c: 1200, pre: [] },
    { id: "C", name: "Design the user interface", t: 4, min: 2, c: 600, pre: ["A"] },
    { id: "D", name: "Build the back end", t: 6, min: 4, c: 1500, pre: ["A"] },
    { id: "E", name: "Install servers", t: 3, min: 2, c: 900, pre: ["B"] },
    { id: "F", name: "Build the front end", t: 5, min: 3, c: 700, pre: ["C"] },
    { id: "G", name: "Integrate everything", t: 4, min: 3, c: 2000, pre: ["D", "E", "F"] },
    { id: "H", name: "Test", t: 3, min: 2, c: 1100, pre: ["G"] },
    { id: "I", name: "Write training guides", t: 2, min: 1, c: 400, pre: ["C"] },
    { id: "J", name: "Launch", t: 1, min: 1, c: 0, pre: ["H", "I"] }
  ];
  const DEFAULTS = { deadline: 16, indirect: 1800, penalty: 5000, quiz: true };

  // CPM forward/backward pass with crash weeks x = {A:1,...}
  function cpm(x) {
    const d = {}, es = {}, ef = {}, ls = {}, lf = {}, slack = {};
    ACTS.forEach((a) => { d[a.id] = a.t - ((x && x[a.id]) || 0); es[a.id] = Math.max(0, ...a.pre.map((p) => ef[p])); ef[a.id] = es[a.id] + d[a.id]; });
    const T = Math.max(...ACTS.map((a) => ef[a.id]));
    [...ACTS].reverse().forEach((a) => { const succ = ACTS.filter((b) => b.pre.includes(a.id)); lf[a.id] = succ.length ? Math.min(...succ.map((b) => ls[b.id])) : T; ls[a.id] = lf[a.id] - d[a.id]; slack[a.id] = ls[a.id] - es[a.id]; });
    return { T, d, es, ef, ls, lf, slack, critical: ACTS.filter((a) => slack[a.id] === 0).map((a) => a.id) };
  }
  function paths() {
    const out = [], walk = (id, acc) => { const succ = ACTS.filter((b) => b.pre.includes(id)); if (!succ.length) out.push(acc); succ.forEach((s) => walk(s.id, acc.concat(s.id))); };
    ACTS.filter((a) => !a.pre.length).forEach((a) => walk(a.id, [a.id])); return out;
  }
  function cost(P, x) {
    const r = cpm(x), crash = ACTS.reduce((s, a) => s + ((x && x[a.id]) || 0) * a.c, 0);
    const indirect = r.T * P.indirect, penalty = Math.max(0, r.T - P.deadline) * P.penalty;
    return { T: r.T, crash, indirect, penalty, total: crash + indirect + penalty, cpm: r };
  }
  function optimum(P) {
    let best = null; const ids = ACTS.filter((a) => a.t > a.min);
    const rec = (k, x) => {
      if (k === ids.length) { const c = cost(P, x); if (!best || c.total < best.total || (c.total === best.total && c.crash < best.crash)) best = { ...c, x: { ...x } }; return; }
      const a = ids[k]; for (let w = 0; w <= a.t - a.min; w++) { x[a.id] = w; rec(k + 1, x); } delete x[a.id];
    };
    rec(0, {}); return best;
  }
  // crash weeks spent on activities that still have slack after the plan (wasted money)
  function wasted(x) { const r = cpm(x); return ACTS.reduce((s, a) => s + ((x[a.id] || 0) && r.slack[a.id] > 0 ? x[a.id] * a.c : 0), 0); }
  window.PROJ = { ACTS, DEFAULTS, cpm, paths, cost, optimum, wasted };
})();
