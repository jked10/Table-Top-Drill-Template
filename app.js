/* ============================================================
   ai.js — OPTIONAL live scenario generation.
   Two paths:
     1. Inside the Claude artifact environment, window.claude.complete
        is available (no key needed).
     2. When self-hosted, a buyer can paste their own Anthropic API
        key in Settings; we call the API directly from the browser
        with the direct-browser-access header.
   If neither is available, the app silently uses the pre-baked
   library. Live generation is best-effort and validated before use.
   ============================================================ */

const AI = (() => {

  function hasBuiltIn() { return !!(window.claude && typeof window.claude.complete === "function"); }
  function userKey() { return (localStorage.getItem("tdf_anthropic_key") || "").trim(); }
  function available() { return hasBuiltIn() || !!userKey(); }

  function buildPrompt(cfg, procedureText, opts) {
    const roleList = cfg.roles.map(r => `${r.id} = ${r.name} (${r.desc})`).join("\n");
    const diff = opts.difficulty || "standard";
    const diffGuide = {
      easy:     "DIFFICULTY = EASY. The best option should be clearly correct and the three wrong options recognisably poor. Give exactly 4 options.",
      standard: "DIFFICULTY = STANDARD. Make the wrong options genuinely plausible so the responsible role must actually know the plan to choose well. Give exactly 4 options.",
      hard:     "DIFFICULTY = HARD. Make ALL options sound defensible; the distinction between them must be subtle (timing, correct sequence, who has authority, who to notify first, what to do before what). Avoid any obviously-wrong or absurd option. Give exactly 5 options."
    }[diff] || "DIFFICULTY = STANDARD. Make the wrong options plausible. Give exactly 4 options.";
    const facilityType = cfg.facility.type || "organisation";
    const planExtract = (procedureText || "").trim();
    const planBlock = planExtract
      ? `PROCEDURE EXTRACT (ground every model answer in THIS text and cite its sections in "ref"):\n"""${planExtract.slice(0, 9000)}"""`
      : `No procedure text was provided. Base model answers on widely-accepted good practice appropriate to the setting above, and keep "ref" generic.`;
    const focus = (opts.focus || "").trim();
    const focusBlock = focus
      ? `\nFOCUS: Build the ENTIRE scenario around this specific situation/response: "${focus}". Every inject must relate to handling this. Draw the correct actions from the matching part of the procedure extract.`
      : "";
    const planTitle = cfg.facility.planTitle || "the procedure";

    return `You are a tabletop-exercise designer. Invent ONE fresh, elaborate, realistic tabletop drill scenario tailored to the SPECIFIC organisation and procedure described below. Honour the setting and procedure exactly — do not assume an industry that isn't described.

SETTING: ${facilityType}
ORGANISATION: ${cfg.facility.name || "(unnamed)"}${cfg.facility.location?", "+cfg.facility.location:""}. Procedure: ${planTitle}.${focusBlock}

AVAILABLE ROLES (use these exact ids for "role"):
${roleList}

${planBlock}

${diffGuide}

Produce a JSON object ONLY (no prose, no markdown fences) with this exact shape:
{
 "title": "short scenario title",
 "category": "situation category",
 "startLevel": 1,
 "synopsis": "1-2 sentence overview",
 "setup": "2-3 sentence situation brief, present tense, specific to this organisation",
 "injects": [
   {
     "phase": "Detection|Notification|Assessment|Response|Escalation|Recovery",
     "role": "<one role id from the list>",
     "scene": "2-3 sentences of escalating narration",
     "q": "the decision question for the responsible role",
     "options": ["the single best option", "wrong/weaker option", "wrong/weaker option", "wrong/weaker option"],
     "correct": 0,
     "rationale": "why, citing what the procedure requires",
     "ref": "procedure section reference",
     "points": 10
   }
 ]
}
Rules: exactly ${opts.count} injects, progressing through the phases in order; vary the responsible role across injects; the correct option must reflect the procedure. ALWAYS put the single best option FIRST with "correct": 0 (the app reshuffles option order itself). Keep options concise. Return ONLY the JSON object.`;
  }

  async function callBuiltIn(prompt) {
    const txt = await window.claude.complete({ messages: [{ role: "user", content: prompt }] });
    return txt;
  }

  async function callAnthropic(prompt) {
    const key = userKey();
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!res.ok) throw new Error("API " + res.status);
    const data = await res.json();
    return (data.content && data.content[0] && data.content[0].text) || "";
  }

  function extractJSON(text) {
    if (!text) throw new Error("empty");
    let t = text.trim().replace(/^```(json)?/i, "").replace(/```$/,"").trim();
    const start = t.indexOf("{"); const end = t.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("no json");
    return JSON.parse(t.slice(start, end + 1));
  }

  function validate(s, cfg) {
    if (!s || !Array.isArray(s.injects) || !s.injects.length) throw new Error("no injects");
    const ids = new Set(cfg.roles.map(r => r.id));
    s.injects = s.injects.filter(inj =>
      inj && Array.isArray(inj.options) && inj.options.length >= 2 &&
      typeof inj.correct === "number" && inj.q && inj.scene
    ).map(inj => ({
      phase: inj.phase || "Response",
      role: ids.has(inj.role) ? inj.role : cfg.roles[0].id,
      scene: inj.scene, q: inj.q,
      options: inj.options.slice(0, 6),
      correct: Math.max(0, Math.min(inj.correct, inj.options.length - 1)),
      partial: [],
      rationale: inj.rationale || "",
      ref: inj.ref || "PFSP",
      points: inj.points || 10
    }));
    if (!s.injects.length) throw new Error("no valid injects");
    s.id = "ai-" + Date.now();
    s.generated = true;
    return s;
  }

  async function generate(cfg, procedureText, opts = {}) {
    const prompt = buildPrompt(cfg, procedureText, { count: opts.count || 10, difficulty: opts.difficulty, focus: opts.focus });
    let text;
    if (hasBuiltIn()) text = await callBuiltIn(prompt);
    else if (userKey()) text = await callAnthropic(prompt);
    else throw new Error("AI not available");
    const parsed = extractJSON(text);
    return validate(parsed, cfg);
  }

  function setKey(k) { localStorage.setItem("tdf_anthropic_key", (k || "").trim()); }
  function getKey() { return userKey(); }

  // ---- generate a set of response roles from the uploaded procedure ----
  function buildRolesPrompt(cfg, procedureText) {
    const setting = cfg.facility.type || cfg.facility.name || "the organisation";
    const extract = (procedureText || "").trim().slice(0, 9000);
    const block = extract
      ? `PROCEDURE EXTRACT:\n"""${extract}"""`
      : `No procedure text was provided; infer sensible roles for the setting.`;
    return `You design tabletop exercises. From the procedure below, identify the distinct PEOPLE / POSITIONS who have responsibilities during the response — the roles a facilitator would assign to participants and score.

SETTING: ${setting}
${block}

Return a JSON array ONLY (no prose, no markdown) of 5-9 roles, most senior/important first, each:
{ "name": "full role title", "short": "1-2 word label", "desc": "one sentence on what they do during the response" }
Use the titles the procedure actually uses. Return ONLY the JSON array.`;
  }

  function slug(name, taken) {
    let base = (name || "role").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 24) || "role";
    let id = base, n = 2;
    while (taken.has(id)) { id = base + "_" + n; n++; }
    taken.add(id);
    return id;
  }

  // ---- generate a MENU of specific scenarios (stubs) from the procedure ----
  function buildMenuPrompt(cfg, procedureText, count) {
    const setting = cfg.facility.type || cfg.facility.name || "the organisation";
    const extract = (procedureText || "").trim().slice(0, 11000);
    const block = extract ? `PROCEDURE EXTRACT:\n"""${extract}"""` : `No procedure text was provided; infer sensible scenarios for the setting.`;
    return `You design tabletop exercises. From the procedure below, identify the distinct EMERGENCIES / INCIDENTS / SITUATIONS it covers that a team should rehearse — the specific events this document tells people how to handle.

SETTING: ${setting}
${block}

Return a JSON array ONLY (no prose, no markdown) of ${count} distinct scenarios actually covered by this procedure, each:
{ "title": "short scenario title", "category": "type of incident", "synopsis": "1-2 sentence description of the situation" }
Base them on what the procedure actually addresses — do not invent unrelated incident types. Return ONLY the JSON array.`;
  }

  async function generateScenarioMenu(cfg, procedureText, opts = {}) {
    const count = opts.count || 10;
    const prompt = buildMenuPrompt(cfg, procedureText, count);
    let text;
    if (hasBuiltIn()) text = await callBuiltIn(prompt);
    else if (userKey()) text = await callAnthropic(prompt);
    else throw new Error("AI not available");
    let t = (text || "").trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    const start = t.indexOf("["), end = t.lastIndexOf("]");
    if (start === -1 || end === -1) throw new Error("no json");
    const arr = JSON.parse(t.slice(start, end + 1));
    if (!Array.isArray(arr) || !arr.length) throw new Error("empty");
    return arr.filter(s => s && s.title).slice(0, 16).map(s => ({
      title: String(s.title).slice(0, 90),
      category: String(s.category || "").slice(0, 40),
      synopsis: String(s.synopsis || "").slice(0, 240)
    }));
  }

  async function generateRoles(cfg, procedureText) {
    const prompt = buildRolesPrompt(cfg, procedureText);
    let text;
    if (hasBuiltIn()) text = await callBuiltIn(prompt);
    else if (userKey()) text = await callAnthropic(prompt);
    else throw new Error("AI not available");
    let t = (text || "").trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    const start = t.indexOf("["), end = t.lastIndexOf("]");
    if (start === -1 || end === -1) throw new Error("no json");
    const arr = JSON.parse(t.slice(start, end + 1));
    if (!Array.isArray(arr) || !arr.length) throw new Error("empty");
    const taken = new Set();
    return arr.filter(r => r && r.name).slice(0, 12).map(r => ({
      id: slug(r.name, taken),
      name: String(r.name).slice(0, 80),
      short: String(r.short || r.name).slice(0, 20),
      desc: String(r.desc || "").slice(0, 200)
    }));
  }

  return { available, hasBuiltIn, generate, generateRoles, generateScenarioMenu, setKey, getKey };
})();
