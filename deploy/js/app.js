/* ============================================================
   app.js — core state, routing, and the Home / Setup / Brief
   screens. Drill play-through lives in drill.js, results &
   reporting in results.js.
   ============================================================ */

let CFG = loadConfig();
let LIB = loadLibraries();
let PROCEDURE_TEXT = ""; // optional, used only for live-AI mode

/* ---- scenario-library helpers ---- */
function curSig() { return planSig(CFG.facility.planText || ""); }
function activeFolder() {
  // explicit selection wins; else the folder matching the current procedure
  if (S && S.libFolderId) { const f = LIB.folders.find(x => x.id === S.libFolderId); if (f) return f; }
  return LIB.folders.find(f => f.sig === curSig()) || null;
}
function ensureFolderForCurrent(meta) {
  const sig = curSig();
  let f = LIB.folders.find(x => x.sig === sig);
  if (!f) { f = { id: "fold-" + Date.now(), sig, createdISO: new Date().toISOString(), scenarios: [] }; LIB.folders.push(f); }
  f.title = (meta && meta.title) || CFG.facility.planTitle || "Untitled procedure";
  f.ref = (meta && meta.ref) || CFG.facility.planRef || "";
  f.setting = CFG.facility.type || "";
  f.planText = CFG.facility.planText || "";
  return f;
}

/* ---------------- helpers ---------------- */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const view = () => $("#view");

function h(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function esc(s) { return String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
function uid() { return Math.random().toString(36).slice(2, 9); }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function fmtDate(iso) { try { return new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString(undefined, { weekday:"short", year:"numeric", month:"short", day:"numeric" }); } catch(e){ return iso; } }
function fmtDateTime(iso) { try { return new Date(iso).toLocaleString(undefined, { dateStyle:"medium", timeStyle:"short" }); } catch(e){ return iso; } }

/* ---- plan/procedure upload: extract text from PDF / Word / text files ---- */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if ([...document.scripts].some(s => s.src === src)) return resolve();
    const s = document.createElement("script");
    s.src = src; s.onload = () => resolve(); s.onerror = () => reject(new Error("load failed: " + src));
    document.head.appendChild(s);
  });
}

async function extractTextFromFile(file) {
  const name = (file.name || "").toLowerCase();
  const ext = name.slice(name.lastIndexOf(".") + 1);

  if (ext === "txt" || ext === "md" || ext === "csv" || file.type.startsWith("text/")) {
    return (await file.text()).trim();
  }

  if (ext === "pdf" || file.type === "application/pdf") {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
    const lib = window.pdfjsLib;
    lib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await lib.getDocument({ data }).promise;
    let out = "";
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      out += content.items.map(i => i.str).join(" ").replace(/\s+/g, " ").trim() + "\n\n";
    }
    return out.trim();
  }

  if (ext === "docx" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js");
    const result = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return (result.value || "").trim();
  }

  if (ext === "doc") { throw new Error("Old .doc format not supported — save as .docx or PDF, or paste the text."); }

  // last resort: try reading as text
  return (await file.text()).trim();
}

const ICON = {
  shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/></svg>',
  play:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l11-7z"/></svg>',
  settings:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  mic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3"/></svg>',
  micOff:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18M9 9v1a3 3 0 0 0 5 2M15 9.3V5a3 3 0 0 0-5.7-1.3M5 10a7 7 0 0 0 10.7 6M19 10a7 7 0 0 1-.6 2.8M12 19v3"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  download:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
  print:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>',
  chevR:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  chevL:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
  anchor:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2"/><path d="M12 7v14M5 12a7 7 0 0 0 14 0M5 12H3M19 12h2"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  doc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg>',
  spark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/></svg>',
  key:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="M10.85 12.15L19 4M18 5l2 2M15 8l2 2"/></svg>',
  flag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/></svg>'
};

