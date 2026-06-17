/* ============================================================
   results.js — scoreboard, per-role breakdown, answer log,
   facilitator sign-off, attendance, and exports:
   on-screen report, print/PDF, JSON + CSV data files.
   ============================================================ */

const ResultsScreen = (() => {

  function computeScores() {
    const scn = S.scenario;
    let teamPts = 0, teamMax = 0;
    const byRole = {};
    const rows = [];
    scn.injects.forEach((inj, idx) => {
      const ans = S.answers[idx];
      const sc = DrillScreen.scoreOf(ans, inj);
      teamPts += sc.pts; teamMax += sc.max;
      const rid = inj.role;
      if (!byRole[rid]) byRole[rid] = { pts: 0, max: 0, n: 0 };
      byRole[rid].pts += sc.pts; byRole[rid].max += sc.max; byRole[rid].n++;
      rows.push({ idx, inject: inj, ans, sc });
    });
    const pct = teamMax ? Math.round(teamPts / teamMax * 100) : 0;
    return { teamPts, teamMax, pct, byRole, rows };
  }

  function computePerPerson() {
    const scn = S.scenario;
    return S.participants.map(p => {
      let answered = 0, correct = 0, pts = 0, max = 0;
      scn.injects.forEach((inj, idx) => {
        const ans = S.answers[idx]; if (!ans || !ans.individual) return;
        const pick = ans.individual[p.id];
        if (pick === undefined || pick === null) return;
        answered++; max += inj.points;
        if (pick === inj.correct) { correct++; pts += inj.points; }
        else if (Array.isArray(inj.partial) && inj.partial.includes(pick)) { pts += Math.round(inj.points/2); }
      });
      return { p, answered, correct, pts, max, pct: max ? Math.round(pts/max*100) : 0 };
    });
  }

  // Derive a per-person score from the team answers, by the role each person is assigned.
  // Used when individual capture is OFF (single team answer per inject).
  function computePerPersonDerived() {
    const scn = S.scenario;
    return S.participants.map(p => {
      let answered = 0, correct = 0, pts = 0, max = 0, total = 0;
      scn.injects.forEach((inj, idx) => {
        if (inj.role !== p.roleId) return;
        total++;
        const ans = S.answers[idx];
        const sc = DrillScreen.scoreOf(ans, inj);
        max += sc.max;
        if (ans && ans.given !== null && ans.given !== undefined) {
          answered++;
          pts += sc.pts;
          if (sc.result === "ok") correct++;
        }
      });
      return { p, answered, correct, pts, max, total, pct: max ? Math.round(pts/max*100) : 0 };
    }).filter(r => r.total > 0 || true);
  }

  function readiness(pct) {
    if (pct >= 85) return { label: "Strong \u2014 plan well understood", color: "var(--ok)", bg: "var(--ok-bg)" };
    if (pct >= 65) return { label: "Acceptable \u2014 some gaps to address", color: "oklch(0.5 0.12 60)", bg: "var(--warn-bg)" };
    return { label: "Needs improvement \u2014 retraining advised", color: "var(--bad)", bg: "var(--bad-bg)" };
  }

  function donut(pct, color) {
    const r = 78, c = 2 * Math.PI * r, off = c * (1 - pct/100);
    return `<div class="donut"><svg viewBox="0 0 184 184" width="184" height="184">
      <circle cx="92" cy="92" r="${r}" fill="none" stroke="var(--line)" stroke-width="14"/>
      <circle cx="92" cy="92" r="${r}" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round"
        stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 92 92)" class="donut-fill" style="--c:${c}px"/>
      </svg><div class="pct"><div><div class="num">${pct}%</div><div class="lab">Team score</div></div></div></div>`;
  }

  function render() {
    const scn = S.scenario; if (!scn) { S.step = "setup"; saveSession(); return window.render(); }
    const R = computeScores();
    const rd = readiness(R.pct);

    const roleBars = Object.entries(R.byRole).sort((a,b)=> (b[1].pts/b[1].max)-(a[1].pts/a[1].max)).map(([rid, v]) => {
      const p = v.max ? Math.round(v.pts/v.max*100) : 0;
      const r = roleById(CFG, rid);
      const who = S.participants.filter(x=>x.roleId===rid).map(x=>x.name).filter(Boolean).join(", ");
      const col = p>=85?"var(--ok)":p>=65?"var(--warn)":"var(--bad)";
      return `<div class="rolebar"><div class="rb-top"><span class="rb-name">${esc(r.name)}${who?` <span class="muted" style="font-weight:400">\u00b7 ${esc(who)}</span>`:""}</span><span class="rb-val">${v.pts}/${v.max} \u00b7 ${p}%</span></div>
        <div class="rb-track"><div class="rb-fill" style="width:${p}%;background:${col}"></div></div></div>`;
    }).join("");

    const logRows = R.rows.map(({idx, inject, ans, sc}) => {
      const r = roleById(CFG, inject.role);
      const given = ans.given===null ? "<span class='muted'>\u2014 none</span>" : `${String.fromCharCode(65+ans.given)}. ${esc(fill(inject.options[ans.given], S.vars))}`;
      const corr = `${String.fromCharCode(65+inject.correct)}. ${esc(fill(inject.options[inject.correct], S.vars))}`;
      const pill = sc.result==="ok"?"ok":sc.result==="partial"?"partial":"no";
      const pl = sc.result==="ok"?"\u2713":sc.result==="partial"?"\u00bd":"\u2717";
      return `<tr>
        <td><span class="tag">${idx+1} \u00b7 ${esc(inject.phase)}</span><br><strong style="font-size:13px">${esc(fill(inject.q, S.vars))}</strong></td>
        <td>${esc(r.short)}</td>
        <td>${given}</td>
        <td>${corr}</td>
        <td><span class="pill-res ${pill}">${pl} ${sc.pts}/${sc.max}</span><br><span class="mono" style="font-size:10px;color:var(--muted)">${esc(inject.ref)}</span></td>
      </tr>`;
    }).join("");

    const attendanceRows = S.participants.map(p => `<div class="kv"><span class="k">${esc(p.name)}${p.email?` \u00b7 <span class="muted">${esc(p.email)}</span>`:""}</span><span class="v">${esc(roleById(CFG,p.roleId).name)}</span></div>`).join("");

    const pp = computePerPerson();
    const anyIndividual = pp.some(r => r.answered > 0);
    const useDerived = !(S.capturePerPerson && anyIndividual);
    const ppRows = useDerived ? computePerPersonDerived() : pp;
    const ppNote = useDerived
      ? `Each person's score reflects the team's answers on the injects their assigned role was responsible for.`
      : `Each person's score reflects their own individual answers on every inject.`;
    const totalInjects = S.scenario.injects.length;
    const perPersonCard = (S.participants.length && ppRows.length) ? `
      <div class="card" style="margin-bottom:20px">
        <div class="card-head" style="display:block"><h3 style="font-size:16px">${ICON.users} Individual results</h3><p class="muted small" style="margin-top:4px">${ppNote}</p></div>
        <div class="card-body" style="padding:0;overflow-x:auto">
          <table class="log"><thead><tr><th>Participant</th><th>Assigned role</th><th style="text-align:center">${useDerived?'Injects':'Answered'}</th><th style="text-align:center">Correct</th><th style="text-align:center">Points</th><th style="min-width:140px">Score</th></tr></thead><tbody>
          ${ppRows.slice().sort((a,b)=>b.pct-a.pct).map(r => { const col = r.pct>=85?'var(--ok)':r.pct>=65?'var(--warn)':'var(--bad)';
            const denom = useDerived ? r.total : totalInjects;
            return `<tr><td><strong>${esc(r.p.name||'\u2014')}</strong>${r.p.email?`<br><span class="muted" style="font-size:11px">${esc(r.p.email)}</span>`:''}</td>
              <td>${esc(roleById(CFG,r.p.roleId).name)}</td>
              <td style="text-align:center">${r.answered}/${denom}</td>
              <td style="text-align:center">${r.correct}</td>
              <td style="text-align:center">${r.pts}/${r.max}</td>
              <td>${r.max ? `<div style="display:flex;align-items:center;gap:8px"><div class="rb-track" style="flex:1"><div class="rb-fill" style="width:${r.pct}%;background:${col}"></div></div><span class="mono" style="font-size:12px;color:var(--muted)">${r.pct}%</span></div>` : `<span class="muted small">No scored injects for this role</span>`}</td></tr>`;
          }).join('')}
          </tbody></table>
        </div>
      </div>` : "";

    view().innerHTML = `<div class="wrap">
      ${progressBar("results")}
      <div class="card pad" style="margin-bottom:20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div><div class="eyebrow">After-action summary</div>
        <h1 style="font-size:26px;margin-top:6px">${esc(fill(scn.title, S.vars))}</h1>
        <p class="muted small" style="margin-top:4px">${esc(S.title)} \u00b7 ${esc(fmtDate(S.dateISO))} \u00b7 ${esc(CFG.facility.name)}</p></div>
        <div style="margin-left:auto;display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn" id="backDrill">${ICON.chevL} Back to injects</button>
          <button class="btn" id="exportData">${ICON.download} Data file</button>
          <button class="btn" id="exportCsv">${ICON.download} CSV</button>
          <button class="btn primary" id="printReport">${ICON.print} Report / PDF</button>
          <button class="btn ghost" id="newDrill">${ICON.plus} New drill</button>
        </div>
      </div>

      <div class="scoreboard" style="margin-bottom:20px">
        <div class="card bigscore">
          ${donut(R.pct, rd.color)}
          <div style="font-size:15px;color:var(--muted);margin-top:6px">${R.teamPts} of ${R.teamMax} points</div>
          <div class="readiness" style="color:${rd.color};background:${rd.bg}">${esc(rd.label)}</div>
        </div>
        <div class="card pad">
          <h3 style="font-size:16px;margin-bottom:16px">Performance by responsible role</h3>
          <div class="rolebars">${roleBars}</div>
        </div>
      </div>

      <div class="card" style="margin-bottom:20px">
        <div class="card-head"><h3 style="font-size:16px">Answer log</h3></div>
        <div class="card-body" style="padding:0;overflow-x:auto">
          <table class="log"><thead><tr><th style="min-width:280px">Inject &amp; question</th><th>Role</th><th>Answer given</th><th>Model answer</th><th>Result</th></tr></thead>
          <tbody>${logRows}</tbody></table>
        </div>
      </div>

      ${perPersonCard}

      <div class="grid-2" style="margin-bottom:20px;align-items:start">
        <div class="card pad">
          <h3 style="font-size:16px;margin-bottom:12px">${ICON.users} Attendance (${S.participants.length})</h3>
          ${attendanceRows || "<p class='muted'>No participants recorded.</p>"}
          <div class="kv" style="margin-top:8px"><span class="k">Facilitator</span><span class="v">${esc(S.facilitator.name)||"\u2014"} \u00b7 ${esc(S.facilitator.position)}</span></div>
        </div>
        <div class="card pad">
          <h3 style="font-size:16px;margin-bottom:10px">Facilitator notes &amp; lessons learned</h3>
          <textarea id="notes" rows="6" placeholder="Discussion points, observed gaps, follow-up actions, retraining required\u2026">${esc(S.notes)}</textarea>
        </div>
      </div>

      <div class="card pad" id="signoffCard">
        <h3 style="font-size:18px;margin-bottom:4px">Facilitator sign-off</h3>
        <p class="muted small" style="margin-bottom:16px">Required for submission to HSE / internal audit. Confirms the drill was conducted and the record is accurate.</p>
        <div class="grid-2">
          <label class="field"><span class="lab">Name</span><input type="text" id="so-name" value="${esc(S.signoff.name||S.facilitator.name)}"></label>
          <label class="field"><span class="lab">Position</span><input type="text" id="so-pos" value="${esc(S.signoff.position||S.facilitator.position)}"></label>
        </div>
        <label style="display:flex;gap:10px;align-items:flex-start;margin-top:14px;font-size:14px;font-weight:600;cursor:pointer">
          <input type="checkbox" id="so-attest" ${S.signoff.attest?"checked":""} style="width:auto;margin-top:3px">
          <span>I confirm this tabletop drill was conducted on ${esc(fmtDate(S.dateISO))}${CFG.facility.name?` at ${esc(CFG.facility.name)}`:""}, that the attendance and answers recorded are accurate, and that this record may be submitted for audit.</span>
        </label>
        <div style="margin-top:16px">
          <span class="lab" style="font-size:13px;font-weight:600;color:var(--ink-soft);display:block;margin-bottom:6px">Signature</span>
          <canvas id="sigpad" class="sigpad"></canvas>
          <div style="display:flex;gap:10px;margin-top:8px">
            <button class="btn sm" id="sigClear">Clear signature</button>
            <span class="muted small" id="sigState" style="align-self:center"></span>
          </div>
        </div>
        <div style="margin-top:18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
          <button class="btn primary lg" id="doSign">${ICON.check} Sign &amp; lock report</button>
          <span id="signedState" class="muted small"></span>
        </div>
      </div>
    </div>`;

    // donut animates via CSS; nothing to do here

    $("#backDrill").onclick = () => { S.step = "drill"; saveSession(); window.render(); };
    $("#newDrill").onclick = () => {
      modal({ title: "Start a new drill?",
        body: `<p class="muted">This report stays saved in your browser until you start a fresh session. To keep a permanent copy, use <strong>Report / PDF</strong> or <strong>Data file</strong> first.</p><p class="muted" style="margin-top:10px">What would you like to do?</p>`,
        foot: [
          h(`<button class="btn" data-close>Cancel</button>`),
          (()=>{ const b=h(`<button class="btn">Re-run with a new scenario</button>`); b.onclick=()=>{ closeModal(); S.scenario=null; S.answers=[]; S.cursor=0; S.signoff={ name:"", position:"", attest:false, signature:"", signedISO:null }; S.notes=""; S.step="setup"; saveSession(); window.render(); }; return b; })(),
          (()=>{ const b=h(`<button class="btn danger">Start completely fresh</button>`); b.onclick=()=>{ S = newSession(); clearSession(); closeModal(); window.render(); }; return b; })()
        ] });
    };
    $("#notes").oninput = e => { S.notes = e.target.value; saveSession(); };
    $("#exportData").onclick = () => Report.exportJSON(R);
    $("#exportCsv").onclick = () => Report.exportCSV(R);
    $("#printReport").onclick = () => Report.print(R);

    // sign-off binds
    $("#so-name").oninput = e => { S.signoff.name = e.target.value; saveSession(); };
    $("#so-pos").oninput = e => { S.signoff.position = e.target.value; saveSession(); };
    $("#so-attest").onchange = e => { S.signoff.attest = e.target.checked; saveSession(); };

    setupSignature();
    refreshSigned();

    $("#doSign").onclick = () => {
      if (!S.signoff.name.trim()) { toast("Enter the signer's name"); return; }
      if (!S.signoff.attest) { toast("Tick the attestation to sign"); return; }
      if (!hasInk()) { toast("Add a signature in the box"); return; }
      S.signoff.signature = $("#sigpad").toDataURL("image/png");
      S.signoff.signedISO = new Date().toISOString();
      saveSession(); refreshSigned(); toast("Report signed");
    };

    function refreshSigned() {
      const st = $("#signedState");
      if (S.signoff.signedISO) st.innerHTML = `<span style="color:var(--ok);font-weight:700">${ICON.check} Signed</span> by ${esc(S.signoff.name)} \u00b7 ${esc(fmtDateTime(S.signoff.signedISO))}`;
      else st.textContent = "Not yet signed.";
    }
  }

  /* ---- signature pad ---- */
  let _ink = false;
  function hasInk() { return _ink || !!S.signoff.signature; }
  function setupSignature() {
    const cv = $("#sigpad"); if (!cv) return;
    const ratio = window.devicePixelRatio || 1;
    const resize = () => {
      const w = cv.clientWidth, hh = cv.clientHeight;
      cv.width = w * ratio; cv.height = hh * ratio;
      const ctx = cv.getContext("2d"); ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.strokeStyle = "#1c2b3a";
      if (S.signoff.signature) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, w, hh); img.src = S.signoff.signature; _ink = true; }
    };
    setTimeout(resize, 30);
    const ctx = cv.getContext("2d");
    let drawing = false;
    const pos = e => { const r = cv.getBoundingClientRect(); const t = e.touches?e.touches[0]:e; return { x: t.clientX - r.left, y: t.clientY - r.top }; };
    const start = e => { drawing = true; _ink = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); e.preventDefault(); };
    const move = e => { if (!drawing) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); e.preventDefault(); };
    const end = () => { drawing = false; };
    cv.addEventListener("mousedown", start); cv.addEventListener("mousemove", move); window.addEventListener("mouseup", end);
    cv.addEventListener("touchstart", start, {passive:false}); cv.addEventListener("touchmove", move, {passive:false}); cv.addEventListener("touchend", end);
    $("#sigClear").onclick = () => { ctx.clearRect(0,0,cv.width,cv.height); _ink = false; S.signoff.signature = ""; S.signoff.signedISO = null; saveSession(); $("#signedState").textContent = "Not yet signed."; };
  }

  return { render, computeScores, readiness, computePerPerson };
})();
