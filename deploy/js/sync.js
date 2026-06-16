/* ============================================================
   sync.js — RoomSync: optional realtime backend for live,
   multi-device sessions. Uses Firebase Realtime Database
   (client-only, works on static hosting like GitHub/Cloudflare
   Pages). If no Firebase config is present, available() is
   false and the app stays in reliable single-screen mode.

   Data model:
     rooms/{code}/meta         { title, facility, host, createdAt }
     rooms/{code}/scenario     resolved scenario + vars (so joiners render identically)
     rooms/{code}/control      { cursor, revealed, started, finished }
     rooms/{code}/participants/{uid}  { name, email, roleId, online, joinedAt }
     rooms/{code}/answers/{injectIndex}/{uid}  optionIndex
   ============================================================ */

const RoomSync = (() => {
  let app = null, db = null, ready = false, initPromise = null;
  const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";

  function cfg() {
    try { const o = JSON.parse(localStorage.getItem("tdf_firebase") || "null"); if (o && o.databaseURL) return o; } catch (e) {}
    if (typeof CONFIG_FIREBASE !== "undefined" && CONFIG_FIREBASE && CONFIG_FIREBASE.databaseURL) return CONFIG_FIREBASE;
    return null;
  }
  function available() { return !!cfg(); }
  function setConfig(obj) {
    if (obj && obj.databaseURL) localStorage.setItem("tdf_firebase", JSON.stringify(obj));
    else localStorage.removeItem("tdf_firebase");
    ready = false; initPromise = null;
  }
  function getConfig() { return cfg(); }

  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("Failed to load " + src)); document.head.appendChild(s); });
  }

  async function ensure() {
    if (ready) return true;
    const c = cfg(); if (!c) throw new Error("Live sessions are not set up. Add your Firebase details in Settings.");
    if (!initPromise) {
      initPromise = (async () => {
        if (typeof firebase === "undefined") {
          await loadScript(SDK + "firebase-app-compat.js");
          await loadScript(SDK + "firebase-database-compat.js");
        }
        app = (firebase.apps && firebase.apps.length) ? firebase.app() : firebase.initializeApp(c);
        db = firebase.database();
        ready = true;
      })();
    }
    await initPromise; return true;
  }

  const ref = p => db.ref(p);
  function genCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
    let s = ""; for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  async function hostRoom(payload) {
    await ensure();
    let code, tries = 0;
    do { code = genCode(); tries++; } while (await roomExists(code) && tries < 8);
    await ref("rooms/" + code).set({
      meta: payload.meta || {},
      scenario: payload.scenario || {},
      control: { cursor: 0, revealed: false, started: false, finished: false },
      createdAt: Date.now()
    });
    return code;
  }
  async function roomExists(code) { await ensure(); const s = await ref("rooms/" + code + "/meta").get(); return s.exists(); }
  async function getScenario(code) { await ensure(); const s = await ref("rooms/" + code + "/scenario").get(); return s.val(); }
  async function getMeta(code) { await ensure(); const s = await ref("rooms/" + code + "/meta").get(); return s.val(); }

  async function addParticipant(code, profile) {
    await ensure();
    const r = ref("rooms/" + code + "/participants").push();
    await r.set({ ...profile, online: true, joinedAt: Date.now() });
    try { r.onDisconnect().update({ online: false }); } catch (e) {}
    return r.key;
  }
  async function updateParticipant(code, uid, patch) { await ensure(); await ref(`rooms/${code}/participants/${uid}`).update(patch); }
  async function setControl(code, control) { await ensure(); await ref("rooms/" + code + "/control").update(control); }
  async function setAnswer(code, idx, uid, opt) { await ensure(); await ref(`rooms/${code}/answers/${idx}/${uid}`).set(opt); }

  // watch returns an unsubscribe function
  function watch(path, cb) {
    let r;
    ensure().then(() => { r = ref(path); r.on("value", s => cb(s.val())); }).catch(() => {});
    return () => { try { if (r) r.off("value"); } catch (e) {} };
  }

  return { available, setConfig, getConfig, ensure, hostRoom, roomExists, getScenario, getMeta,
           addParticipant, updateParticipant, setControl, setAnswer, watch, genCode };
})();
