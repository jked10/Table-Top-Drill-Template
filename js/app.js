/* ============================================================
   app.js — core state, routing, and the Home / Setup / Brief
   screens. Drill play-through lives in drill.js, results &
   reporting in results.js.
   ============================================================ */

let CFG = loadConfig();
let PROCEDURE_TEXT = ""; // optional, used only for live-AI mode

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
    title: "ISPS Code Tabletop Drill",
    dateISO: todayISO(),
    facilitator: { name: "", position: "Facilitator / PFSO", email: "" },
    participants: [],
    scenarioMode: "random",
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

/* ---------------- topbar ---------------- */
function renderTopbar() {
  const lvl = S.level || 1;
  const lvlMeta = CFG.securityLevels[lvl];
  const logo = CFG.org.logoDataUrl
    ? `<span class="logo"><img src="${CFG.org.logoDataUrl}" alt=""></span>`
    : `<span class="logo">${esc((CFG.org.name||"PF")[0])}</span>`;
  const showLevel = S.step === "drill" || S.step === "brief" || S.step === "results";
  return `<div class="topbar">
    <div class="brand">${logo}
      <div><div class="name">${esc(CFG.org.name || "Port Facility")}</div>
      <div class="sub">${esc(CFG.facility.name)} \u00b7 Tabletop Drill Facilitator</div></div>
    </div>
    <div class="spacer"></div>
    <div class="tb-actions">
      ${showLevel ? `<span class="level-badge level-${lvl}"><span class="dot"></span>${esc(lvlMeta.name)} \u00b7 ${esc(lvlMeta.tag)}</span>`:""}
      <button class="iconbtn ${TTS.isEnabled()?'active':''}" id="ttsToggle" title="AI voiceover ${TTS.isEnabled()?'on':'off'}">${TTS.isEnabled()?ICON.mic:ICON.micOff}</button>
      <button class="iconbtn" id="openSettings" title="Settings">${ICON.settings}</button>
    </div>
  </div>`;
}
function wireTopbar() {
  const tg = $("#ttsToggle");
  if (tg) tg.onclick = () => { TTS.setEnabled(!TTS.isEnabled()); render(); };
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
    <div class="hero" style="margin-bottom:24px">
      <div class="eyebrow">${esc(CFG.facility.standard)}</div>
      <h1 style="margin-top:10px">Tabletop Drill Facilitator</h1>
      <p class="lede">Run a structured, scored ISPS tabletop exercise against the
        <strong>${esc(CFG.facility.planTitle)}</strong>. Register the team, generate a scenario,
        walk the response inject-by-inject, and produce a sign-off-ready report for HSE and audit.</p>
      <div style="margin-top:16px"><button class="btn" id="joinLive">${ICON.users} Joining on your own device? Enter a session code</button></div>
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

    <div class="card pad stack" id="setupCard">
      <div>
        <div class="eyebrow">Step 1 \u00b7 Session</div>
        <h2 style="margin-top:6px;font-size:22px">Facilitator &amp; session details</h2>
      </div>
      <div class="grid-2">
        <label class="field"><span class="lab">Drill title</span><input type="text" id="f-title" value="${esc(S.title)}"></label>
        <label class="field"><span class="lab">Date</span><input type="text" id="f-date" value="${esc(S.dateISO)}" placeholder="YYYY-MM-DD"></label>
        <label class="field"><span class="lab">Facilitator name</span><input type="text" id="f-fname" value="${esc(S.facilitator.name)}" placeholder="e.g. ${esc(CFG.pfso.name)}"></label>
        <label class="field"><span class="lab">Facilitator position</span><input type="text" id="f-fpos" value="${esc(S.facilitator.position)}"></label>
        <label class="field"><span class="lab">Facilitator email</span><input type="email" id="f-femail" value="${esc(S.facilitator.email)}" placeholder="name@company.com"></label>
      </div>
    </div>

    <div class="card pad stack" style="margin-top:20px">
      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap">
        <div>
          <div class="eyebrow">Step 2 \u00b7 Attendance</div>
          <h2 style="margin-top:6px;font-size:22px">Participants &amp; roles</h2>
          <p class="muted small" style="margin-top:4px">Everyone is asked each question; the role responsible at that step is the one scored. Add each attendee and assign a role.</p>
        </div>
        <button class="btn sm" id="addP">${ICON.plus} Add participant</button>
      </div>
      <div class="plist" id="plist"></div>
    </div>

    <div class="card pad stack" style="margin-top:20px">
      <div>
        <div class="eyebrow">Step 3 \u00b7 Scenario</div>
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

  $("#addP").onclick = () => { S.participants.push({ id: uid(), name: "", email: "", roleId: CFG.roles[0].id }); saveSession(); renderParticipants(); };
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
  box.innerHTML = `
    <div class="grid-2" style="gap:12px">
      <div class="card" style="box-shadow:none;cursor:pointer;border-width:1.5px" data-mode="random">
        <div class="card-body" style="padding:18px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px"><span class="chip">${ICON.shield} Recommended</span></div>
          <h4 style="font-size:16px">Random pre-built scenario</h4>
          <p class="muted small" style="margin-top:5px">Works fully offline. Pulls a fresh, elaborate scenario from the library and randomises vessel, cargo, time &amp; conditions so each run differs.</p>
        </div>
      </div>
      <div class="card" style="box-shadow:none;cursor:pointer;border-width:1.5px" data-mode="pick">
        <div class="card-body" style="padding:18px">
          <h4 style="font-size:16px">Choose a specific scenario</h4>
          <p class="muted small" style="margin-top:5px">Pick the threat type you want to rehearse from the ${SCENARIOS.length}-scenario library.</p>
        </div>
      </div>
      <div class="card" style="box-shadow:none;cursor:${aiOn?'pointer':'not-allowed'};opacity:${aiOn?1:.55};border-width:1.5px" data-mode="ai">
        <div class="card-body" style="padding:18px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px"><span class="chip">${ICON.spark} Live AI</span></div>
          <h4 style="font-size:16px">Generate a new scenario with AI</h4>
          <p class="muted small" style="margin-top:5px">${aiOn ? "Generates a brand-new scenario grounded in your plan." : "Add an Anthropic API key in Settings to enable when self-hosted."}</p>
        </div>
      </div>
    </div>
    <div id="pickWrap" style="margin-top:16px"></div>
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
    if (S.scenarioMode !== "pick") { w.innerHTML = ""; return; }
    w.innerHTML = `<div class="stack" style="gap:10px">` + SCENARIOS.map(s => `
      <label class="opt ${S.pickId===s.id?'selected':''}" data-id="${s.id}" style="cursor:pointer">
        <span class="key">${ICON.anchor}</span>
        <span><strong>${esc(s.title)}</strong><br><span class="muted small">${esc(s.synopsis)}</span></span>
      </label>`).join("") + `</div>`;
    $$("[data-id]", w).forEach(el => el.onclick = () => { S.pickId = el.dataset.id; saveSession(); renderPickList(); });
  }
}

async function goToBrief() {
  if (!S.facilitator.name.trim()) { toast("Enter the facilitator's name"); $("#f-fname")?.focus(); return; }
  if (S.sessionMode !== "live") {
    if (S.participants.length === 0) { toast("Add at least one participant"); return; }
    if (S.participants.some(p => !p.name.trim())) { toast("Every participant needs a name"); return; }
  }

  if (S.scenarioMode === "ai") {
    const btn = $("#toBrief"); const old = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = `Generating scenario\u2026`;
    try {
      const scn = await AI.generate(CFG, CFG.facility.planText || PROCEDURE_TEXT, { count: S.injectCount, difficulty: S.difficulty });
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
      <div class="eyebrow">Facility &amp; plan</div>
      <div class="grid-2" style="margin-top:10px">
        <label class="field"><span class="lab">Facility name</span><input type="text" id="s-fac" value="${esc(CFG.facility.name)}"></label>
        <label class="field"><span class="lab">Location</span><input type="text" id="s-loc" value="${esc(CFG.facility.location)}"></label>
        <label class="field"><span class="lab">Plan title</span><input type="text" id="s-plan" value="${esc(CFG.facility.planTitle)}"></label>
        <label class="field"><span class="lab">Plan reference</span><input type="text" id="s-ref" value="${esc(CFG.facility.planRef)}"></label>
        <label class="field"><span class="lab">PFSO name</span><input type="text" id="s-pfso" value="${esc(CFG.pfso.name)}"></label>
        <label class="field"><span class="lab">PFSO position</span><input type="text" id="s-pfsopos" value="${esc(CFG.pfso.position)}"></label>
      </div>
      <label class="field" style="margin-top:12px"><span class="lab">Facility type</span>
        <input type="text" id="s-ftype" value="${esc(CFG.facility.type||'')}" placeholder="e.g. marine bulk LPG terminal with a remote sea berth">
        <span class="hint">Describe what kind of facility this is, in plain words, so AI-generated scenarios match it instead of assuming a generic oil terminal.</span>
      </label>
      <div class="field" style="margin-top:12px">
        <span class="lab">Your security plan / procedure (for AI grounding)</span>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:4px 0 8px">
          <input type="file" id="s-planfile" accept=".pdf,.docx,.txt,.md,.csv,application/pdf" style="flex:1;min-width:220px">
          <span class="muted small" id="s-planstate">${CFG.facility.planText ? `${(CFG.facility.planText.length/1000).toFixed(1)}k characters loaded` : "No plan loaded"}</span>
        </div>
        <textarea id="s-plantext" rows="6" placeholder="Upload a PDF or Word (.docx) document above and its text appears here — or paste/edit the plan text directly. The AI grounds every model answer and plan reference in this text.">${esc(CFG.facility.planText||'')}</textarea>
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
    CFG.pfso.name = $("#s-pfso").value;
    CFG.pfso.position = $("#s-pfsopos").value;
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
