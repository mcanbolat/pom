// Line Balancing Puzzle — model. Heizer Ch. 9 (cycle time, minimum stations, efficiency, idle time).
(function () {
  const TASKS = [
    { id: "A", name: "Mount frame on jig", t: 50, pre: [] },
    { id: "B", name: "Install deck", t: 40, pre: ["A"] },
    { id: "C", name: "Attach front fork", t: 30, pre: ["A"] },
    { id: "D", name: "Install battery", t: 45, pre: ["B"] },
    { id: "E", name: "Fit front wheel", t: 25, pre: ["C"] },
    { id: "F", name: "Route brake cables", t: 35, pre: ["C"] },
    { id: "G", name: "Install motor & controller", t: 55, pre: ["D", "E"] },
    { id: "H", name: "Fit handlebar", t: 20, pre: ["F"] },
    { id: "I", name: "Connect & test electronics", t: 40, pre: ["G", "H"] },
    { id: "J", name: "Final inspection & pack", t: 30, pre: ["I"] }
  ];
  const DEFAULTS = { minutes: 480, demands: [480, 400], quiz: true };
  const total = TASKS.reduce((s, t) => s + t.t, 0);
  const cycle = (P, k) => P.minutes * 60 / P.demands[k];                 // seconds per unit
  const minStations = (ct) => Math.ceil(total / ct - 1e-9);
  // check an assignment {A:1,...}
  function check(asg, ct) {
    const st = {}, issues = [];
    TASKS.forEach((t) => { const s = asg[t.id]; if (!s) { issues.push(`${t.id} is not assigned`); return; } st[s] = (st[s] || 0) + t.t;
      t.pre.forEach((p) => { if (asg[p] && asg[p] > s) issues.push(`${t.id} comes after ${p}, so it can't be at an earlier station`); }); });
    const used = Object.keys(st).map(Number).sort((a, b) => a - b), n = used.length;
    used.forEach((s) => { if (st[s] > ct + 1e-9) issues.push(`Station ${s} has ${st[s]} s of work, but the cycle time is ${+ct.toFixed(1)} s`); });
    const work = Object.values(st).reduce((a, b) => a + b, 0);          // only the tasks assigned so far
    const eff = n ? work / (n * ct) : 0;
    return { loads: st, stations: n, ok: !issues.length, issues, eff, idle: n * ct - work };
  }
  // fewest stations possible: exhaustive search over maximal, precedence-feasible station loads (memoized)
  function optimum(ct) {
    let best = 99; const seen = new Set();
    const go = (done, k) => {
      if (done.size === TASKS.length) { best = Math.min(best, k); return; }
      if (k + 1 >= best) return;
      const key = [...done].sort().join("") + "|" + k; if (seen.has(key)) return; seen.add(key);
      const outs = [];
      const ext = (load, dn, n) => { let any = false;
        for (const t of TASKS) { if (dn.has(t.id) || !t.pre.every((p) => dn.has(p)) || load + t.t > ct + 1e-9) continue; any = true; dn.add(t.id); ext(load + t.t, dn, n + 1); dn.delete(t.id); }
        if (!any && n) outs.push(new Set(dn)); };
      ext(0, new Set(done), 0); outs.forEach((o) => go(o, k + 1));
    };
    go(new Set(), 0); return best;
  }
  window.LINE = { TASKS, DEFAULTS, total, cycle, minStations, check, optimum };
})();
