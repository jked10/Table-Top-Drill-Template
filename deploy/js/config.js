/* ============================================================
   config.js — Procedure / facility configuration.
   This is the "backend" data a buyer of the template edits to
   rebrand for their own facility & plan. It is the DEFAULT;
   the in-app Settings panel can override it and persists to
   localStorage. To ship a different default, edit this file.
   ============================================================ */

/* ------------------------------------------------------------
   LIVE MULTI-DEVICE SESSIONS (optional).
   To let each participant join on their own device (remote
   meetings), paste your Firebase Realtime Database config
   between the braces below, then re-deploy. Free to set up —
   see the README ("Live multi-device sessions"). Leave blank
   to keep the reliable single-screen facilitator mode only.
   Example:
     const CONFIG_FIREBASE = {
       apiKey: "AIza....",
       authDomain: "your-app.firebaseapp.com",
       databaseURL: "https://your-app-default-rtdb.firebaseio.com",
       projectId: "your-app"
     };
   ------------------------------------------------------------ */
const CONFIG_FIREBASE = {
  apiKey: "AIzaSyBTObwN8z6miSLdTbWQdREU0PrexT49G5k",
  authDomain: "table-top-drill-template.firebaseapp.com",
  databaseURL: "https://table-top-drill-template-default-rtdb.firebaseio.com",
  projectId: "table-top-drill-template",
  storageBucket: "table-top-drill-template.firebasestorage.app",
  messagingSenderId: "391743242014",
  appId: "1:391743242014:web:dd5e49779552eb3732530f"
};

const DEFAULT_CONFIG = {
  org: {
    name: "",
    logoDataUrl: ""            // optional base64 logo, set via Settings
  },
  facility: {
    name: "",
    location: "",
    planTitle: "",
    planRef: "",
    standard: "",
    type: "",
    planText: ""   // upload your procedure via Settings to ground AI-generated scenarios
  },
  pfso: {
    name: "",
    position: "",
    phone: "(246) 417 6403",
    email: "j.desouza@rubis-caribbean.com"
  },
  // Used in the report header & quick-reference panel during the drill.
  contacts: [
    { label: "Police", value: "211", note: "Barbados Police Service" },
    { label: "Police Hotline", value: "(246) 429 8787", note: "Security / Explosives" },
    { label: "EPD", value: "(246) 535 4600", note: "Chemicals / Bio / Pollution" },
    { label: "Assistant PFSO", value: "(246) 417 6409", note: "S. Blackett" },
    { label: "HSE Officer", value: "(246) 417 6329", note: "A. Alleyne" }
  ],
  comms: [
    { ch: "VHF 11 & 9", use: "Internal facility / ship" },
    { ch: "VHF 12 & 16", use: "Harbour authorities" },
    { ch: "UHF (secure)", use: "Handheld — range 1.0 NM" },
    { ch: "211", use: "Police" }
  ],
  securityLevels: {
    1: { name: "Level 1", tag: "Normal", desc: "Minimum protective measures maintained at all times (\u201cnear normalcy\u201d)." },
    2: { name: "Level 2", tag: "Heightened", desc: "Additional protective measures for a period of heightened risk." },
    3: { name: "Level 3", tag: "Exceptional", desc: "Further specific measures; a security incident is probable or imminent. Outside authorities take control." }
  },
  // Player roles. `facilitator` is handled separately (runs the session).
  roles: [
    { id: "pfso",          name: "PFSO / Terminal Manager", short: "PFSO",          desc: "Overall command of port facility security; decides measures, liaises with authorities & SSO." },
    { id: "apfso",         name: "Assistant PFSO",          short: "A/PFSO",        desc: "Acts for the PFSO when away; supports command and coordination." },
    { id: "chief_jetty",   name: "Chief Jetty Man",         short: "Jetty",         desc: "Senior person on the jetty/shore connection; first eyes on waterside & landside threats." },
    { id: "loading_master",name: "Loading Master",          short: "Loading",       desc: "Controls the cargo transfer; authority to suspend / shut down discharge." },
    { id: "control_room",  name: "Control Room Operator",   short: "Control",       desc: "Monitors CCTV, alarms & comms; logs events and relays information." },
    { id: "tank_farm",     name: "Tank Farm Operator",      short: "Tank Farm",     desc: "Operates shore tanks, valves & pipelines; isolates product flow when required." },
    { id: "chief_officer", name: "Chief Officer (Ship/SSO)",short: "Ship",          desc: "Ship\u2019s officer / SSO interface; ship-side security actions & DoS." },
    { id: "boatman",       name: "Boatman / Tender",        short: "Tender",        desc: "Contracted tender; patrols & monitors waterside, reports to PFSO-certified operators." },
    { id: "police",        name: "Police",                  short: "Police",        desc: "Barbados Police Service; law-enforcement response (when involved)." },
    { id: "coast_guard",   name: "Coast Guard / BDF",       short: "Coast Guard",   desc: "Barbados Defence Force / Coast Guard; waterside law enforcement (when involved)." }
  ]
};

// ---- live working copy (Settings may overwrite) ----
function loadConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem("tdf_config") || "null");
    if (saved) return deepMerge(structuredClone(DEFAULT_CONFIG), saved);
  } catch (e) {}
  return structuredClone(DEFAULT_CONFIG);
}
function saveConfig(cfg) { localStorage.setItem("tdf_config", JSON.stringify(cfg)); }
function resetConfig() { localStorage.removeItem("tdf_config"); }

/* ---- Per-document scenario libraries ("folders") ----
   Each uploaded procedure gets its own folder of generated scenarios,
   keyed by a cheap signature of the procedure text so re-uploading the
   same document reuses (rather than regenerates) its scenarios. */
function loadLibraries() {
  try { const l = JSON.parse(localStorage.getItem("tdf_libraries") || "null"); if (l && Array.isArray(l.folders)) return l; } catch (e) {}
  return { folders: [] };
}
function saveLibraries(lib) {
  try { localStorage.setItem("tdf_libraries", JSON.stringify(lib)); }
  catch (e) { /* quota — drop oldest folder's cached injects and retry once */
    try { (lib.folders||[]).forEach(f => (f.scenarios||[]).forEach(s => { if (s.injects) delete s.injects; })); localStorage.setItem("tdf_libraries", JSON.stringify(lib)); } catch (_) {}
  }
}
function planSig(text) {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length + ":" + t.slice(0, 60) + ":" + t.slice(-60);
}

function deepMerge(base, over) {
  for (const k in over) {
    if (over[k] && typeof over[k] === "object" && !Array.isArray(over[k])) {
      base[k] = deepMerge(base[k] || {}, over[k]);
    } else { base[k] = over[k]; }
  }
  return base;
}

function roleById(cfg, id) { return cfg.roles.find(r => r.id === id) || { id, name: id, short: id }; }
