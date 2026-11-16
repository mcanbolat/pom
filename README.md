# POM Games: classroom games for BUS361 Production & Operations Management

These are short web games, one per topic in Heizer, Render & Munson (14e), that students play on their phones or laptops while the data is collected for discussion.

| Piece | What it is |
|---|---|
| `index.html` | Hub page that lists the games by syllabus week |
| `admin.html` | Instructor dashboard: create sessions, see live results, export CSV (same login as the newsvendor game) |
| `games/<key>/index.html` | The student game |
| `games/<key>/model.js`, `dashboard.js` | The game's logic and its dashboard view |
| `schema.sql` | Shared Supabase tables and functions (`pom_*`). Run it once in the SQL Editor; it is safe to re-run |
| `games.js` | Catalogue of games and their status (live / coming soon) |

**Data model.** There is one generic structure for every game: `pom_sessions` (game + params as JSON, plus a random seed so everyone in a session sees the same random events), `pom_players` (condition + final summary), and `pom_events` (one JSON row per player × round × kind). Students can only call the `pom_*` functions. Row-level security means only you can read the data. For SQL analysis use `select * from pom_v_events where code = 'BAKE12';`

**Running a game.** Open `admin.html`, create a session, and show the code or QR code. Keep **Live** ticked while students play, then use the Debrief box. Close the session when you're done and export the CSVs.

**Demo mode.** Add `?demo` to any page URL to try it without saving anything.

**Publishing an update.** Bump the number in `version.txt` and the `V="…"` and `?v=…` values in the pages. Open pages then reload themselves automatically.

**Adding a game.** Add `games/<key>/` with `index.html`, `model.js` and `dashboard.js` (copy the productivity game as a template), set its status to `"live"` in `games.js`, and add its two script tags to `admin.html`. You don't need to change the database.

## Games
- **Ch. 1 Bakery Productivity Challenge.** Students choose bakers, ovens, a mixer, a robot and training for 8 weeks, then calculate labor productivity and multifactor productivity (3 tries each). Experimental conditions: a bonus on LP vs a bonus on MFP, assigned by balanced randomization. Data collected: every decision, output and costs, the calculation attempts and answers, decision time, and a final reflection.

Research use: get IRB approval before publishing data collected in class.
