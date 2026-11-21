// Find the Bottleneck — model. Heizer Ch. 7 & S7 (capacity, utilization, bottleneck & throughput time, TOC).
(function () {
  const STATIONS = [
    { id: "dough", name: "Make dough", min: 4, n: 1, cost: 6000, unit: "worker" },
    { id: "top", name: "Add toppings", min: 3, n: 1, cost: 4000, unit: "worker" },
    { id: "oven", name: "Bake", min: 12, n: 2, cost: 9000, unit: "oven" },
    { id: "box", name: "Cut & box", min: 2, n: 1, cost: 3000, unit: "worker" },
    { id: "deliv", name: "Deliver", min: 20, n: 3, cost: 5000, unit: "driver" }
  ];
  const DEFAULTS = { months: 6, hours: 300, margin: 8, budget: 8000, demand1: 14, demand2: 20, grow_at: 4, quiz: true };
  const cap = (s, n) => 60 / s.min * n;                       // pizzas per hour
  function analyse(servers) {
    const caps = STATIONS.map((s) => cap(s, servers[s.id]));
    const C = Math.min(...caps), b = caps.indexOf(C);
    return { caps, C, bottleneck: STATIONS[b].id, bottleneck_time: STATIONS[b].min / servers[STATIONS[b].id], throughput_time: STATIONS.reduce((t, s) => t + s.min, 0) };
  }
  const base = () => Object.fromEntries(STATIONS.map((s) => [s.id, s.n]));
  const demandAt = (P, m) => m >= P.grow_at ? P.demand2 : P.demand1;
  // one month: buy = {id: count}
  function month(P, servers, buy, m) {
    const before = analyse(servers), next = { ...servers }; let spend = 0;
    STATIONS.forEach((s) => { const k = buy[s.id] || 0; next[s.id] += k; spend += k * s.cost; });
    const a = analyse(next), d = demandAt(P, m), out = Math.min(a.C, d);
    // money that did not raise capacity this month (bought at a non-bottleneck, or beyond demand)
    // wasted = money at a step that was not (tied for) the bottleneck, or any spending when capacity already met demand
    const wasted = STATIONS.reduce((w, s, i) => w + ((buy[s.id] || 0) && (before.caps[i] > before.C + 1e-9 || before.C >= d) ? buy[s.id] * s.cost : 0), 0);
    return { month: m, servers: next, buy: { ...buy }, spend, capacity: a.C, demand: d, output: out, lost: Math.max(0, d - a.C), bottleneck: a.bottleneck,
      util: STATIONS.map((s, i) => +(out / a.caps[i]).toFixed(3)), caps: a.caps.map((c) => +c.toFixed(2)),
      revenue: out * P.hours * P.margin, profit: out * P.hours * P.margin - spend, wasted };
  }
  // theory-of-constraints benchmark: keep buying at the bottleneck while output is below demand and cash allows
  function tocPlan(P) {
    let sv = base(), cash = 0; const rows = [];
    for (let m = 1; m <= P.months; m++) {
      cash += P.budget; const buy = {}; let tmp = { ...sv };
      for (let k = 0; k < 10; k++) {
        const a = analyse(tmp), d = demandAt(P, m); if (a.C >= d) break;
        const s = STATIONS.find((x) => x.id === a.bottleneck); if (s.cost > cash) break;
        buy[s.id] = (buy[s.id] || 0) + 1; tmp[s.id]++; cash -= s.cost;
      }
      const r = month(P, sv, buy, m); sv = r.servers; rows.push(r);
    }
    return rows;
  }
  window.CAP = { STATIONS, DEFAULTS, cap, analyse, base, month, tocPlan, demandAt };
})();