function toast(msg) {
  let t = $("#toast"); if (!t) { t = h('<div id="toast"></div>'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add("show");
  clearTimeout(t._timer); t._timer = setTimeout(() => t.classList.remove("show"), 2200);
}

function modal({ title, body, foot, wide }) {
  closeModal();
  const back = h(`<div class="modal-back"></div>`);
  const m = h(`<div class="modal ${wide?'wide':''}"></div>`);
  m.innerHTML = `<div class="modal-head"><h3>${esc(title)}</h3><button class="iconbtn" data-close>${ICON.x}</button></div>
    <div class="modal-body"></div>${foot?`<div class="modal-foot"></div>`:""}`;
  $(".modal-body", m).append(typeof body === "string" ? h(`<div>${body}</div>`) : body);
  if (foot) $(".modal-foot", m).append(...(Array.isArray(foot) ? foot : [foot]));
  back.append(m); document.body.append(back);
  back.addEventListener("click", e => { if (e.target === back) closeModal(); });
  $("[data-close]", m).addEventListener("click", closeModal);
  return back;
}
function closeModal() { $$(".modal-back").forEach(e => e.remove()); }

/* ---------------- session state ---------------- */
function newSession() {
  return {
    id: uid(),
    createdISO: new Date().toISOString(),
    title: "",
    dateISO: todayISO(),
    facilitator: { name: "", position: "Facilitator", email: "" },
    participants: [],
    scenarioMode: "random",
    aiFocus: "",
    libFolderId: null,
    pickId: null,
    injectCount: 10,
    difficulty: "standard",   // 'easy' | 'standard' | 'hard'
    capturePerPerson: false,
    sessionMode: "local",   // 'local' (facilitator screen) | 'live' (multi-device)
    mode: "host",            // 'host' | 'participant'
    room: null,              // { code, uid } when in a live room
    level: 1,
    scenario: null,
    vars: {},
    step: "setup",
    cursor: 0,
    answers: [],
    notes: "",
    signoff: { name: "", position: "", attest: false, signature: "", signedISO: null }
  };
}
let S = loadSession() || newSession();

function saveSession() { try { localStorage.setItem("tdf_session", JSON.stringify(S)); } catch(e){} }
function loadSession() { try { return JSON.parse(localStorage.getItem("tdf_session") || "null"); } catch(e){ return null; } }
function clearSession() { localStorage.removeItem("tdf_session"); }

/* ---------------- scenario resolution ---------------- */
function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function buildVars() {
  const v = {};
  for (const k in RANDOM_POOL) v[k] = rnd(RANDOM_POOL[k]);
  return v;
}
function fill(text, vars) { return String(text || "").replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m); }

// Randomise option order per inject so the correct answer isn't always "A".
// Remaps `correct` and `partial` indices to the shuffled positions.
function shuffleScenarioOptions(scn) {
  if (!scn || !Array.isArray(scn.injects)) return scn;
  scn.injects.forEach(inj => {
    if (!Array.isArray(inj.options) || inj.options.length < 2) return;
    const order = inj.options.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    inj.options = order.map(i => inj.options[i]);
    inj.correct = order.indexOf(inj.correct);
    inj.partial = Array.isArray(inj.partial) ? inj.partial.map(p => order.indexOf(p)).filter(x => x >= 0) : [];
  });
  return scn;
}

function resolveScenario() {
  let base;
  if (S.scenarioMode === "pick" && S.pickId) base = SCENARIOS.find(s => s.id === S.pickId);
  if (!base) base = rnd(SCENARIOS);
  const scn = structuredClone(base);
  S.vars = buildVars();
  // trim / pad injects to requested count
  scn.injects = scn.injects.slice(0, S.injectCount);
  shuffleScenarioOptions(scn);
  S.scenario = scn;
  S.level = scn.startLevel || 1;
  S.cursor = 0;
  S.answers = scn.injects.map(() => ({ given: null, revealed: false, individual: {} }));
  saveSession();
}

// Build (and cache) a full scenario from a library stub. Generates injects
// once via AI, then reuses the cached injects on subsequent runs.
async function buildScenarioFromStub(folder, stub) {
  if (!stub.injects || !stub.injects.length) {
    const planText = folder.planText || CFG.facility.planText || "";
    const scn = await AI.generate(CFG, planText, {
      count: S.injectCount, difficulty: S.difficulty,
      focus: stub.title + (stub.synopsis ? " — " + stub.synopsis : "")
    });
    stub.injects = scn.injects;
    stub.startLevel = scn.startLevel || 1;
    if (!stub.setup) stub.setup = scn.setup || "";
    saveLibraries(LIB);
  }
  const scn = {
    id: stub.id, title: stub.title, category: stub.category,
    synopsis: stub.synopsis, setup: stub.setup || "",
    startLevel: stub.startLevel || 1,
    injects: structuredClone(stub.injects).slice(0, S.injectCount)
  };
  S.vars = buildVars();
  shuffleScenarioOptions(scn);
  S.scenario = scn; S.level = scn.startLevel || 1; S.cursor = 0;
  S.answers = scn.injects.map(() => ({ given: null, revealed: false, individual: {} }));
  saveSession();
}

/* ---------------- topbar ---------------- */
function renderTopbar() {
  const lvl = S.level || 1;
  const lvlMeta = CFG.securityLevels[lvl];
  const logo = CFG.org.logoDataUrl
    ? `<span class="logo"><img src="${CFG.org.logoDataUrl}" alt=""></span>`
    : `<span class="logo">${esc((CFG.org.name||"PF")[0])}</span>`;
  const showLevel = S.step === "drill" || S.step === "brief" || S.step === "results";
  return `<div class="topbar">
    <div class="brand" id="homeBtn" style="cursor:pointer" title="Back to setup">${logo}
      <div><div class="name">${esc(CFG.org.name || "Port Facility")}</div>
      <div class="sub">${esc(CFG.facility.name)} \u00b7 Tabletop Drill Facilitator</div></div>
    </div>
    <div class="spacer"></div>
    <div class="tb-actions">
      ${showLevel ? `<span class="level-badge level-${lvl}"><span class="dot"></span>${esc(lvlMeta.name)} \u00b7 ${esc(lvlMeta.tag)}</span>`:""}
      <button class="iconbtn" id="installApp" title="Install DrillFrame as an app" style="display:none">${ICON.download}</button>
      <button class="iconbtn ${TTS.isEnabled()?'active':''}" id="ttsToggle" title="AI voiceover ${TTS.isEnabled()?'on':'off'}">${TTS.isEnabled()?ICON.mic:ICON.micOff}</button>
      <button class="iconbtn" id="openSettings" title="Settings">${ICON.settings}</button>
    </div>
  </div>`;
}
function wireTopbar() {
  const home = $("#homeBtn");
  if (home) home.onclick = () => { if (S.mode === "participant") return; S.step = "setup"; saveSession(); render(); };
  const inst = $("#installApp");
  if (inst) {
    const showInst = () => { if (window.__deferredInstall) inst.style.display = ""; };
    showInst();
    window.addEventListener("df-installable", showInst);
    inst.onclick = async () => {
      const ev = window.__deferredInstall; if (!ev) return;
      ev.prompt();
      try { await ev.userChoice; } catch(e){}
      window.__deferredInstall = null; inst.style.display = "none";
    };
  }
  const tg = $("#ttsToggle");
  if (tg) tg.onclick = () => {
    const now = !TTS.isEnabled();
    TTS.setEnabled(now);            // setEnabled(false) cancels any speech in progress
    tg.classList.toggle("active", now);
    tg.innerHTML = now ? ICON.mic : ICON.micOff;
    tg.title = `AI voiceover ${now ? "on" : "off"}`;
  };
  const os = $("#openSettings");
  if (os) os.onclick = openSettings;
}

/* ---------------- progress steps ---------------- */
function progressBar(active) {
  const steps = [["setup","Set up"],["brief","Brief"],["drill","Run drill"],["results","Report"]];
  const order = steps.map(s => s[0]);
  const ai = order.indexOf(active);
  return `<div class="step-tabs" style="margin-bottom:24px">` + steps.map((s,i) => {
    const cls = i < ai ? "done" : i === ai ? "active" : "";
    return `<div class="step-pill ${cls}"><span class="n">${i<ai?"\u2713":i+1}</span>${s[1]}</div>`;
  }).join("") + `</div>`;
}

/* ---------------- router ---------------- */
function render() {
  document.title = `${CFG.facility.name} \u2014 Tabletop Drill`;
  let app = $("#app");
  app.innerHTML = renderTopbar() + `<main class="view" id="view"></main>`;
  wireTopbar();
  switch (S.step) {
    case "setup": renderSetup(); break;
    case "brief": renderBrief(); break;
    case "drill": DrillScreen.render(); break;
    case "results": ResultsScreen.render(); break;
    case "join": LiveScreens.renderJoin(); break;
    case "lobby": LiveScreens.renderLobby(); break;
    case "participant": LiveScreens.renderParticipant(); break;
    default: renderSetup();
  }
  window.scrollTo(0, 0);
}

/* ===========================================================
   HOME / SETUP
   =========================================================== */
function renderSetup() {
  const resume = (S.scenario && S.step === "setup" && S.answers.some(a => a.revealed));
  view().innerHTML = `<div class="wrap">
    ${progressBar("setup")}
    <div class="hero-split" style="margin-bottom:24px">
      <div class="hs-main">
        <div class="hs-eyebrow">Training · Drills · Readiness</div>
        <h1>Rehearse any procedure. Score the response.</h1>
        <p class="lede">Build structured tabletop exercises for emergency response, security, safety, or standard operating procedures. Walk your team through the scenario, capture every decision, and produce a sign-off-ready report for training records and audit.</p>
        <div class="hs-cta">
          <button class="btn primary lg" id="heroStart">Start a new drill ${ICON.chevR}</button>
          <button class="btn" id="joinLive">${ICON.users} Enter a session code</button>
        </div>
      </div>
      <div class="stepper">
        <div class="sh">How it works</div>
        <div class="step"><span class="n">1</span><span><span class="t">Set up</span><span class="d">Team, roles &amp; scenario</span></span></div>
        <div class="step"><span class="n">2</span><span><span class="t">Brief</span><span class="d">Situation &amp; references</span></span></div>
        <div class="step"><span class="n">3</span><span><span class="t">Run the drill</span><span class="d">Decision-by-decision</span></span></div>
        <div class="step"><span class="n">4</span><span><span class="t">Report</span><span class="d">Score, sign-off &amp; export</span></span></div>
      </div>
    </div>

    <div class="card pad stack" style="margin-bottom:20px">
      <div>
        <div class="eyebrow">Run mode</div>
        <h2 style="margin-top:6px;font-size:22px">How will people take part?</h2>
      </div>
      <div class="grid-2" id="modeChoice" style="gap:12px">
        <div class="card mode-card" data-sm="local" style="box-shadow:none;cursor:pointer;border-width:1.5px">
          <div class="card-body" style="padding:18px">
            <h4 style="font-size:16px">${ICON.doc} Facilitator screen</h4>
            <p class="muted small" style="margin-top:5px">One device, projected in the room or screen-shared on a call. The facilitator drives and records answers. Works offline, zero setup.</p>
          </div>
        </div>
        <div class="card mode-card" data-sm="live" style="box-shadow:none;cursor:pointer;border-width:1.5px">
          <div class="card-body" style="padding:18px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span class="chip">${ICON.users} Remote-friendly</span></div>
            <h4 style="font-size:16px">Live \u2014 everyone on their own device</h4>
            <p class="muted small" style="margin-top:5px" id="liveModeHint"></p>
          </div>
        </div>
      </div>
    </div>

    <div class="card pad stack" id="procCard">
      <div>
        <div class="eyebrow">Step 1 \u00b7 Procedure</div>
        <h2 style="margin-top:6px;font-size:22px">What are we rehearsing?</h2>
        <p class="muted small" style="margin-top:4px">Name the organisation and the procedure, then upload the document. Scenarios &amp; model answers are generated from this.</p>
      </div>
      ${AI.hasBuiltIn() ? "" : `<div id="aiKeyBar"></div>`}
      <div class="grid-2">
        <label class="field"><span class="lab">Organisation name</span><input type="text" id="f-org" value="${esc(CFG.facility.name)}" placeholder="e.g. Acme Operations Ltd"></label>
        <label class="field"><span class="lab">SOP / procedure title</span><input type="text" id="f-plan" value="${esc(CFG.facility.planTitle)}" placeholder="e.g. Emergency Response SOP"></label>
        <label class="field"><span class="lab">Location <span class="muted">(optional)</span></span><input type="text" id="f-loc" value="${esc(CFG.facility.location)}" placeholder="e.g. Site / city"></label>
        <label class="field"><span class="lab">Document reference <span class="muted">(optional)</span></span><input type="text" id="f-ref" value="${esc(CFG.facility.planRef)}" placeholder="e.g. SOP-014 Rev 3"></label>
      </div>
      <label class="field"><span class="lab">Setting / context <span class="muted">(optional, helps tailor scenarios)</span></span>
        <input type="text" id="f-ftype" value="${esc(CFG.facility.type||'')}" placeholder="e.g. 12-bed care home; or chemical warehouse with on-site tanker loading">
      </label>
      <div class="field">
        <span class="lab">Upload the procedure you would like to rehearse</span>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:4px 0 8px">
          <input type="file" id="f-planfile" accept=".pdf,.docx,.txt,.md,.csv,application/pdf" style="flex:1;min-width:220px">
          <span class="muted small" id="f-planstate">${CFG.facility.planText ? `${(CFG.facility.planText.length/1000).toFixed(1)}k characters loaded` : "No procedure loaded yet"}</span>
        </div>
        <textarea id="f-plantext" rows="5" placeholder="Upload a PDF or Word (.docx) document above and its text appears here — or paste/edit the procedure text directly. The AI grounds every model answer and reference in this text.">${esc(CFG.facility.planText||'')}</textarea>
        <span class="hint">Files are read in your browser only — nothing is uploaded to a server.</span>
      </div>
      <div class="field" style="border-top:1px solid var(--line-soft);padding-top:16px">
        <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div>
            <span class="lab" style="font-size:14px">Response roles</span>
            <span class="hint" style="margin-top:2px">The positions you'll assign people to and score. Generate them from your procedure, then edit freely.</span>
          </div>
          <button class="btn sm" id="genRoles" type="button">${ICON.spark} Generate from procedure</button>
        </div>
        <div id="rolesEditor" style="margin-top:12px"></div>
        <button class="btn sm ghost" id="addRole" type="button" style="margin-top:10px">${ICON.plus} Add role</button>
      </div>
      <div class="field" style="border-top:1px solid var(--line-soft);padding-top:16px">
        <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div>
            <span class="lab" style="font-size:14px">Scenario library</span>
            <span class="hint" style="margin-top:2px">Build a set of specific scenarios from this procedure (done once, then saved). You'll pick from them in Step 4.</span>
          </div>
          <button class="btn sm" id="genLibProc" type="button">${ICON.spark} Generate scenarios</button>
        </div>
        <div id="procLibStatus" style="margin-top:10px"></div>
      </div>
    </div>

    <div class="card pad stack" id="setupCard" style="margin-top:20px">
      <div>
        <div class="eyebrow">Step 2 \u00b7 Session</div>
        <h2 style="margin-top:6px;font-size:22px">Facilitator &amp; session details</h2>
      </div>
      <div class="grid-2">
        <label class="field"><span class="lab">Drill title</span><input type="text" id="f-title" value="${esc(S.title)}" placeholder="e.g. Q3 Emergency Response Drill"></label>
        <label class="field"><span class="lab">Date</span><input type="text" id="f-date" value="${esc(S.dateISO)}" placeholder="YYYY-MM-DD"></label>
        <label class="field"><span class="lab">Facilitator name</span><input type="text" id="f-fname" value="${esc(S.facilitator.name)}" placeholder="e.g. Jane Smith"></label>
        <label class="field"><span class="lab">Facilitator position</span><input type="text" id="f-fpos" value="${esc(S.facilitator.position)}"></label>
        <label class="field"><span class="lab">Facilitator email</span><input type="email" id="f-femail" value="${esc(S.facilitator.email)}" placeholder="name@company.com"></label>
      </div>
    </div>

    <div class="card pad stack" style="margin-top:20px">
      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap">
        <div>
          <div class="eyebrow">Step 3 \u00b7 Attendance</div>
          <h2 style="margin-top:6px;font-size:22px">Participants &amp; roles</h2>
          <p class="muted small" style="margin-top:4px">Everyone is asked each question; the role responsible at that step is the one scored. Add each attendee and assign a role.</p>
        </div>
        <button class="btn sm" id="addP">${ICON.plus} Add participant</button>
      </div>
      <div class="plist" id="plist"></div>
    </div>

    <div class="card pad stack" style="margin-top:20px">
      <div>
        <div class="eyebrow">Step 4 \u00b7 Scenario</div>
        <h2 style="margin-top:6px;font-size:22px">Generate the exercise</h2>
      </div>
      <div id="scenChoice"></div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;margin-top:24px;flex-wrap:wrap">
      <button class="btn ghost" id="resetAll">Start a fresh session</button>
      <button class="btn primary lg" id="toBrief">${S.sessionMode==="live" ? `Generate scenario &amp; open the room ${ICON.chevR}` : `Generate scenario &amp; brief the team ${ICON.chevR}`}</button>
    </div>
  </div>`;

  renderParticipants();
  renderScenarioChoice();

  // bind session fields
  const bind = (id, fn) => { const e = $(id); if (e) e.oninput = () => { fn(e.value); saveSession(); }; };
  bind("#f-title", v => S.title = v);
  bind("#f-date", v => S.dateISO = v);
  bind("#f-fname", v => S.facilitator.name = v);
  bind("#f-fpos", v => S.facilitator.position = v);
  bind("#f-femail", v => S.facilitator.email = v);

  // Step 1 · Procedure — bind to CFG and persist
  const bindCfg = (id, fn) => { const e = $(id); if (e) e.oninput = () => { fn(e.value); saveConfig(CFG); }; };
  bindCfg("#f-org", v => { CFG.facility.name = v; CFG.org.name = v; });
  bindCfg("#f-plan", v => CFG.facility.planTitle = v);
  bindCfg("#f-loc", v => CFG.facility.location = v);
  bindCfg("#f-ref", v => CFG.facility.planRef = v);
  bindCfg("#f-ftype", v => CFG.facility.type = v);
  bindCfg("#f-plantext", v => CFG.facility.planText = v);
  const fpf = $("#f-planfile");
  if (fpf) fpf.onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    const st = $("#f-planstate");
    if (st) st.textContent = `Reading ${file.name}…`;
    try {
      const text = await extractTextFromFile(file);
      if (!text) throw new Error("empty");
      $("#f-plantext").value = text;
      CFG.facility.planText = text;
      saveConfig(CFG);
      if (st) st.textContent = `${(text.length/1000).toFixed(1)}k characters from ${file.name}`;
      if (text.trim().length < 200) { toast("Very little text found — if this is a scanned/photo PDF, paste the text in manually instead"); }
      else { toast("Procedure loaded"); }
      renderProcLibStatus();
    } catch (err) {
      if (st) st.textContent = "Couldn't read that file — paste the text instead";
      toast("Couldn't read that file");
    }
  };

  // Step 1 · Procedure — roles editor
  renderRolesEditor();
  const addRoleBtn = $("#addRole");
  if (addRoleBtn) addRoleBtn.onclick = () => {
    let base = "role", id = base, n = 2; const taken = new Set(CFG.roles.map(r=>r.id));
    while (taken.has(id)) { id = base + "_" + n; n++; }
    CFG.roles.push({ id, name: "", short: "", desc: "" });
    saveConfig(CFG); renderRolesEditor();
  };
  const genRolesBtn = $("#genRoles");
  if (genRolesBtn) genRolesBtn.onclick = async () => {
    if (!AI.available()) { toast("Add an Anthropic API key in Settings to generate roles"); openSettings(); return; }
    const planText = ($("#f-plantext") && $("#f-plantext").value) || CFG.facility.planText || "";
    if (!planText.trim()) { toast("Upload or paste your procedure first"); return; }
    const old = genRolesBtn.innerHTML; genRolesBtn.disabled = true; genRolesBtn.innerHTML = "Generating roles…";
    try {
      const roles = await AI.generateRoles(CFG, planText);
      if (!roles.length) throw new Error("none");
      CFG.roles = roles; saveConfig(CFG); renderRolesEditor(); renderParticipants();
      toast(`Suggested ${roles.length} roles — edit as needed`);
    } catch (e) {
      toast(e.userMessage || "Couldn't generate roles — check your key & that the procedure has readable text");
    }
    genRolesBtn.disabled = false; genRolesBtn.innerHTML = old;
  };

  // Step 1 · Procedure — scenario library
  renderProcLibStatus();
  renderAiKeyBar();
  const genLibProcBtn = $("#genLibProc");
  if (genLibProcBtn) genLibProcBtn.onclick = () => generateLibrary("#genLibProc");

  $("#addP").onclick = () => { if (!CFG.roles.length) { toast("Add at least one response role first"); return; } S.participants.push({ id: uid(), name: "", email: "", roleId: CFG.roles[0].id }); saveSession(); renderParticipants(); };
  $("#resetAll").onclick = () => {
    modal({ title: "Start a fresh session?", body: `<p class="muted">This clears the current participants, scenario and any answers recorded. Settings &amp; branding are kept.</p>`,
      foot: [ h(`<button class="btn" data-close>Cancel</button>`), (()=>{ const b=h(`<button class="btn danger">Yes, reset</button>`); b.onclick=()=>{ S = newSession(); clearSession(); closeModal(); render(); }; return b; })() ] });
  };
  $("#toBrief").onclick = goToBrief;

  // run-mode selection
  const liveOk = RoomSync.available();
  const hint = $("#liveModeHint");
  if (hint) hint.innerHTML = liveOk
    ? "Each person opens the link, enters a room code, logs in and answers on their own phone or laptop — live. The facilitator drives and sees every answer in real time."
    : "Needs a one-time Firebase setup (free) before it can be used. <a href='#' id='liveSetupLink'>Set it up in Settings</a>, or see the README.";
  const syncModeCards = () => $$("#modeChoice .mode-card").forEach(c => {
    const on = c.dataset.sm === S.sessionMode;
    c.style.borderColor = on ? "var(--primary)" : "var(--line)";
    c.style.background = on ? "var(--primary-soft)" : "var(--surface)";
  });
  $$("#modeChoice .mode-card").forEach(c => c.onclick = () => {
    if (c.dataset.sm === "live" && !liveOk) { openSettings(); return; }
    S.sessionMode = c.dataset.sm;
    if (c.dataset.sm === "live") S.capturePerPerson = true;
    saveSession(); renderSetup();
  });
  syncModeCards();
  const setupLink = $("#liveSetupLink");
  if (setupLink) setupLink.onclick = (e) => { e.preventDefault(); openSettings(); };
  $("#joinLive").onclick = () => { S.mode = "participant"; S.step = "join"; saveSession(); render(); };
  const heroStart = $("#heroStart");
  if (heroStart) heroStart.onclick = () => { const el = $("#setupCard"); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 16, behavior: "smooth" }); };
}

