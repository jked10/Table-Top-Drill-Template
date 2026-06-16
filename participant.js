/* ============================================================
   drill.js — the inject-by-inject play-through.
   The facilitator reads/plays each inject, records the answer
   the responsible role gave, reveals the model answer, then
   advances. Progress persists to localStorage.
   ============================================================ */

const DrillScreen = (() => {

  function scoreOf(answer, inject) {
    if (answer.given === null) return { pts: 0, max: inject.points, result: "no" };
    if (answer.given === inject.correct) return { pts: inject.points, max: inject.points, result: "ok" };
    if (Array.isArray(inject.partial) && inject.partial.includes(answer.given)) return { pts: Math.round(inject.points/2), max: inject.points, result: "partial" };
    return { pts: 0, max: inject.points, result: "no" };
  }

  function speakInject(inject, opts = {}) {
    if (!TTS.isEnabled()) return;
    const segs = [];
    segs.push(fill(inject.scene, S.vars));
    const role = roleById(CFG, inject.role);
    segs.push(`Question for the ${role.name}.`);
    segs.push(fill(inject.q, S.vars));
    if (opts.options !== false) {
      inject.options.forEach((o, i) => segs.push(`Option ${String.fromCharCode(65+i)}. ${fill(o, S.vars)}`));
    }
    TTS.speak(segs);
  }

  function render() {
    const scn = S.scenario; if (!scn) { S.step = "setup"; return render2setup(); }
    const i = S.cursor;
    const inject = scn.injects[i];
    const ans = S.answers[i];
    if (!ans.individual) ans.individual = {};
    const role = roleById(CFG, inject.role);
    const respParts = S.participants.filter(p => p.roleId === inject.role);
    const whoHas = respParts.map(p => p.name).filter(Boolean);
    const perPerson = !!S.capturePerPerson;
    const autoDerive = perPerson && respParts.length > 0;
    const liveHost = S.sessionMode === "live" && S.mode === "host";

    function deriveGiven() {
      if (!autoDerive) return;
      const picks = respParts.map(p => ans.individual[p.id]).filter(v => v !== undefined && v !== null);
      if (!picks.length) { ans.given = null; return; }
      const counts = {}; picks.forEach(v => counts[v] = (counts[v]||0)+1);
      let best = picks[0], bestN = 0;
      Object.entries(counts).forEach(([k,n]) => { if (n > bestN) { bestN = n; best = +k; } });
      ans.given = best;
    }

    view().innerHTML = `<div class="wrap">
      ${progressBar("drill")}
      <div class="drill-layout">
        <aside class="rail">
          <div class="rail-h">${esc(fill(scn.title, S.vars))}</div>
          <div class="timeline" id="timeline"></div>
          <div style="margin-top:18px"><button class="btn sm block" id="endEarly">End &amp; score now</button></div>
        </aside>

        <section>
          <div class="card inject-card fade-up" id="injectCard">
            <div class="inject-head">
              <span class="phase-tag">${ICON.flag} ${esc(inject.phase)}</span>
              <span class="tag">Inject ${i+1} / ${scn.injects.length}</span>
              <button class="iconbtn ${TTS.isEnabled()?'active':''}" id="replay" title="Play voiceover" style="margin-left:auto">${ICON.mic}</button>
              <span id="speakInd" style="display:none;color:var(--primary)"><span class="speaking-bars"><span></span><span></span><span></span><span></span></span></span>
            </div>
            <div class="scene">
              ${esc(fill(inject.scene, S.vars))}
              <div><span class="role-call">${ICON.users} Question for: ${esc(role.name)}${whoHas.length?` \u00b7 ${esc(whoHas.join(", "))}`:""}</span></div>
            </div>
            <div class="qbody">
              <div class="qtext">${esc(fill(inject.q, S.vars))}</div>
              <div class="opts" id="opts"></div>
              <div id="ppGrid"></div>
              <div id="revealBox"></div>
              <div class="facline" id="facline"></div>
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:20px">
            <button class="btn" id="prev" ${i===0?"disabled":""}>${ICON.chevL} Previous</button>
            <div class="muted small" id="progressTxt"></div>
            <button class="btn primary" id="next">${i===scn.injects.length-1?"Finish &amp; score":"Next inject"} ${ICON.chevR}</button>
          </div>
        </section>
      </div>
    </div>`;

    renderTimeline();
    renderOptions();
    renderPersonGrid();
    renderFacline();
    renderReveal();
    updateProgressTxt();

    if (liveHost) {
      LiveScreens.hostAttach(refreshLive);
      LiveScreens.hostBroadcast({ cursor: i, revealed: !!ans.revealed, started: true });
    }
    function refreshLive() {
      if (S.step !== "drill") return;
      deriveGiven();
      renderOptions(); renderPersonGrid(); renderFacline(); updateProgressTxt();
    }

    let _speaking = false;
    const _replay = $("#replay");
    if (_replay) { _replay.title = "Replay voiceover"; _replay.onclick = () => speakInject(inject); }
    $("#prev").onclick = () => { if (S.cursor>0){ TTS.cancel(); S.cursor--; saveSession(); render(); } };
    $("#next").onclick = goNext;
    $("#endEarly").onclick = confirmEnd;

    TTS.onState(state => { _speaking = (state==="speaking"); const ind=$("#speakInd"); if(ind) ind.style.display = _speaking?"inline-flex":"none"; if(_replay) _replay.classList.toggle("active", _speaking); });

    // Auto-play narration on first visit to this inject (only if auto-read is on)
    if (TTS.isAutoRead() && !ans.revealed && ans.given === null && !ans._visited) { ans._visited = true; saveSession(); setTimeout(()=>speakInject(inject), 250); }

    function renderOptions() {
      const box = $("#opts");
      box.innerHTML = "";
      inject.options.forEach((opt, idx) => {
        const letter = String.fromCharCode(65+idx);
        let cls = "opt";
        if (ans.revealed) {
          cls += " locked";
          if (idx === inject.correct) cls += " correct";
          else if (idx === ans.given) cls += " wrong";
          else cls += " dim";
        } else if (ans.given === idx) cls += " selected";
        const el = h(`<button class="${cls}"><span class="key">${letter}</span><span>${esc(fill(opt, S.vars))}</span></button>`);
        if (!ans.revealed && !autoDerive) el.onclick = () => { ans.given = idx; saveSession(); renderOptions(); renderFacline(); };
        else if (autoDerive) el.style.cursor = "default";
        box.append(el);
      });
    }

    function renderPersonGrid() {
      const box = $("#ppGrid"); if (!box) return;
      if (!perPerson) { box.innerHTML = ""; return; }
      if (!S.participants.length) { box.innerHTML = `<div class="pp-wrap"><div class="pp-head muted">${liveHost?"Waiting for participants to answer on their devices…":"No participants registered — add them on the setup screen."}</div></div>`; return; }
      const answered = S.participants.filter(p => ans.individual[p.id] !== undefined && ans.individual[p.id] !== null).length;
      box.innerHTML = `<div class="pp-head">${ICON.users} ${liveHost?`Live answers · ${answered}/${S.participants.length} in`:"Record each participant’s answer"} ${autoDerive?`<span class="muted" style="font-weight:400">· the ${esc(role.short)} response counts toward the team score</span>`:`<span class="muted" style="font-weight:400">· no one holds the ${esc(role.short)} role — select the team answer above</span>`}</div>`;
      const grid = h(`<div class="pp-grid"></div>`);
      S.participants.forEach(p => {
        const isResp = p.roleId === inject.role;
        const row = h(`<div class="pp-row ${isResp?'resp':''}"><span class="pp-name">${esc(p.name||'\u2014')}<span class="pp-role">${esc(roleById(CFG,p.roleId).short)}${isResp?' · responsible':''}</span></span><span class="pp-opts"></span></div>`);
        const opts = $('.pp-opts', row);
        inject.options.forEach((o, idx) => {
          const sel = ans.individual[p.id] === idx;
          let extra = '';
          if (ans.revealed) { if (idx === inject.correct) extra = 'ok'; else if (sel) extra = 'no'; }
          const b = h(`<button class="pp-opt ${sel?'sel':''} ${extra}" title="${esc(fill(o,S.vars))}">${String.fromCharCode(65+idx)}</button>`);
          if (!ans.revealed && !liveHost) b.onclick = () => {
            if (ans.individual[p.id] === idx) delete ans.individual[p.id]; else ans.individual[p.id] = idx;
            deriveGiven(); saveSession(); renderPersonGrid(); renderOptions(); renderFacline();
          };
          if (liveHost) b.style.cursor = "default";
          opts.append(b);
        });
        grid.append(row);
      });
      box.append(grid);
    }

    function renderFacline() {
      const fl = $("#facline");
      if (ans.revealed) { fl.innerHTML = ""; return; }
      const hint = autoDerive
        ? `Record the ${esc(role.short)} answer in the grid above, then reveal the model answer.`
        : `Select the answer the responsible role gave, then reveal the model answer.`;
      fl.innerHTML = `<span class="lab">Facilitator:</span><span class="muted small">${hint}</span>`;
      const btn = h(`<button class="btn primary sm" style="margin-left:auto" ${ans.given===null?"disabled":""}>${ICON.check} Reveal model answer</button>`);
      btn.onclick = () => { ans.revealed = true; saveSession(); if (liveHost) LiveScreens.hostBroadcast({ revealed: true }); render(); };
      // allow reveal without an answer (mark as not answered)
      const skip = h(`<button class="btn sm">Reveal (no answer given)</button>`);
      skip.onclick = () => { if (!liveHost) ans.given = null; ans.revealed = true; saveSession(); if (liveHost) LiveScreens.hostBroadcast({ revealed: true }); render(); };
      fl.append(skip, btn);
    }

    function renderReveal() {
      const box = $("#revealBox");
      if (!ans.revealed) { box.innerHTML = ""; return; }
      const sc = scoreOf(ans, inject);
      const resLabel = sc.result==="ok"?"Correct":sc.result==="partial"?"Partial":"Not correct / no answer";
      const resColor = sc.result==="ok"?"var(--ok)":sc.result==="partial"?"oklch(0.5 0.12 60)":"var(--bad)";
      box.innerHTML = `
        <div class="reveal fade-up" style="border-left-color:${resColor}">
          <div class="r-h" style="color:${resColor}">${sc.result==="ok"?ICON.check:ICON.flag}
            <span>${resLabel}</span>
            <span class="score-pop" style="margin-left:auto;color:${resColor}">+${sc.pts} / ${sc.max} pts</span>
          </div>
          <p><strong>Model answer:</strong> ${esc(fill(inject.options[inject.correct], S.vars))}</p>
          <p style="margin-top:8px">${esc(fill(inject.rationale, S.vars))}</p>
          <div class="ref">${ICON.doc.replace('width="1.8"','')} Reference: ${esc(inject.ref)}</div>
          <div style="margin-top:12px"><button class="btn sm" id="playAnswer">${ICON.mic} Read model answer aloud</button></div>
        </div>`;
      const pa = $("#playAnswer");
      if (pa) pa.onclick = () => TTS.speak([`The model answer is option ${String.fromCharCode(65+inject.correct)}.`, fill(inject.rationale, S.vars)]);
      if (TTS.isEnabled() && TTS.isAutoRead() && !ans._spoke) { ans._spoke = true; saveSession();
        TTS.speak([`The model answer is option ${String.fromCharCode(65+inject.correct)}.`, fill(inject.rationale, S.vars)]); }
    }

    function renderTimeline() {
      const tl = $("#timeline");
      tl.innerHTML = `<div class="tl-line"></div>`;
      scn.injects.forEach((inj, idx) => {
        const a = S.answers[idx];
        const cls = idx === S.cursor ? "current" : a.revealed ? "done" : "";
        const mark = a.revealed ? ICON.check : (idx+1);
        const el = h(`<div class="tl-item ${cls}"><span class="mk">${mark}</span>
          <span><span class="ph">${esc(inj.phase)}</span><br>${esc(roleById(CFG,inj.role).short)}</span></div>`);
        el.style.cursor = "pointer";
        el.onclick = () => { TTS.cancel(); S.cursor = idx; saveSession(); render(); };
        tl.append(el);
      });
    }

    function updateProgressTxt() {
      const done = S.answers.filter(a => a.revealed).length;
      $("#progressTxt").textContent = `${done} of ${scn.injects.length} revealed`;
    }

    function goNext() {
      TTS.cancel();
      const isLast = S.cursor >= scn.injects.length - 1;
      if (isLast) {
        // The final "Finish & score" button must always do something.
        // If the last inject wasn't revealed yet, confirm (it counts as
        // unanswered) instead of silently blocking.
        if (!ans.revealed) { confirmEnd(); return; }
        finish(); return;
      }
      if (!ans.revealed) { toast("Reveal the model answer before moving on"); return; }
      S.cursor++; saveSession(); if (liveHost) LiveScreens.hostBroadcast({ cursor: S.cursor, revealed: false }); render();
    }

    function confirmEnd() {
      modal({ title: "End the drill and score now?",
        body: `<p class="muted">Any injects not yet revealed will count as unanswered (0 points). You can still go back from the report.</p>`,
        foot: [ h(`<button class="btn" data-close>Keep going</button>`),
          (()=>{ const b=h(`<button class="btn primary">End &amp; score</button>`); b.onclick=()=>{ closeModal(); finish(); }; return b; })() ] });
    }

    function finish() { TTS.cancel(); if (liveHost) { LiveScreens.hostBroadcast({ finished: true }); LiveScreens.hostDetach(); } S.step = "results"; saveSession(); window.render(); }
  }

  function render2setup(){ S.step="setup"; saveSession(); window.render(); }

  return { render, scoreOf };
})();
