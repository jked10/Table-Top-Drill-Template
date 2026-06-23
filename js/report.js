/* ============================================================
   report.js — exports.
   - print(): builds a clean, paginated A4 report in a new
     window for printing or "Save as PDF".
   - exportJSON(): full structured record for auditors.
   - exportCSV(): per-inject answer log spreadsheet.
   ============================================================ */

const Report = (() => {

  function download(name, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function dataObject(R) {
    const scn = S.scenario;
    return {
      meta: {
        application: "Tabletop Drill Facilitator",
        generated: new Date().toISOString(),
        standard: CFG.facility.standard,
        organisation: CFG.org.name,
        facility: CFG.facility.name,
        location: CFG.facility.location,
        plan: CFG.facility.planTitle,
        planRef: CFG.facility.planRef
      },
      session: {
        id: S.id, title: S.title, date: S.dateISO, method: "Tabletop exercise",
        facilitator: S.facilitator,
        scenario: { id: scn.id, title: fill(scn.title, S.vars), category: scn.category,
          synopsis: fill(scn.synopsis, S.vars), setup: fill(scn.setup, S.vars),
          startLevel: scn.startLevel, aiGenerated: !!scn.generated, variables: S.vars }
      },
      attendance: S.participants.map(p => ({ name: p.name, email: p.email, role: pRoleNames(p).join(" + ") })),
      score: { teamPoints: R.teamPts, teamMax: R.teamMax, percent: R.pct,
        readiness: ResultsScreen.readiness(R.pct).label,
        byRole: Object.entries(R.byRole).map(([rid,v]) => ({ role: roleById(CFG,rid).name, points: v.pts, max: v.max, percent: v.max?Math.round(v.pts/v.max*100):0 })) },
      injects: R.rows.map(({idx, inject, ans, sc}) => ({
        n: idx+1, phase: inject.phase, role: roleById(CFG, inject.role).name,
        question: fill(inject.q, S.vars),
        answerGiven: ans.given===null ? null : fill(inject.options[ans.given], S.vars),
        modelAnswer: fill(inject.options[inject.correct], S.vars),
        result: sc.result, points: sc.pts, max: sc.max, reference: inject.ref,
        rationale: fill(inject.rationale, S.vars)
      })),
      notes: S.notes,
      individuals: S.capturePerPerson ? ResultsScreen.computePerPerson().filter(r=>r.answered>0).map(r => ({
        name: r.p.name, email: r.p.email, role: pRoleNames(r.p).join(" + "),
        answered: r.answered, correct: r.correct, points: r.pts, max: r.max, percent: r.pct
      })) : [],
      signoff: { name: S.signoff.name, position: S.signoff.position, attested: S.signoff.attest, signedAt: S.signoff.signedISO }
    };
  }

  function exportJSON(R) {
    const safe = (S.title || "drill").replace(/[^\w]+/g, "_");
    download(`${safe}_${S.dateISO}.json`, JSON.stringify(dataObject(R), null, 2), "application/json");
    toast("Data file downloaded");
  }

  function exportCSV(R) {
    const q = s => `"${String(s ?? "").replace(/"/g,'""')}"`;
    const lines = [];
    lines.push(["Inject","Phase","Responsible role","Question","Answer given","Model answer","Result","Points","Max","Reference"].map(q).join(","));
    R.rows.forEach(({idx, inject, ans, sc}) => {
      lines.push([ idx+1, inject.phase, roleById(CFG,inject.role).name, fill(inject.q,S.vars),
        ans.given===null?"(none)":fill(inject.options[ans.given],S.vars),
        fill(inject.options[inject.correct],S.vars), sc.result, sc.pts, sc.max, inject.ref ].map(q).join(","));
    });
    lines.push("");
    lines.push([q("Team score"), q(`${R.teamPts}/${R.teamMax} (${R.pct}%)`)].join(","));
    if (S.capturePerPerson) {
      const pp = ResultsScreen.computePerPerson().filter(r=>r.answered>0);
      if (pp.length) {
        lines.push(""); lines.push(q("Individual results"));
        lines.push(["Participant","Role","Answered","Correct","Points","Max","Percent"].map(q).join(","));
        pp.forEach(r => lines.push([r.p.name, pRoleNames(r.p).join(" + "), r.answered, r.correct, r.pts, r.max, r.pct+"%"].map(q).join(",")));
      }
    }
    const safe = (S.title || "drill").replace(/[^\w]+/g, "_");
    download(`${safe}_${S.dateISO}.csv`, lines.join("\r\n"), "text/csv");
    toast("CSV downloaded");
  }

  function print(R) {
    const scn = S.scenario;
    const rd = ResultsScreen.readiness(R.pct);
    const logo = CFG.org.logoDataUrl ? `<img src="${CFG.org.logoDataUrl}" style="height:46px;max-width:160px;object-fit:contain">` : `<div class="r-logo">${esc((CFG.org.name||"PF")[0])}</div>`;

    const attend = S.participants.map(p => `<tr><td>${esc(p.name)}</td><td>${esc(p.email)||"\u2014"}</td><td>${esc(pRoleNames(p).join(" + "))}</td></tr>`).join("");
    const roleRows = Object.entries(R.byRole).map(([rid,v]) => { const p=v.max?Math.round(v.pts/v.max*100):0; return `<tr><td>${esc(roleById(CFG,rid).name)}</td><td style="text-align:center">${v.n}</td><td style="text-align:center">${v.pts}/${v.max}</td><td style="text-align:center">${p}%</td></tr>`; }).join("");
    const ppList = S.capturePerPerson ? ResultsScreen.computePerPerson().filter(r=>r.answered>0) : [];
    const ppSection = ppList.length ? `<h2>Individual results</h2>
      <table><thead><tr><th>Participant</th><th>Role</th><th style="text-align:center">Answered</th><th style="text-align:center">Correct</th><th style="text-align:center">Points</th><th style="text-align:center">Score</th></tr></thead><tbody>
      ${ppList.sort((a,b)=>b.pct-a.pct).map(r=>`<tr><td>${esc(r.p.name)}${r.p.email?` <span style="color:#8593a3">(${esc(r.p.email)})</span>`:''}</td><td>${esc(pRoleNames(r.p).join(" + "))}</td><td style="text-align:center">${r.answered}/${S.scenario.injects.length}</td><td style="text-align:center">${r.correct}</td><td style="text-align:center">${r.pts}/${r.max}</td><td style="text-align:center">${r.pct}%</td></tr>`).join('')}
      </tbody></table>` : "";
    const logRows = R.rows.map(({idx,inject,ans,sc}) => {
      const res = sc.result==="ok"?"Correct":sc.result==="partial"?"Partial":"Not correct";
      const given = ans.given===null?"\u2014 (no answer)":`${String.fromCharCode(65+ans.given)}. ${esc(fill(inject.options[ans.given],S.vars))}`;
      return `<tr>
        <td style="text-align:center">${idx+1}</td>
        <td><span class="ph">${esc(inject.phase)}</span> \u00b7 ${esc(roleById(CFG,inject.role).name)}<br><b>${esc(fill(inject.q,S.vars))}</b>
          <div class="ga">Given: ${given}</div>
          <div class="ma">Model: ${String.fromCharCode(65+inject.correct)}. ${esc(fill(inject.options[inject.correct],S.vars))}</div>
          <div class="rat">${esc(fill(inject.rationale,S.vars))} <i>(${esc(inject.ref)})</i></div>
        </td>
        <td style="text-align:center" class="res-${sc.result}">${res}<br>${sc.pts}/${sc.max}</td>
      </tr>`;
    }).join("");

    const sig = S.signoff.signedISO
      ? `<div class="sigwrap">${S.signoff.signature?`<img src="${S.signoff.signature}" class="sigimg">`:""}
         <div class="sigline">${esc(S.signoff.name)} \u2014 ${esc(S.signoff.position)}</div>
         <div class="sigmeta">Signed ${esc(fmtDateTime(S.signoff.signedISO))}</div></div>`
      : `<div class="sigwrap"><div class="sigline">Not signed</div><div class="sigmeta">Signature &amp; date: ____________________________</div></div>`;

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(S.title)} \u2014 ${esc(S.dateISO)}</title>
    <style>
      @page { size: A4; margin: 16mm 14mm; }
      * { box-sizing: border-box; }
      body { font-family: "Public Sans", system-ui, Arial, sans-serif; color:#1c2b3a; font-size:11px; line-height:1.5; margin:0; }
      h1{font-size:20px;margin:0} h2{font-size:13px;margin:22px 0 8px;padding-bottom:5px;border-bottom:1.5px solid #d6dde6;letter-spacing:-.01em;color:#28384a}
      .head{display:flex;align-items:center;gap:14px;border-bottom:3px solid #2a5b9e;padding-bottom:14px}
      .r-logo{width:46px;height:46px;border-radius:8px;background:#2a5b9e;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px}
      .head .t{flex:1}
      .eyebrow{font-family:"IBM Plex Mono",monospace;font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:#5b6b7c}
      .badge{font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;padding:4px 9px;border-radius:99px;border:1px solid;display:inline-block}
      .meta{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;margin-top:10px}
      .meta div{display:flex;justify-content:space-between;border-bottom:1px solid #eef1f5;padding:3px 0}
      .meta .k{color:#5b6b7c} .meta .v{font-weight:600}
      table{width:100%;border-collapse:collapse;font-size:10px}
      th{background:#f0f4f9;text-align:left;padding:6px 8px;font-size:8.5px;text-transform:uppercase;letter-spacing:.06em;color:#42566b;border-bottom:1.5px solid #d6dde6}
      td{padding:6px 8px;border-bottom:1px solid #eef1f5;vertical-align:top}
      .ph{font-family:"IBM Plex Mono",monospace;font-size:8px;color:#5b6b7c;text-transform:uppercase;letter-spacing:.05em}
      .ga{margin-top:3px;color:#28384a} .ma{margin-top:2px;color:#1c6b3f} .rat{margin-top:3px;color:#5b6b7c;font-size:9px}
      .res-ok{color:#1c6b3f;font-weight:700} .res-partial{color:#9a6a00;font-weight:700} .res-no{color:#a4262c;font-weight:700}
      .scorebox{display:flex;gap:14px;margin-top:6px}
      .scorebox .big{flex:1;border:1px solid #d6dde6;border-radius:8px;padding:12px 14px}
      .scorebox .num{font-size:30px;font-weight:800;letter-spacing:-.02em}
      .twocol{display:grid;grid-template-columns:1fr 1fr;gap:24px}
      .sigwrap{margin-top:8px} .sigimg{height:54px;display:block;margin-bottom:2px} .sigline{font-weight:700;border-top:1px solid #1c2b3a;display:inline-block;padding-top:3px;min-width:220px} .sigmeta{color:#5b6b7c;font-size:9px;margin-top:3px}
      .notes{border:1px solid #d6dde6;border-radius:8px;padding:10px 12px;min-height:50px;white-space:pre-wrap}
      tr{break-inside:avoid} h2{break-after:avoid}
      .foot{margin-top:22px;border-top:1px solid #d6dde6;padding-top:8px;color:#8593a3;font-size:8.5px;display:flex;justify-content:space-between}
    </style></head><body>
      <div class="head">${logo}
        <div class="t"><div class="eyebrow">${esc(CFG.facility.standard)} \u00b7 Tabletop Exercise Record</div>
          <h1>${esc(S.title)}</h1>
          <div style="color:#5b6b7c;margin-top:2px">${esc(CFG.org.name)} \u2014 ${esc(CFG.facility.name)}, ${esc(CFG.facility.location)}</div>
        </div>
        <div style="text-align:right">
          <div class="badge" style="color:${rd.color};border-color:${rd.color}">${R.pct}% \u00b7 ${esc(rd.label)}</div>
          <div class="eyebrow" style="margin-top:6px">${esc(fmtDate(S.dateISO))}</div>
        </div>
      </div>

      <div class="meta">
        <div><span class="k">Scenario</span><span class="v">${esc(fill(scn.title,S.vars))}</span></div>
        <div><span class="k">Threat category</span><span class="v">${esc(scn.category)}</span></div>
        <div><span class="k">Method</span><span class="v">Tabletop exercise</span></div>
        <div><span class="k">Plan</span><span class="v">${esc(CFG.facility.planTitle)} (${esc(CFG.facility.planRef)})</span></div>
        <div><span class="k">Facilitator</span><span class="v">${esc(S.facilitator.name)} \u00b7 ${esc(S.facilitator.position)}</span></div>
        <div><span class="k">Participants</span><span class="v">${S.participants.length}</span></div>
      </div>

      <h2>Scenario brief</h2>
      <p style="margin:0">${esc(fill(scn.setup,S.vars))}</p>

      <h2>Result</h2>
      <div class="scorebox">
        <div class="big"><div class="eyebrow">Team score</div><div class="num">${R.pct}%</div><div style="color:#5b6b7c">${R.teamPts} of ${R.teamMax} points \u00b7 ${R.rows.length} injects</div></div>
      </div>
      <h2>Performance by responsible role</h2>
      <table><thead><tr><th>Role</th><th style="text-align:center">Injects</th><th style="text-align:center">Points</th><th style="text-align:center">Score</th></tr></thead><tbody>${roleRows}</tbody></table>

      <h2>Attendance</h2>
      <table><thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead><tbody>${attend||"<tr><td colspan=3>None recorded</td></tr>"}</tbody></table>

      ${ppSection}

      <h2>Inject-by-inject log</h2>
      <table><thead><tr><th style="width:24px;text-align:center">#</th><th>Question, answer given &amp; model answer</th><th style="width:64px;text-align:center">Result</th></tr></thead><tbody>${logRows}</tbody></table>

      <div class="twocol">
        <div><h2>Facilitator notes &amp; lessons learned</h2><div class="notes">${esc(S.notes)||"\u2014"}</div></div>
        <div><h2>Facilitator sign-off</h2>
          <p style="margin:0 0 6px;font-size:9.5px;color:#5b6b7c">I confirm this drill was conducted as recorded and the attendance &amp; answers are accurate for submission to HSE / internal audit.</p>
          ${sig}
        </div>
      </div>

      <div class="foot"><span>Generated ${esc(fmtDateTime(new Date().toISOString()))} \u00b7 Tabletop Drill Facilitator</span><span>${esc(CFG.facility.planTitle)} \u00b7 ${esc(CFG.facility.planRef)}</span></div>
      <script>window.onload=function(){setTimeout(function(){window.print();},350);};<\/script>
    </body></html>`;

    const w = window.open("", "_blank");
    if (!w) { toast("Allow pop-ups to print the report"); return; }
    w.document.open(); w.document.write(html); w.document.close();
  }

  return { exportJSON, exportCSV, print };
})();