function renderRolesEditor() {
  const box = $("#rolesEditor"); if (!box) return;
  if (!CFG.roles.length) {
    box.innerHTML = `<div class="empty" style="padding:14px">No roles yet. Generate them from your procedure, or add them manually.</div>`;
    return;
  }
  box.innerHTML = "";
  CFG.roles.forEach(r => {
    const row = h(`<div class="rolerow" style="display:grid;grid-template-columns:1.1fr 0.7fr 2fr auto;gap:8px;align-items:start;margin-bottom:8px">
      <input type="text" data-k="name" placeholder="Role title" value="${esc(r.name)}">
      <input type="text" data-k="short" placeholder="Short" value="${esc(r.short||'')}">
      <input type="text" data-k="desc" placeholder="What they do during the response" value="${esc(r.desc||'')}">
      <button class="iconbtn del" title="Remove role" type="button">${ICON.trash}</button>
    </div>`);
    $$("[data-k]", row).forEach(inp => inp.oninput = () => { r[inp.dataset.k] = inp.value; saveConfig(CFG); });
    $(".del", row).onclick = () => { CFG.roles = CFG.roles.filter(x => x.id !== r.id); saveConfig(CFG); renderRolesEditor(); renderParticipants(); };
    box.append(row);
  });
}

function renderParticipants() {
  const list = $("#plist"); if (!list) return;
  if (!S.participants.length) {
    list.innerHTML = `<div class="empty">No participants yet. Add the team members taking part \u2014 in the room or remote.</div>`;
    return;
  }
  const roleOpts = (sel) => CFG.roles.map(r => `<option value="${r.id}" ${r.id===sel?"selected":""}>${esc(r.name)}</option>`).join("");
  list.innerHTML = "";
  S.participants.forEach(p => {
    const row = h(`<div class="prow">
      <input type="text" data-k="name" placeholder="Full name" value="${esc(p.name)}">
      <input type="email" data-k="email" placeholder="Email" value="${esc(p.email)}">
      <select data-k="roleId">${roleOpts(p.roleId)}</select>
      <button class="iconbtn del" title="Remove">${ICON.trash}</button>
    </div>`);
    $$("[data-k]", row).forEach(inp => inp.oninput = () => { p[inp.dataset.k] = inp.value; saveSession(); });
    $(".del", row).onclick = () => { S.participants = S.participants.filter(x => x.id !== p.id); saveSession(); renderParticipants(); };
    list.append(row);
  });
}

