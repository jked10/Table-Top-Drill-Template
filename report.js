/* ============================================================
   participant.js — LiveScreens: the multi-device flow.
     renderJoin()        participant enters code, logs in, picks role
     renderLobby()       host waiting room (room code + live roster)
     renderParticipant() participant's live inject view
   Plus host-side live wiring used by drill.js (LiveScreens.hostAttach).
   All Firebase access goes through RoomSync; nothing here runs
   unless the user chose a live session.
   ============================================================ */

const LiveScreens = (() => {
  let unsub = [];
  function detach() { unsub.forEach(f => { try { f && f(); } catch (e) {} }); unsub = []; }

  function joinURL(code) { return location.href.split("#")[0] + "#join=" + code; }

  /* ---------------- JOIN (participant) ---------------- */
  function renderJoin() {
    detach();
    const hashCode = (location.hash.match(/join=([A-Z0-9]+)/i) || [])[1];
    const code = (S.room && S.room.code) || (hashCode ? hashCode.toUpperCase() : "");
    view().innerHTML = `<div class="wrap narrow">
      <div class="hero" style="margin:10px 0 24px">
        <div class="eyebrow">${ICON.users} Live session</div>
        <h1 style="margin-top:10px;font-size:34px">Join the drill</h1>
        <p class="lede">Enter the session code from your facilitator, then log in and choose your role.</p>
      </div>
      <div class="card pad stack" id="joinCard">
        <label class="field"><span class="lab">Session code</span>
          <input type="text" id="j-code" value="${esc(code)}" placeholder="e.g. 4KQ7" maxlength="6" style="text-transform:uppercase;font-family:var(--mono);font-size:22px;letter-spacing:0.2em;text-align:center">
        </label>
        <button class="btn primary block" id="j-find">Find session ${ICON.chevR}</button>
        <div id="j-status" class="small muted center"></div>
      </div>
      <div style="margin-top:18px;text-align:center"><button class="btn ghost" id="j-back">${ICON.chevL} Back</button></div>
    </div>`;

    $("#j-back").onclick = () => { S.mode = "host"; S.step = "setup"; saveSession(); render(); };
    $("#j-find").onclick = findSession;
    $("#j-code").addEventListener("keydown", e => { if (e.key === "Enter") findSession(); });
    if (code) findSession();

    async function findSession() {
      const c = ($("#j-code").value || "").trim().toUpperCase();
      const st = $("#j-status");
      if (c.length < 3) { st.textContent = "Enter the code your facilitator gave you."; return; }
      if (!RoomSync.available()) { st.innerHTML = "<span style='color:var(--bad)'>This site isn't set up for live sessions yet.</span>"; return; }
      st.textContent = "Looking for the session\u2026";
      try {
        const meta = await RoomSync.getMeta(c);
        if (!meta) { st.innerHTML = "<span style='color:var(--bad)'>No session found with that code. Check it and try again.</span>"; return; }
        showLogin(c, meta);
      } catch (e) { st.innerHTML = "<span style='color:var(--bad)'>Couldn't reach the session. Check your connection.</span>"; }
    }

    function showLogin(c, meta) {
      const roleOpts = CFG.roles.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join("");
      $("#joinCard").innerHTML = `
        <div class="reveal" style="border-left-color:var(--ok);margin:0 0 6px">
          <div class="r-h" style="color:var(--ok)">${ICON.check} Session found</div>
          <p style="color:var(--ink)"><strong>${esc(meta.title || "Tabletop Drill")}</strong><br>${esc(meta.facility || "")} \u00b7 hosted by ${esc(meta.host || "facilitator")}</p>
        </div>
        <div class="grid-2">
          <label class="field"><span class="lab">Your name</span><input type="text" id="j-name" placeholder="Full name"></label>
          <label class="field"><span class="lab">Email</span><input type="email" id="j-email" placeholder="name@company.com"></label>
        </div>
        <label class="field"><span class="lab">Your role in this drill</span><select id="j-role">${roleOpts}</select>
          <span class="hint" id="j-roledesc"></span></label>
        <button class="btn primary block" id="j-go">${ICON.play} Join as this role</button>
        <div id="j-status2" class="small muted center"></div>`;
      const desc = $("#j-roledesc"); const sel = $("#j-role");
      const updDesc = () => { const r = roleById(CFG, sel.value); desc.textContent = r.desc || ""; };
      sel.onchange = updDesc; updDesc();
      $("#j-name").focus();
      $("#j-go").onclick = async () => {
        const name = ($("#j-name").value || "").trim();
        if (!name) { $("#j-status2").textContent = "Please enter your name."; return; }
        const profile = { name, email: ($("#j-email").value || "").trim(), roleId: sel.value };
        $("#j-go").disabled = true; $("#j-status2").textContent = "Joining\u2026";
        try {
          const uid = await RoomSync.addParticipant(c, profile);
          const room = await RoomSync.getScenario(c);
          S.mode = "participant"; S.room = { code: c, uid };
          S.facilitator = S.facilitator || { name: "", position: "", email: "" };
          S.scenario = room && room.def ? room.def : S.scenario;
          S.vars = room && room.vars ? room.vars : {};
          S.myProfile = profile; S.myPicks = {};
          S.step = "participant"; saveSession(); render();
        } catch (e) { $("#j-go").disabled = false; $("#j-status2").innerHTML = "<span style='color:var(--bad)'>Couldn't join. Try again.</span>"; }
      };
    }
  }

  /* ---------------- LOBBY (host) ---------------- */
  function renderLobby() {
    detach();
    const code = S.room.code;
    const url = joinURL(code);
    view().innerHTML = `<div class="wrap">
      ${progressBar("brief")}
      <div class="grid-2" style="align-items:start">
        <div class="card pad stack">
          <div><div class="eyebrow">${ICON.users} Live session open</div>
          <h1 style="font-size:26px;margin-top:8px">Participants can join now</h1></div>
          <div class="codebox">
            <div class="code-lab">Session code</div>
            <div class="code-big mono">${esc(code)}</div>
          </div>
          <div class="field"><span class="lab">Or share this link</span>
            <div style="display:flex;gap:8px"><input type="text" id="lob-url" readonly value="${esc(url)}"><button class="btn" id="lob-copy">Copy</button></div>
          </div>
          <div id="lob-qr" style="text-align:center"></div>
          <p class="muted small">Everyone opens the link (or the app and taps \u201cjoin\u201d, then enters the code), logs in and picks a role. You\u2019ll see them appear here.</p>
        </div>
        <div class="card pad stack">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <h3 style="font-size:17px">In the room <span id="lob-count" class="chip">0</span></h3>
            <span class="speaking-bars" style="color:var(--ok)"><span></span><span></span><span></span><span></span></span>
          </div>
          <div id="lob-roster" class="plist"><div class="empty">Waiting for the first participant to join\u2026</div></div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;margin-top:24px;flex-wrap:wrap">
        <button class="btn ghost" id="lob-back">${ICON.chevL} Back to setup</button>
        <button class="btn primary lg" id="lob-start">${ICON.play} Start the drill</button>
      </div>
    </div>`;

    $("#lob-copy").onclick = () => { const i = $("#lob-url"); i.select(); document.execCommand && document.execCommand("copy"); navigator.clipboard?.writeText(i.value); toast("Link copied"); };
    $("#lob-back").onclick = () => { detach(); S.step = "setup"; S.sessionMode = "live"; saveSession(); render(); };
    $("#lob-start").onclick = async () => {
      if (!S.participants.length) { if (!confirm("No one has joined yet. Start anyway?")) return; }
      try { await RoomSync.setControl(code, { started: true, cursor: 0, revealed: false, finished: false }); } catch (e) {}
      detach(); S.step = "drill"; S.cursor = 0;
      S.answers = S.scenario.injects.map(() => ({ given: null, revealed: false, individual: {} }));
      saveSession(); render();
    };

    // QR (best-effort; hidden if it fails or is offline)
    const qr = $("#lob-qr");
    const img = new Image();
    img.alt = ""; img.style.cssText = "width:160px;height:160px;border-radius:10px;border:1px solid var(--line);padding:6px;background:#fff";
    img.onload = () => qr.append(img);
    img.onerror = () => {};
    img.src = "https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=" + encodeURIComponent(url);

    // live roster
    unsub.push(RoomSync.watch(`rooms/${code}/participants`, parts => {
      const list = parts ? Object.entries(parts).map(([uid, p]) => ({ uid, ...p })) : [];
      S.participants = list.map(p => ({ id: p.uid, name: p.name, email: p.email || "", roleId: p.roleId, online: p.online !== false }));
      saveSession();
      $("#lob-count").textContent = list.length;
      const roster = $("#lob-roster");
      roster.innerHTML = list.length ? "" : `<div class="empty">Waiting for the first participant to join\u2026</div>`;
      list.sort((a,b)=>(a.joinedAt||0)-(b.joinedAt||0)).forEach(p => {
        roster.append(h(`<div class="prow" style="grid-template-columns:1fr auto">
          <span><strong>${esc(p.name||"\u2014")}</strong> <span class="muted small">${esc(p.email||"")}</span><br><span class="tag">${esc(roleById(CFG,p.roleId).name)}</span></span>
          <span class="chip ${p.online!==false?'':'role'}" style="${p.online!==false?'background:var(--ok-bg);color:var(--ok)':''}">${p.online!==false?"online":"away"}</span>
        </div>`));
      });
    }));
  }

  /* ---------------- host live wiring (called from drill.js) ---------------- */
  function hostAttach(onUpdate) {
    if (!(S.sessionMode === "live" && S.mode === "host" && S.room)) return;
    detach();
    const code = S.room.code;
    unsub.push(RoomSync.watch(`rooms/${code}/participants`, parts => {
      const list = parts ? Object.entries(parts).map(([uid, p]) => ({ id: uid, name: p.name, email: p.email||"", roleId: p.roleId, online: p.online!==false })) : [];
      S.participants = list; saveSession(); onUpdate && onUpdate();
    }));
    unsub.push(RoomSync.watch(`rooms/${code}/answers`, all => {
      (S.scenario.injects || []).forEach((inj, idx) => {
        const a = S.answers[idx]; if (!a) return;
        a.individual = (all && all[idx]) ? { ...all[idx] } : {};
      });
      saveSession(); onUpdate && onUpdate();
    }));
  }
  function hostBroadcast(control) { if (S.sessionMode === "live" && S.room) { RoomSync.setControl(S.room.code, control).catch(()=>{}); } }
  function hostDetach() { detach(); }

  /* ---------------- PARTICIPANT live view ---------------- */
  function renderParticipant() {
    detach();
    if (!S.room || !S.scenario) { S.step = "join"; return render(); }
    const code = S.room.code, uid = S.room.uid;
    S.myPicks = S.myPicks || {};
    view().innerHTML = `<div class="wrap narrow"><div id="pv"></div>
      <div style="margin-top:20px;text-align:center"><button class="btn ghost" id="pv-leave">Leave session</button></div></div>`;
    $("#pv-leave").onclick = () => { detach(); try{ RoomSync.updateParticipant(code, uid, {online:false}); }catch(e){} S.mode="host"; S.room=null; S.step="setup"; saveSession(); render(); };

    let control = { started: false, cursor: 0, revealed: false, finished: false };
    let lastKey = "";

    unsub.push(RoomSync.watch(`rooms/${code}/control`, c => { control = c || control; paint(); }));

    function myScore() {
      let pts=0,max=0,correct=0,ans=0;
      S.scenario.injects.forEach((inj,idx)=>{ const pick=S.myPicks[idx]; if(pick==null) return; ans++; max+=inj.points; if(pick===inj.correct){correct++;pts+=inj.points;} });
      return {pts,max,correct,ans,pct:max?Math.round(pts/max*100):0};
    }

    function paint() {
      const pv = $("#pv"); if (!pv) return;
      const role = roleById(CFG, S.myProfile?.roleId);
      const header = `<div class="card pad" style="margin-bottom:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <div><div class="eyebrow">You\u2019re in \u00b7 ${esc(code)}</div><strong>${esc(S.myProfile?.name||"")}</strong> <span class="chip role">${esc(role.name)}</span></div>
        <button class="iconbtn ${TTS.isEnabled()?'active':''}" id="pv-tts" title="Voiceover" style="margin-left:auto">${TTS.isEnabled()?ICON.mic:ICON.micOff}</button>
      </div>`;

      if (control.finished) {
        const s = myScore();
        pv.innerHTML = header + `<div class="card pad center fade-up">
          <div class="eyebrow">Session complete</div>
          <h1 style="font-size:30px;margin:10px 0">Thank you${S.myProfile?.name?`, ${esc(S.myProfile.name.split(" ")[0])}`:""}</h1>
          <p class="lede">Your facilitator will share the full team report.</p>
          <div style="margin-top:16px;font-size:40px;font-weight:800;letter-spacing:-.03em">${s.pct}%</div>
          <p class="muted">${s.correct} of ${s.ans} answered correctly</p>
        </div>`;
        bindTts(); return;
      }
      if (!control.started) {
        pv.innerHTML = header + `<div class="card pad center fade-up">
          <span class="speaking-bars" style="color:var(--primary)"><span></span><span></span><span></span><span></span></span>
          <h2 style="font-size:22px;margin:14px 0 6px">You\u2019re in the room</h2>
          <p class="muted">Waiting for the facilitator to start the drill\u2026 keep this screen open.</p>
        </div>`;
        bindTts(); return;
      }

      const i = control.cursor || 0;
      const inject = S.scenario.injects[i]; if (!inject) return;
      const isResp = S.myProfile?.roleId === inject.role;
      const mine = S.myPicks[i];
      const revealed = !!control.revealed;
      const key = i + "|" + revealed;

      pv.innerHTML = header + `<div class="card inject-card fade-up">
        <div class="inject-head"><span class="phase-tag">${ICON.flag} ${esc(inject.phase)}</span><span class="tag">Inject ${i+1} / ${S.scenario.injects.length}</span></div>
        <div class="scene">${esc(fill(inject.scene, S.vars))}
          ${isResp?`<div><span class="role-call">${ICON.users} This one\u2019s on you \u2014 ${esc(roleById(CFG,inject.role).name)}</span></div>`:`<div><span class="chip role" style="margin-top:12px">Responsible: ${esc(roleById(CFG,inject.role).name)} \u00b7 everyone answer</span></div>`}
        </div>
        <div class="qbody"><div class="qtext">${esc(fill(inject.q, S.vars))}</div><div class="opts" id="pv-opts"></div>
          <div id="pv-reveal"></div></div>
      </div>`;

      const box = $("#pv-opts");
      inject.options.forEach((opt, idx) => {
        const letter = String.fromCharCode(65+idx);
        let cls = "opt";
        if (revealed) { cls += " locked"; if (idx===inject.correct) cls+=" correct"; else if (idx===mine) cls+=" wrong"; else cls+=" dim"; }
        else if (mine===idx) cls += " selected";
        const el = h(`<button class="${cls}"><span class="key">${letter}</span><span>${esc(fill(opt,S.vars))}</span></button>`);
        if (!revealed) el.onclick = () => { S.myPicks[i]=idx; saveSession(); RoomSync.setAnswer(code,i,uid,idx).catch(()=>{}); paint(); };
        box.append(el);
      });

      const rev = $("#pv-reveal");
      if (revealed) {
        const right = mine===inject.correct;
        const col = right?"var(--ok)":"var(--bad)";
        rev.innerHTML = `<div class="reveal fade-up" style="border-left-color:${col}">
          <div class="r-h" style="color:${col}">${right?ICON.check:ICON.flag} ${right?"You got it":"Not quite"}</div>
          <p><strong>Model answer:</strong> ${esc(fill(inject.options[inject.correct],S.vars))}</p>
          <p style="margin-top:8px">${esc(fill(inject.rationale,S.vars))}</p>
          <div class="ref">Reference: ${esc(inject.ref)}</div></div>`;
      } else if (mine!=null) {
        rev.innerHTML = `<p class="muted small" style="margin-top:14px">${ICON.check} Answer locked in \u2014 you can change it until the facilitator reveals. Waiting for the group\u2026</p>`;
      } else {
        rev.innerHTML = `<p class="muted small" style="margin-top:14px">Tap your answer above.</p>`;
      }

      // speak on new inject only
      if (TTS.isEnabled() && key !== lastKey && !revealed) {
        lastKey = key;
        TTS.speak([fill(inject.scene,S.vars), fill(inject.q,S.vars), ...inject.options.map((o,n)=>`Option ${String.fromCharCode(65+n)}. ${fill(o,S.vars)}`)]);
      } else { lastKey = key; }
      bindTts();
    }

    function bindTts() { const b=$("#pv-tts"); if(b) b.onclick=()=>{ TTS.setEnabled(!TTS.isEnabled()); if(!TTS.isEnabled())TTS.cancel(); paint(); }; }
    paint();
  }

  return { renderJoin, renderLobby, renderParticipant, hostAttach, hostBroadcast, hostDetach, detach };
})();
