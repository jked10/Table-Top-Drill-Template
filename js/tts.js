/* ============================================================
   tts.js — AI voiceover via the browser's built-in
   SpeechSynthesis. No API key, works offline once a voice is
   installed. Reads narration, questions and options aloud so
   in-room and remote participants stay engaged.
   ============================================================ */

const TTS = (() => {
  const synth = window.speechSynthesis;
  let voices = [];
  let preferredVoice = null;
  let enabled = JSON.parse(localStorage.getItem("tdf_tts_on") ?? "true");
  let rate = parseFloat(localStorage.getItem("tdf_tts_rate") || "0.98");
  let listeners = [];

  function notify(state) { listeners.forEach(fn => fn(state)); }
  function onState(fn) { listeners.push(fn); }

  function pickVoice() {
    voices = synth ? synth.getVoices() : [];
    if (!voices.length) return;
    const savedURI = localStorage.getItem("tdf_tts_voice");
    if (savedURI) {
      const v = voices.find(v => v.voiceURI === savedURI);
      if (v) { preferredVoice = v; return; }
    }
    // Prefer a natural English voice
    const prefs = [
      v => /en[-_]GB/i.test(v.lang) && /natural|enhanced|premium/i.test(v.name),
      v => /natural|enhanced|premium/i.test(v.name) && /^en/i.test(v.lang),
      v => /Google US English|Google UK English/i.test(v.name),
      v => /^en[-_]GB/i.test(v.lang),
      v => /^en/i.test(v.lang),
      v => true
    ];
    for (const test of prefs) { const v = voices.find(test); if (v) { preferredVoice = v; break; } }
  }

  if (synth) {
    pickVoice();
    synth.onvoiceschanged = pickVoice;
  }

  function strip(text) {
    return String(text || "")
      .replace(/§/g, "section ")
      .replace(/PFSP/g, "P F S P")
      .replace(/SSAS/g, "S S A S")
      .replace(/PFSO/g, "P F S O")
      .replace(/SSO/g, "S S O")
      .replace(/DoS/g, "Declaration of Security")
      .replace(/\bDA\b/g, "Designated Authority")
      .replace(/\bCCTV\b/g, "C C T V")
      .replace(/\bVHF\b/g, "V H F")
      .replace(/\bUHF\b/g, "U H F")
      .replace(/\bBDF\b/g, "B D F")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Speak an array of segments in order; resolves when done.
  function speak(segments) {
    if (!synth) return Promise.resolve();
    cancel();
    if (!enabled) return Promise.resolve();
    const parts = (Array.isArray(segments) ? segments : [segments]).filter(Boolean);
    notify("speaking");
    return new Promise(resolve => {
      let i = 0;
      const next = () => {
        if (i >= parts.length) { notify("idle"); resolve(); return; }
        const u = new SpeechSynthesisUtterance(strip(parts[i]));
        if (preferredVoice) u.voice = preferredVoice;
        u.rate = rate; u.pitch = 1.0; u.volume = 1.0;
        u.onend = () => { i++; next(); };
        u.onerror = () => { i++; next(); };
        synth.speak(u);
      };
      next();
    });
  }

  function cancel() { if (synth) { synth.cancel(); } notify("idle"); }
  function isEnabled() { return enabled; }
  function setEnabled(v) {
    enabled = v; localStorage.setItem("tdf_tts_on", JSON.stringify(v));
    if (!v) cancel();
  }
  function setRate(r) { rate = r; localStorage.setItem("tdf_tts_rate", String(r)); }
  function getRate() { return rate; }
  function getVoices() { if (synth && !voices.length) pickVoice(); return voices; }
  function setVoice(uri) { localStorage.setItem("tdf_tts_voice", uri); pickVoice(); }
  function currentVoice() { return preferredVoice; }
  function supported() { return !!synth; }

  return { speak, cancel, isEnabled, setEnabled, setRate, getRate, getVoices, setVoice, currentVoice, supported, onState };
})();