function renderScenarioChoice() {
  const box = $("#scenChoice"); if (!box) return;
  const aiOn = AI.available();
  const folder = activeFolder();
  const libN = folder ? (folder.scenarios || []).length : 0;
  box.innerHTML = `
    <div class="grid-2" style="gap:12px">
      <div class="card" style="box-shadow:none;cursor:pointer;border-width:1.5px" data-mode="random">
        <div class="card-body" style="padding:18px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px"><span class="chip">${ICON.shield} Recommended</span></div>
          <h4 style="font-size:16px">Surprise me</h4>
          <p class="muted small" style="margin-top:5px">${libN ? `Runs a random scenario from your procedure’s library of ${libN}.` : "Runs a random scenario from the built-in library."}</p>
        </div>
      </div>
      <div class="card" style="box-shadow:none;cursor:pointer;border-width:1.5px" data-mode="pick">
        <div class="card-body" style="padding:18px">
          <h4 style="font-size:16px">Choose a specific scenario</h4>
          <p class="muted small" style="margin-top:5px">${libN ? `Pick from the ${libN} scenarios generated from your procedure.` : "Generate a scenario library from your uploaded procedure, then pick one."}</p>
        </div>
      </div>
      <div class="card" style="box-shadow:none;cursor:${aiOn?'pointer':'not-allowed'};opacity:${aiOn?1:.55};border-width:1.5px" data-mode="ai">
        <div class="card-body" style="padding:18px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px"><span class="chip">${ICON.spark} Live AI</span></div>
          <h4 style="font-size:16px">Generate a new scenario with AI</h4>
          <p class="muted small" style="margin-top:5px">${aiOn ? "Generates a brand-new one-off scenario grounded in your procedure." : "Add an Anthropic API key in Settings to enable when self-hosted."}</p>
        </div>
      </div>
    </div>
    <div id="pickWrap" style="margin-top:16px"></div>
    <div id="aiFocusWrap" style="margin-top:16px"></div>
    <div class="field" style="margin-top:16px">
      <span class="lab">Difficulty</span>
      <div id="diffChoice" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
        ${[["easy","Easy","Best answer is obvious"],["standard","Standard","Plausible distractors"],["hard","Hard","Subtle, much less obvious answers"]].map(([id,t,d])=>`
          <button class="btn diff-card" data-diff="${id}" style="flex:1;min-width:160px;flex-direction:column;align-items:flex-start;text-align:left;height:auto;padding:12px 14px;gap:2px"><strong style="font-size:14px">${t}</strong><span class="muted small" style="font-weight:400">${d}</span></button>`).join("")}
      </div>
      <span class="hint">Shapes AI-generated scenarios — on Hard the wrong answers are written to be much less obvious, so the team must really know the plan.</span>
    </div>
    <div class="grid-2" style="margin-top:16px;align-items:start">
      <label class="field"><span class="lab">Number of injects (decision points)</span>
        <input type="number" id="f-count" min="4" max="12" value="${S.injectCount}">
        <span class="hint">Each pre-built scenario has up to 10 injects.</span>
      </label>
      <div class="field">
        <span class="lab">Scoring mode</span>
        <label class="ppl-toggle" style="display:flex;gap:11px;align-items:flex-start;padding:12px 14px;border:1.5px solid var(--line);border-radius:var(--radius-sm);background:var(--surface);cursor:pointer">
          <input type="checkbox" id="f-ppp" ${S.capturePerPerson?"checked":""} style="width:auto;margin-top:2px">
          <span><strong style="font-size:14px">Capture each person's answer</strong><br><span class="muted small">Records an individual response from every participant on each inject — adds a per-person competency table to the report. Leave off for a single team answer per inject.</span></span>
        </label>
      </div>
    </div>`;

  const cards = $$("[data-mode]", box);
  const refresh = () => cards.forEach(c => {
    const on = c.dataset.mode === S.scenarioMode;
    c.style.borderColor = on ? "var(--primary)" : "var(--line)";
    c.style.background = on ? "var(--primary-soft)" : "var(--surface)";
  });
  cards.forEach(c => c.onclick = () => {
    if (c.dataset.mode === "ai" && !aiOn) { openSettings(); return; }
    S.scenarioMode = c.dataset.mode; saveSession(); refresh(); renderPickList();
  });
  refresh();
  renderPickList();

  $("#f-count").oninput = e => { S.injectCount = Math.max(4, Math.min(12, parseInt(e.target.value)||10)); saveSession(); };
  $("#f-ppp").onchange = e => { S.capturePerPerson = e.target.checked; saveSession(); };

  const diffCards = $$("#diffChoice .diff-card", box);
  const refreshDiff = () => diffCards.forEach(c => {
    const on = c.dataset.diff === (S.difficulty || "standard");
    c.style.borderColor = on ? "var(--primary)" : "var(--line)";
    c.style.background = on ? "var(--primary-soft)" : "var(--surface)";
  });
  diffCards.forEach(c => c.onclick = () => { S.difficulty = c.dataset.diff; saveSession(); refreshDiff(); });
  refreshDiff();

  function renderPickList() {
    const w = $("#pickWrap"); if (!w) return;
    renderAiFocus();
    if (S.scenarioMode !== "pick") { w.innerHTML = ""; return; }

    const folder = activeFolder();
    const aiOn = AI.available();
    // folder selector (if the user has libraries from more than one procedure)
    const folderPicker = LIB.folders.length > 1 ? `
      <div class="field" style="margin-bottom:12px">
        <span class="lab">Procedure library</span>
        <select id="folderSel">
          ${LIB.folders.map(f => `<option value="${f.id}" ${activeFolder()&&activeFolder().id===f.id?"selected":""}>${esc(f.title||"Untitled")}${f.ref?` · ${esc(f.ref)}`:""} (${(f.scenarios||[]).length})</option>`).join("")}
        </select>
      </div>` : "";

    const genBtn = `<button class="btn sm" id="genLib" type="button" ${aiOn?"":"disabled"}>${ICON.spark} ${folder&&(folder.scenarios||[]).length?"Regenerate":"Generate"} scenarios from procedure</button>`;

    if (!folder || !(folder.scenarios || []).length) {
      w.innerHTML = folderPicker + `
        <div class="empty" style="padding:18px;text-align:center">
          <p class="muted" style="margin-bottom:12px">No scenario library yet for this procedure. Generate one from your uploaded document — it builds a menu of the specific situations your procedure covers (done once, then saved).</p>
          ${genBtn}
          ${aiOn?"":`<p class="hint" style="margin-top:8px">Add an Anthropic API key in Settings to enable generation.</p>`}
        </div>`;
    } else {
      w.innerHTML = folderPicker + `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px">
          <span class="muted small">${(folder.scenarios||[]).length} scenarios from <strong>${esc(folder.title||"your procedure")}</strong></span>
          ${genBtn}
        </div>
        <div class="stack" style="gap:10px">` + folder.scenarios.map(s => `
        <label class="opt ${S.pickId===s.id?'selected':''}" data-id="${s.id}" style="cursor:pointer">
          <span class="key">${ICON.anchor}</span>
          <span><strong>${esc(s.title)}</strong>${s.category?` <span class="tag">${esc(s.category)}</span>`:""}${s.injects?` <span class="muted small">· ready</span>`:""}<br><span class="muted small">${esc(s.synopsis||"")}</span></span>
        </label>`).join("") + `</div>`;
      $$("[data-id]", w).forEach(el => el.onclick = () => { S.pickId = el.dataset.id; saveSession(); renderPickList(); });
    }

    const fs = $("#folderSel");
    if (fs) fs.onchange = () => { S.libFolderId = fs.value; S.pickId = null; saveSession(); renderPickList(); renderScenarioChoice && renderScenarioChoice(); };
    const gl = $("#genLib");
    if (gl) gl.onclick = () => generateLibrary("#genLib");
  }

  function renderAiFocus() {
    const w = $("#aiFocusWrap"); if (!w) return;
    if (S.scenarioMode !== "ai") { w.innerHTML = ""; return; }
    w.innerHTML = `<label class="field"><span class="lab">Focus on a specific situation <span class="muted">(optional)</span></span>
      <input type="text" id="f-focus" value="${esc(S.aiFocus||'')}" placeholder="e.g. Fire in the engine room — or leave blank for a general scenario">
      <span class="hint">If your uploaded procedure covers many situations, name the one you want to rehearse and the whole scenario is built around it. Leave blank to let the AI pick.</span>
    </label>`;
    const fi = $("#f-focus"); if (fi) fi.oninput = e => { S.aiFocus = e.target.value; saveSession(); };
  }
}

