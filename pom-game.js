// POM Games — shared student-page shell.
// A game page loads pom.js + this file, then calls POMGame.start({...}).
// The shell draws the top bar, demo banner, join form, resume logic, and the final
// results + leaderboard screen. The game only supplies run(ctx) and a summary.
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => POM.esc(s);

  function shellHtml(o) {
    return `
    <div class="topbar"><a class="brand" href="../../">POM Games <small>${esc(o.chapter)} · ${esc(o.topic || "")}</small></a><span class="who" id="who"></span></div>
    <div class="wrap">
      <div id="demoBanner" class="demo hidden">Demo mode: nothing is saved. <a href="#" id="demoReset">Start over</a></div>
      <section id="gJoin" class="card hidden" style="max-width:480px;margin:30px auto">
        <h2>${o.icon || "🎮"} ${esc(o.title)}</h2>
        <p class="muted small">${o.tagline || ""}</p>
        <label for="gCode">Session code</label><input id="gCode" autocomplete="off" style="text-transform:uppercase">
        <label for="gNick">Nickname (shown on the leaderboard)</label><input id="gNick" maxlength="40" autocomplete="off">
        <label for="gRef">Student ID or name (optional, only your instructor sees this)</label><input id="gRef" maxlength="60" autocomplete="off">
        <button id="gBtnJoin" class="full" style="margin-top:14px">Join</button>
        <div class="err" id="gJoinErr"></div>
      </section>
      <section id="gMain" class="hidden"></section>
      <section id="gDone" class="hidden">
        <div class="card"><h2>Your results</h2><div id="gResults"></div></div>
        <div class="card"><h3 id="gLbTitle">Leaderboard</h3><div class="scroll"><table id="gLb"></table></div>
          <button class="ghost sm" id="gBtnLb" style="margin-top:10px">Refresh</button></div>
      </section>
    </div>`;
  }

  const POMGame = {
    start(o) {
      this.o = o;
      POM.setup({ game: o.game, defaults: o.defaults, bots: o.bots });
      document.getElementById("app").innerHTML = shellHtml(o);
      $("gBtnJoin").onclick = () => this.join();
      $("gNick").addEventListener("keydown", (e) => { if (e.key === "Enter") this.join(); });
      $("gBtnLb").onclick = () => this.leaderboard();
      $("demoReset").onclick = (e) => { e.preventDefault(); POM.forget(); location.reload(); };
      this.init();
    },
    async init() {
      if (POM.DEMO) $("demoBanner").classList.remove("hidden");
      $("gCode").value = POM.urlCode() || (POM.DEMO ? "DEMO" : "");
      const st = await POM.resume();
      if (st && (!POM.urlCode() || st.session.code === POM.urlCode())) this.load(st);
      else { this.show("gJoin"); (POM.urlCode() ? $("gNick") : $("gCode")).focus(); }
    },
    show(id) { ["gJoin", "gMain", "gDone"].forEach((s) => $(s).classList.toggle("hidden", s !== id)); window.scrollTo(0, 0); },
    async join() {
      $("gJoinErr").textContent = ""; $("gBtnJoin").disabled = true;
      try { this.load(await POM.join($("gCode").value.trim(), $("gNick").value.trim(), $("gRef").value.trim())); }
      catch (e) { $("gJoinErr").textContent = e.message; }
      finally { $("gBtnJoin").disabled = false; }
    },
    load(st) {
      const o = this.o, P = { ...o.defaults, ...(st.session.params || {}) };
      $("who").textContent = st.nickname + " · " + st.session.code;
      const ctx = this.ctx = {
        S: st, P, rng: POM.rng(P.seed || 12345), el: $("gMain"),
        events: st.events || [],
        ev(kind) { return this.events.filter((e) => e.kind === kind).sort((a, b) => a.round - b.round).map((e) => e.data); },
        async log(round, kind, data) {
          await POM.log(st, round, kind, data);
          const i = this.events.findIndex((e) => e.round === round && e.kind === kind);
          const e = { round, kind, data }; if (i >= 0) this.events[i] = e; else this.events.push(e);
        },
        finish: async (summary) => { await POM.finish(st, summary); st.finished = true; st.summary = summary; this.done(); },
        show: () => this.show("gMain")
      };
      if (st.finished) return this.done();
      this.show("gMain"); o.run(ctx);
    },
    async done() {
      const o = this.o, ctx = this.ctx, s = ctx.S.summary || {};
      $("gResults").innerHTML = o.results ? o.results(s, ctx) : "";
      $("gLbTitle").textContent = o.board && o.board.title || "Leaderboard";
      this.show("gDone"); await this.leaderboard();
      if (o.afterDone) o.afterDone(s, ctx);
    },
    async leaderboard() {
      const o = this.o, b = o.board || {}, ctx = this.ctx;
      try {
        let all = ((await POM.leaderboard(ctx.S.session.code)) || []).filter((x) => x.summary && x.summary.score != null);
        if (b.sameCondition) all = all.filter((x) => x.condition === ctx.S.condition);
        all.sort((a, c) => b.lowerBetter ? a.summary.score - c.summary.score : c.summary.score - a.summary.score);
        const cols = b.cols || [];
        $("gLb").innerHTML = `<tr><th>#</th><th>Player</th><th>${esc(b.label || "Score")}</th>${cols.map((c) => `<th>${esc(c[0])}</th>`).join("")}</tr>` +
          all.slice(0, 30).map((x, i) => `<tr class="${x.nickname === ctx.S.nickname ? "hl" : ""}"><td>${i + 1}</td><td style="text-align:left">${esc(x.nickname)}</td>` +
            `<td>${b.fmt ? b.fmt(x.summary.score) : x.summary.score}</td>${cols.map((c) => `<td>${c[1](x.summary)}</td>`).join("")}</tr>`).join("");
      } catch (e) { $("gLb").innerHTML = `<tr><td class="err">${esc(e.message)}</td></tr>`; }
    }
  };
  window.POMGame = POMGame;

  // small UI helpers shared by games
  window.UI = {
    kpis: (arr) => `<div class="kpis">${arr.map(([k, v]) => `<div class="kpi"><div class="k">${k}</div><div class="v">${v}</div></div>`).join("")}</div>`,
    table: (head, rows, cls) => `<table class="${cls || ""}"><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</table>`,
    // a numeric answer box with N tries; calls back with {tries, ok, answers}
    quiz(el, items, onDone) {
      // items: [{key, label, truth, dec, tol}]
      const st = {}; items.forEach((it) => st[it.key] = { tries: 0, ok: false, answers: [] });
      el.innerHTML = `<div class="quizgrid">${items.map((it) => `<div class="qbox" id="q_${it.key}"><label>${it.label}</label><input id="a_${it.key}" inputmode="decimal" autocomplete="off"><div class="small" id="f_${it.key}"></div></div>`).join("")}</div>
        <button id="q_check" style="margin-top:10px">Check</button>`;
      const close = (a, t, dec, tol) => { const x = parseFloat(String(a).replace(/[$,\s%]/g, "")); return isFinite(x) && Math.abs(x - t) <= Math.max(Math.abs(t) * (tol == null ? 0.01 : tol), 0.5 * Math.pow(10, -dec) + 1e-9); };
      const done = () => items.every((it) => st[it.key].ok || st[it.key].tries >= 3);
      const paint = () => items.forEach((it) => {
        const s = st[it.key], box = el.querySelector("#q_" + it.key), inp = el.querySelector("#a_" + it.key), f = el.querySelector("#f_" + it.key);
        if (s.ok) { box.className = "qbox good"; inp.disabled = true; f.innerHTML = `<span class="ok">✔ Correct${s.tries === 1 ? " on the first try" : ""}.</span>`; }
        else if (s.tries >= 3) { box.className = "qbox shown"; inp.disabled = true; inp.value = Number(it.truth).toFixed(it.dec); f.textContent = "Out of tries. The answer is shown."; }
        else if (s.tries) f.textContent = `Not quite. ${3 - s.tries} ${3 - s.tries === 1 ? "try" : "tries"} left.`;
      });
      const btn = el.querySelector("#q_check");
      btn.onclick = () => {
        items.forEach((it) => { const s = st[it.key]; if (s.ok || s.tries >= 3) return; const v = el.querySelector("#a_" + it.key).value.trim(); if (!v) return;
          s.tries++; s.answers.push(v.slice(0, 20)); s.ok = close(v, it.truth, it.dec, it.tol); });
        paint(); if (done()) { btn.classList.add("hidden"); onDone(st); }
      };
      items.forEach((it) => el.querySelector("#a_" + it.key).addEventListener("keydown", (e) => { if (e.key === "Enter") btn.click(); }));
    }
  };
  const css = document.createElement("style");
  css.textContent = `.quizgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
  .qbox{border:1px dashed var(--rule);border-radius:10px;padding:10px}.qbox.good{border:1px solid var(--good);background:#eef8f1}
  .qbox.shown{border:1px solid var(--b);background:var(--goldsoft)}.goal{border-left:5px solid var(--gold);background:var(--goldsoft);padding:10px 14px;border-radius:8px}
  .hl{background:var(--goldsoft)}.scroll{overflow-x:auto}.formula{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;background:var(--soft);padding:6px 10px;border-radius:6px;display:inline-block}`;
  document.head.appendChild(css);
})();
