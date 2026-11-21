// Catalogue of POM Games, in syllabus order (BUS361, Heizer, Render & Munson 14e).
// status: "live" games have a folder under games/<key>/ with index.html and dashboard.js.
window.POM_CATALOG = [
  { key: "productivity", prefix: "BAKE", chapter: "Ch. 1",  topic: "Operations and Productivity", title: "Bakery Productivity Challenge", week: 1, status: "live",
    blurb: "Staff and equip a bakery, then calculate labor and multifactor productivity. Hidden twist: what you are paid on changes what you do." },
  { key: "quality", prefix: "QUAL",      chapter: "Ch. 6",  topic: "Managing Quality",            title: "Cost of Quality",               week: 1, status: "live",
    blurb: "Spend on prevention and appraisal, or pay for internal and external failures." },
  { key: "spc", prefix: "SPC",          chapter: "S6",     topic: "Statistical Process Control",  title: "Control Chart Detective",       week: 1, status: "live",
    blurb: "Watch a process run and call it in or out of control. Be quick, but avoid false alarms." },
  { key: "project", prefix: "PROJ",      chapter: "Ch. 3",  topic: "Project Management",           title: "Crash the Project",             week: 2, status: "live",
    blurb: "Meet the deadline at the lowest cost by crashing the right activities on the critical path." },
  { key: "forecasting", prefix: "FCST",  chapter: "Ch. 4",  topic: "Forecasting",                  title: "Forecasting Contest",           week: 2, status: "live",
    blurb: "Forecast next period's demand and compete with moving averages and exponential smoothing on MAD."},
  { key: "capacity", prefix: "CAP",     chapter: "Ch. 7",  topic: "Capacity & Constraint Mgmt",   title: "Find the Bottleneck",           week: 3, status: "live",
    blurb: "Spend a budget to add capacity to a multi-step process and maximize throughput." },
  { key: "layout", prefix: "LINE",       chapter: "Ch. 9",  topic: "Layout Strategies",            title: "Line Balancing Puzzle",         week: 3, status: "live",
    blurb: "Assign tasks to workstations, respecting precedence and cycle time, and reach high efficiency." },
  { key: "inventory", prefix: "INV",    chapter: "Ch. 12", topic: "Inventory Management",         title: "Order Up! (EOQ & ROP)",         week: 4, status: "live",
    blurb: "Run a stockroom: choose when and how much to order, balancing holding, ordering, and stockout costs." },
  { key: "queues", prefix: "QUEUE",       chapter: "Mod. D", topic: "Waiting Line Analysis",        title: "Staff the Checkout",            week: 4, status: "live",
    blurb: "Choose the number of servers and trade off the cost of waiting against the cost of service." },
  { key: "lp", prefix: "MIX",           chapter: "Mod. B", topic: "Linear Programming",           title: "Product Mix Puzzle",            week: 5, status: "soon",
    blurb: "Pick a product mix under resource limits, then compare your plan with the LP optimum." }
];
window.POM_GAMES = window.POM_GAMES || {};