function renderAiKeyBar() {
  const w = $("#aiKeyBar"); if (!w) return;
  const hasKey = !!AI.getKey();
  if (hasKey) {
    w.innerHTML = `<div style="display:flex;align-items:center;gap:10px;padding:11px 14px;border:1px solid var(--ok);background:var(--ok-bg);border-radius:var(--radius-sm);margin-bottom:16px">
      <span style="color:var(--ok);display:flex">${ICON.check}</span>
      <span style="font-size:13.5px;font-weight:600">AI connected</span>
      <span class="muted small">Roles &amp; scenarios can be generated.</span>
      <button class="btn sm ghost" id="aiKeyChange" type="button" style="margin-left:auto">Change key</button>
    </div>`;
    $("#aiKeyChange").onclick = () => { AI.setKey(""); renderAiKeyBar(); renderRolesEditor(); renderProcLibStatus(); renderScenarioChoice(); };
  } else {
    w.innerHTML = `<div style="padding:13px 15px;border:1px solid var(--line);background:var(--surface-2);border-radius:var(--radius-sm);margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:8px">
        <span style="color:var(--primary);display:flex">${ICON.key}</span>
        <span style="font-size:13.5px;font-weight:600">Connect AI to generate roles &amp; scenarios</span>
      </div>
      <input type="password" id="aiKeyInput" placeholder="Paste your Anthropic API key (sk-ant-…)" autocomplete="off" style="width:100%">
      <span class="hint" style="margin-top:6px">Stored only in this browser — never uploaded. Get a key at <span class="mono">console.anthropic.com</span>. Without it you can still run pre-built scenarios.</span>
    </div>`;
    const inp = $("#aiKeyInput");
    if (inp) inp.onchange = () => {
      const v = inp.value.trim();
      if (!v) return;
      AI.setKey(v);
      renderAiKeyBar(); renderRolesEditor(); renderProcLibStatus(); renderScenarioChoice();
      toast("AI connected");
    };
  }
}

