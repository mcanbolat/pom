// POM Games — shared student-side client.
// Talks to Supabase RPC functions (pom_join, pom_resume, pom_log, pom_finish,
// pom_leaderboard). Without keys in config.js it runs a local demo engine.
(function () {
  const cfg = window.POM_CONFIG || {};
  const DEMO = !cfg.SUPABASE_URL || !cfg.SUPABASE_KEY || /YOUR/.test(cfg.SUPABASE_URL) ||
               new URLSearchParams(location.search).has("demo");
  let sb = null;
  function client() {
    if (!sb) sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } });
    return sb;
  }

  // ---- seeded RNG (mulberry32): same seed → same sequence for every student ----
  function rng(seed) {
    let a = (Number(seed) >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- local demo engine (one browser, nothing leaves the device) ----
  function demoEngine(game, defaults, bots) {
    const KEY = "pom_demo_" + game;
    const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (_) { return null; } };
    const save = (st) => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (_) {} };
    const state = (st) => JSON.parse(JSON.stringify(st));
    return {
      pom_join(a) {
        const conds = defaults.conditions || [];
        const cond = defaults.assignment && defaults.assignment !== "random" ? defaults.assignment
                   : conds[Math.floor(Math.random() * conds.length)] || null;
        const st = { player_id: "demo", token: "demo", nickname: a.p_nickname, condition: cond, finished: false,
          summary: null, session: { code: "DEMO", title: "Demo session", game, params: { ...defaults, seed: 12345 }, is_open: true },
          events: [] };
        save(st); return state(st);
      },
      pom_resume() { const st = load(); if (!st) throw new Error("Player not found."); return state(st); },
      pom_log(a) {
        const st = load(); if (!st) throw new Error("Player not found.");
        const i = st.events.findIndex(e => e.round === a.p_round && e.kind === a.p_kind);
        const ev = { round: a.p_round, kind: a.p_kind, data: a.p_data };
        if (i >= 0) st.events[i] = ev; else st.events.push(ev);
        save(st); return { ok: true };
      },
      pom_finish(a) { const st = load(); st.finished = true; st.summary = a.p_summary; save(st); return { ok: true }; },
      pom_leaderboard() {
        const st = load(); const me = st && st.finished ? [{ nickname: st.nickname, condition: st.condition, summary: st.summary }] : [];
        return me.concat(typeof bots === "function" ? bots() : []);
      },
      reset() { localStorage.removeItem(KEY); }
    };
  }

  let demo = null;
  const POM = {
    DEMO, rng,
    // games call POM.setup({game, defaults, bots}) once
    setup(o) { this.game = o.game; if (DEMO) demo = demoEngine(o.game, o.defaults || {}, o.bots); },
    async rpc(fn, args) {
      if (DEMO) return demo[fn](args || {});
      const { data, error } = await client().rpc(fn, args || {});
      if (error) throw new Error(error.message);
      return data;
    },
    // remember the player in this browser so a refresh resumes the game
    saved() { try { return JSON.parse(localStorage.getItem("pom_player_" + this.game)) || null; } catch (_) { return null; } },
    remember(st) { try { localStorage.setItem("pom_player_" + this.game, JSON.stringify({ id: st.player_id, token: st.token })); } catch (_) {} },
    forget() { try { localStorage.removeItem("pom_player_" + this.game); } catch (_) {} if (demo) demo.reset(); },
    async join(code, nickname, ref) {
      const st = await this.rpc("pom_join", { p_code: code, p_game: this.game, p_nickname: nickname,
        p_student_ref: ref || null, p_user_agent: navigator.userAgent });
      this.remember(st); return st;
    },
    async resume() {
      const s = this.saved(); if (!s) return null;
      try { return await this.rpc("pom_resume", { p_player: s.id, p_token: s.token }); }
      catch (_) { this.forget(); return null; }
    },
    log(st, round, kind, data) {
      return this.rpc("pom_log", { p_player: st.player_id, p_token: st.token, p_round: round, p_kind: kind, p_data: data });
    },
    finish(st, summary) { return this.rpc("pom_finish", { p_player: st.player_id, p_token: st.token, p_summary: summary }); },
    leaderboard(code) { return this.rpc("pom_leaderboard", { p_code: code }); },
    // small helpers
    $: (id) => document.getElementById(id),
    fmt(x, d = 0) { return Number(x).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); },
    money(x, d = 0) { return (x < 0 ? "−$" : "$") + Math.abs(Number(x)).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); },
    esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); },
    urlCode() { return (new URLSearchParams(location.search).get("code") || "").toUpperCase(); }
  };
  window.POM = POM;
})();