function renderProcLibStatus() {
  const w = $("#procLibStatus"); if (!w) return;
  const folder = LIB.folders.find(f => f.sig === curSig());
  const n = folder ? (folder.scenarios || []).length : 0;
  if (!n) { w.innerHTML = `<span class="muted small">No scenarios generated yet for this procedure.</span>`; return; }
  w.innerHTML = `<div class="muted small" style="margin-bottom:8px">${n} scenario${n>1?"s":""} ready — pick one in Step 4, or run “Surprise me”.</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">${folder.scenarios.map(s=>`<span class="tag" style="background:var(--surface-2)">${esc(s.title)}</span>`).join("")}</div>`;
}

async function generateLibrary(btnSel) {
  if (!AI.available()) { toast("Add an Anthropic API key in Settings to generate scenarios"); openSettings(); return; }
  const planText = ($("#f-plantext") && $("#f-plantext").value) || CFG.facility.planText || "";
  if (!planText.trim()) { toast("Upload or paste your procedure first (Step 1)"); return; }
  const gl = btnSel ? $(btnSel) : null; const old = gl ? gl.innerHTML : "";
  if (gl) { gl.disabled = true; gl.innerHTML = "Generating scenarios…"; }
  try {
    const menu = await AI.generateScenarioMenu(CFG, planText, { count: 10 });
    const folder = ensureFolderForCurrent();
    const prev = {}; (folder.scenarios || []).forEach(s => { if (s.injects) prev[s.title] = s; });
    folder.scenarios = menu.map((s, i) => {
      const keep = prev[s.title];
      return { id: "scn-" + Date.now() + "-" + i, title: s.title, category: s.category, synopsis: s.synopsis,
               injects: keep ? keep.injects : null, startLevel: keep ? keep.startLevel : null, setup: keep ? keep.setup : "" };
    });
    saveLibraries(LIB);
    S.libFolderId = folder.id; S.pickId = null; saveSession();
    renderScenarioChoice();
    renderProcLibStatus();
    toast(`Generated ${menu.length} scenarios for this procedure`);
  } catch (e) {
    toast(e.userMessage || "Couldn't generate scenarios — check your key & that the procedure has readable text");
    if (gl) { gl.disabled = false; gl.innerHTML = old; }
  }
}

async function goToBrief() {
  if (!S.facilitator.name.trim()) { toast("Enter the facilitator's name"); $("#f-fname")?.focus(); return; }
  if (S.sessionMode !== "live") {
    if (S.participants.length === 0) { toast("Add at least one participant"); return; }
    if (S.participants.some(p => !p.name.trim())) { toast("Every participant needs a name"); return; }
  }

  const folder = activeFolder();
  const libScenarios = folder ? (folder.scenarios || []) : [];

  if (S.scenarioMode === "ai") {
    const btn = $("#toBrief"); const old = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = `Generating scenario\u2026`;
    try {
      const scn = await AI.generate(CFG, CFG.facility.planText || PROCEDURE_TEXT, { count: S.injectCount, difficulty: S.difficulty, focus: S.aiFocus });
      shuffleScenarioOptions(scn);
      S.vars = buildVars();
      S.scenario = scn; S.level = scn.startLevel || 1; S.cursor = 0;
      S.answers = scn.injects.map(() => ({ given: null, revealed: false, individual: {} }));
      saveSession();
    } catch (e) {
      toast("AI generation failed \u2014 using a pre-built scenario");
      S.scenarioMode = "random"; resolveScenario();
    }
    btn.disabled = false; btn.innerHTML = old;
  } else if (libScenarios.length && (S.scenarioMode === "pick" || S.scenarioMode === "random")) {
    // Run from this procedure's own library (generate injects once, then cached)
    let stub = S.scenarioMode === "pick" ? libScenarios.find(s => s.id === S.pickId) : null;
    if (!stub) stub = rnd(libScenarios);
    const btn = $("#toBrief"); const old = btn.innerHTML;
    const needGen = !stub.injects || !stub.injects.length;
    if (needGen) { btn.disabled = true; btn.innerHTML = `Building \u201c${esc(stub.title)}\u201d\u2026`; }
    try {
      await buildScenarioFromStub(folder, stub);
    } catch (e) {
      toast(e.userMessage || "Couldn't build that scenario — check your key & that the procedure has readable text");
      btn.disabled = false; btn.innerHTML = old; return;
    }
    btn.disabled = false; btn.innerHTML = old;
  } else {
    resolveScenario();
  }

  if (S.sessionMode === "live") {
    const btn = $("#toBrief"); const old = btn ? btn.innerHTML : "";
    if (btn) { btn.disabled = true; btn.innerHTML = "Opening room\u2026"; }
    try {
      const code = await RoomSync.hostRoom({
        meta: { title: S.title, facility: CFG.facility.name, host: S.facilitator.name, date: S.dateISO, capturePerPerson: true },
        scenario: { def: S.scenario, vars: S.vars, injectCount: S.injectCount }
      });
      S.mode = "host"; S.room = { code, uid: null };
      S.participants = []; // live participants self-register
      S.step = "lobby"; saveSession(); render();
    } catch (e) {
      if (btn) { btn.disabled = false; btn.innerHTML = old; }
      toast(e.message || "Could not open the live room");
    }
    return;
  }

  S.step = "brief"; saveSession(); render();
}

/* ===========================================================
   BRIEF
   =========================================================== */
function renderBrief() {
  const scn = S.scenario; if (!scn) { S.step = "setup"; return render(); }
  const setup = fill(scn.setup, S.vars);
  const rolesPresent = [...new Set(scn.injects.map(i => i.role))];
  const contactRows = CFG.contacts.map(c => `<div class="kv"><span class="k">${esc(c.label)}${c.note?` \u00b7 <span class="muted">${esc(c.note)}</span>`:""}</span><span class="v mono">${esc(c.value)}</span></div>`).join("");
  const commsRows = CFG.comms.map(c => `<div class="kv"><span class="k">${esc(c.use)}</span><span class="v mono">${esc(c.ch)}</span></div>`).join("");

  view().innerHTML = `<div class="wrap">
    ${progressBar("brief")}
    <div class="grid-2" style="align-items:start">
      <div class="stack">
        <div class="card">
          <div class="card-head" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <span class="chip">${ICON.flag} ${esc(scn.category)}</span>
            ${scn.generated?`<span class="chip" style="background:var(--surface-2);color:var(--muted)">${ICON.spark} AI-generated</span>`:""}
            <span class="tag" style="margin-left:auto">${scn.injects.length} injects</span>
          </div>
          <div class="card-body">
            <h1 style="font-size:28px;letter-spacing:-0.02em">${esc(fill(scn.title, S.vars))}</h1>
            <p class="lede" style="font-size:16px;margin-top:10px">${esc(fill(scn.synopsis, S.vars))}</p>
            <div class="reveal" style="border-left-color:var(--primary);margin-top:18px">
              <div class="r-h">${ICON.doc} Situation brief</div>
              <p style="font-size:16px;color:var(--ink)">${esc(setup)}</p>
            </div>
          </div>
        </div>

        <div class="card pad">
          <h3 style="font-size:16px;margin-bottom:6px">How this drill runs</h3>
          <ol class="muted" style="margin:8px 0 0;padding-left:20px;line-height:1.9;font-size:14.5px">
            <li>The facilitator reads (or plays the voiceover for) each inject.</li>
            <li>Everyone discusses; the <strong>responsible role</strong> commits to an answer.</li>
            <li>Facilitator records the answer given, then reveals the model answer &amp; plan reference.</li>
            <li>Discussion happens off-program; advance to the next inject.</li>
            <li>At the end: team score, per-role breakdown, attendance &amp; facilitator sign-off.</li>
          </ol>
        </div>
      </div>

      <div class="stack">
        <div class="card pad">
          <h3 style="font-size:16px;margin-bottom:12px">${ICON.users} Roles in play (${rolesPresent.length})</h3>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${rolesPresent.map(rid => { const r = roleById(CFG,rid); const who = S.participants.filter(p=>p.roleId===rid).map(p=>p.name).filter(Boolean);
              return `<span class="chip role" title="${esc(r.desc)}">${esc(r.name)}${who.length?` \u00b7 ${esc(who.join(", "))}`:""}</span>`; }).join("")}
          </div>
          <p class="muted small" style="margin-top:12px">${S.participants.length} registered \u00b7 facilitated by ${esc(S.facilitator.name)||"\u2014"}</p>
        </div>
        <div class="card pad">
          <h3 style="font-size:16px;margin-bottom:10px">Quick reference \u2014 contacts</h3>
          ${contactRows}
        </div>
        <div class="card pad">
          <h3 style="font-size:16px;margin-bottom:10px">Quick reference \u2014 communications</h3>
          ${commsRows}
        </div>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;margin-top:24px;flex-wrap:wrap">
      <button class="btn ghost" id="backSetup">${ICON.chevL} Back to setup</button>
      <div style="display:flex;gap:10px">
        <button class="btn" id="regen">Regenerate scenario</button>
        <button class="btn primary lg" id="startDrill">${ICON.play} Start the drill</button>
      </div>
    </div>
  </div>`;

  $("#backSetup").onclick = () => { S.step = "setup"; saveSession(); render(); };
  $("#regen").onclick = async () => {
    if (S.scenarioMode === "ai") { await goToBrief.call(null); }
    else { resolveScenario(); render(); }
  };
  $("#startDrill").onclick = () => { S.step = "drill"; S.cursor = 0; saveSession(); render(); };
}

/* ===========================================================
   SETTINGS ("backend")
   =========================================================== */
function openSettings() {
  const body = h(`<div class="stack" style="gap:18px"></div>`);
  body.innerHTML = `
    <div>
      <div class="eyebrow">Branding</div>
      <div class="grid-2" style="margin-top:10px">
        <label class="field"><span class="lab">Organisation name</span><input type="text" id="s-org" value="${esc(CFG.org.name)}"></label>
        <label class="field"><span class="lab">Logo</span><input type="file" id="s-logo" accept="image/*"><span class="hint">Optional. Shown on the app &amp; report.</span></label>
      </div>
    </div>
    <div>
      <div class="eyebrow">Organisation &amp; procedure</div>
      <div class="grid-2" style="margin-top:10px">
        <label class="field"><span class="lab">Organisation name</span><input type="text" id="s-fac" value="${esc(CFG.facility.name)}" placeholder="e.g. Acme Operations Ltd"></label>
        <label class="field"><span class="lab">Location</span><input type="text" id="s-loc" value="${esc(CFG.facility.location)}" placeholder="e.g. Site / city"></label>
        <label class="field"><span class="lab">SOP / procedure title</span><input type="text" id="s-plan" value="${esc(CFG.facility.planTitle)}" placeholder="e.g. Emergency Response SOP"></label>
        <label class="field"><span class="lab">Document reference <span class="muted">(optional)</span></span><input type="text" id="s-ref" value="${esc(CFG.facility.planRef)}" placeholder="e.g. SOP-014 Rev 3"></label>
      </div>
      <label class="field" style="margin-top:12px"><span class="lab">Facility type</span>
        <input type="text" id="s-ftype" value="${esc(CFG.facility.type||'')}" placeholder="e.g. marine bulk LPG terminal with a remote sea berth">
        <span class="hint">Describe what kind of facility this is, in plain words, so AI-generated scenarios match it instead of assuming a generic oil terminal.</span>
      </label>
      <div class="field" style="margin-top:12px">
        <span class="lab">Upload the procedure you would like to rehearse</span>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:4px 0 8px">
          <input type="file" id="s-planfile" accept=".pdf,.docx,.txt,.md,.csv,application/pdf" style="flex:1;min-width:220px">
          <span class="muted small" id="s-planstate">${CFG.facility.planText ? `${(CFG.facility.planText.length/1000).toFixed(1)}k characters loaded` : "No plan loaded"}</span>
        </div>
        <textarea id="s-plantext" rows="6" placeholder="Upload a PDF or Word (.docx) document above and its text appears here — or paste/edit the procedure text directly. The AI grounds every model answer and reference in this text.">${esc(CFG.facility.planText||'')}</textarea>
        <span class="hint">Files are read in your browser only — nothing is uploaded to a server. PDFs and Word docs are converted to text automatically; you can trim the result before saving.</span>
      </div>
    </div>
    <div>
      <div class="eyebrow">Voiceover</div>
      <div style="margin-top:10px;display:flex;gap:16px;align-items:center;flex-wrap:wrap">
        <label style="display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600"><input type="checkbox" id="s-tts" ${TTS.isEnabled()?"checked":""} style="width:auto"> Enable AI voiceover</label>
        <label style="display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600"><input type="checkbox" id="s-auto" ${TTS.isAutoRead()?"checked":""} style="width:auto"> Auto-read narration &amp; model answers</label>
        <label class="field" style="flex:1;min-width:220px"><span class="lab">Voice</span><select id="s-voice"></select></label>
        <label class="field" style="width:160px"><span class="lab">Speed ${TTS.getRate().toFixed(2)}\u00d7</span><input type="range" id="s-rate" min="0.7" max="1.3" step="0.02" value="${TTS.getRate()}"></label>
      </div>
      <p class="hint" style="margin-top:6px">Turn <strong>auto-read</strong> off to keep the voiceover silent by default — the facilitator reads each inject aloud, and can still tap the mic / “Read model answer aloud” to play it on demand.</p>
      ${TTS.supported()?"":`<p class="hint" style="color:var(--bad)">This browser does not support speech synthesis.</p>`}
    </div>
    <div>
      <div class="eyebrow">Live AI generation (optional)</div>
      <p class="hint" style="margin:6px 0 8px">${AI.hasBuiltIn() ? "Live AI is available in this environment \u2014 no key needed." : "When self-hosted, paste an Anthropic API key to enable live scenario generation. Stored only in this browser."}</p>
      <label class="field"><span class="lab">Anthropic API key</span><input type="password" id="s-key" value="${esc(AI.getKey())}" placeholder="sk-ant-..."></label>
    </div>
    <div>
      <div class="eyebrow">Live multi-device sessions (optional)</div>
      <p class="hint" style="margin:6px 0 8px">${RoomSync.available() ? "✅ Live sessions are configured — participants can join on their own devices." : "Paste your Firebase Realtime Database config to let participants join on their own devices (remote meetings). Free to set up — see the README. For a permanent deployment, also paste it into <span class='mono'>js/config.js</span>."}</p>
      <label class="field"><span class="lab">Firebase config (JSON or the <span class='mono'>const firebaseConfig = {…}</span> snippet)</span>
        <textarea id="s-fb" rows="6" placeholder='{\n  "apiKey": "AIza...",\n  "databaseURL": "https://your-app-default-rtdb.firebaseio.com"\n}'>${esc(RoomSync.getConfig() ? JSON.stringify(RoomSync.getConfig(), null, 2) : "")}</textarea>
        <span class="hint">Needs at least <span class="mono">apiKey</span> and <span class="mono">databaseURL</span>.</span>
      </label>
    </div>`;

  const foot = [
    (()=>{ const b=h(`<button class="btn danger" style="margin-right:auto">Reset to defaults</button>`); b.onclick=()=>{ resetConfig(); CFG=loadConfig(); closeModal(); render(); toast("Settings reset"); }; return b; })(),
    h(`<button class="btn" data-close>Cancel</button>`),
    (()=>{ const b=h(`<button class="btn primary">Save settings</button>`); b.onclick=saveSettings; return b; })()
  ];
  modal({ title: "Settings", body, foot, wide: true });

  // populate voices
  const vsel = $("#s-voice");
  const fillVoices = () => {
    const vs = TTS.getVoices(); const cur = TTS.currentVoice();
    vsel.innerHTML = vs.length ? vs.map(v => `<option value="${esc(v.voiceURI)}" ${cur&&cur.voiceURI===v.voiceURI?"selected":""}>${esc(v.name)} (${esc(v.lang)})</option>`).join("") : `<option>Loading voices\u2026</option>`;
  };
  fillVoices(); if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = fillVoices;
  $("#s-rate").oninput = e => TTS.setRate(parseFloat(e.target.value));

  $("#s-logo").onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader(); r.onload = () => { CFG.org.logoDataUrl = r.result; toast("Logo loaded \u2014 save to keep"); }; r.readAsDataURL(file);
  };

  $("#s-planfile").onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    const st = $("#s-planstate");
    st.textContent = `Reading ${file.name}\u2026`;
    try {
      const text = await extractTextFromFile(file);
      if (!text) throw new Error("empty");
      $("#s-plantext").value = text;
      st.textContent = `${(text.length/1000).toFixed(1)}k characters from ${file.name}`;
      toast("Plan loaded \u2014 review the text, then Save settings");
    } catch (err) {
      st.textContent = err.message && err.message.includes(".doc") ? err.message : "Couldn't read that file";
      toast(err.message && err.message.includes(".doc") ? err.message : "Couldn't read that file \u2014 try a PDF/.docx or paste the text");
    }
  };

  function saveSettings() {
    CFG.org.name = $("#s-org").value;
    CFG.facility.name = $("#s-fac").value;
    CFG.facility.location = $("#s-loc").value;
    CFG.facility.planTitle = $("#s-plan").value;
    CFG.facility.planRef = $("#s-ref").value;
    CFG.facility.type = $("#s-ftype").value;
    CFG.facility.planText = $("#s-plantext").value;
    TTS.setEnabled($("#s-tts").checked);
    TTS.setAutoRead($("#s-auto").checked);
    if (vsel.value && !vsel.value.includes("Loading")) TTS.setVoice(vsel.value);
    AI.setKey($("#s-key").value);
    // Firebase config — accept raw JSON or a `const firebaseConfig = {...}` snippet
    const raw = ($("#s-fb").value || "").trim();
    if (!raw) { RoomSync.setConfig(null); }
    else {
      try {
        const m = raw.match(/\{[\s\S]*\}/);
        const obj = JSON.parse(m ? m[0] : raw);
        if (obj && obj.databaseURL) RoomSync.setConfig(obj);
        else { toast("Firebase config needs a databaseURL"); return; }
      } catch (e) { toast("Couldn't read that Firebase config — check the format"); return; }
    }
    saveConfig(CFG);
    closeModal(); render(); toast("Settings saved");
  }
}

/* ---------------- boot ---------------- */
window.addEventListener("DOMContentLoaded", () => {
  if (!$("#app")) document.body.append(h(`<div id="app"></div>`));
  // Deep link: someone opened a #join=CODE link → go straight to the join screen
  const joinCode = (location.hash.match(/join=([A-Z0-9]+)/i) || [])[1];
  if (joinCode && !(S.mode === "participant" && S.step === "participant")) {
    S.mode = "participant"; S.step = "join"; if (!S.room) S.room = { code: joinCode.toUpperCase(), uid: null };
    saveSession();
  }
  render();
});
