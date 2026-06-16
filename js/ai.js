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
    return `You are an ISPS Code tabletop-exercise designer. Using ONLY the facility's security plan below, invent ONE fresh, elaborate, realistic tabletop drill scenario for a marine fuel terminal.

FACILITY: ${cfg.facility.name}, ${cfg.facility.location}. Plan: ${cfg.facility.planTitle}.

AVAILABLE ROLES (use these exact ids for "role"):
${roleList}

PLAN EXTRACT (ground every model answer in this):
"""${(procedureText || "").slice(0, 6000)}"""

Produce a JSON object ONLY (no prose, no markdown fences) with this exact shape:
{
 "title": "short scenario title",
 "category": "threat category",
 "startLevel": 1,
 "synopsis": "1-2 sentence overview",
 "setup": "2-3 sentence situation brief, present tense",
 "injects": [
   {
     "phase": "Detection|Notification|Assessment|Response|Escalation|Recovery",
     "role": "<one role id from the list>",
     "scene": "2-3 sentences of escalating narration",
     "q": "the decision question for the responsible role",
     "options": ["correct best-practice option","plausible wrong option","plausible wrong option","plausible wrong option"],
     "correct": 0,
     "rationale": "why, citing what the plan requires",
     "ref": "plan section reference",
     "points": 10
   }
 ]
}
Rules: exactly ${opts.count} injects, progressing through the phases in order; vary the responsible role across injects; the correct option must reflect the plan; keep options concise; shuffle which index is correct across injects. Return ONLY the JSON object.`;
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
      options: inj.options.slice(0, 4),
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
    const prompt = buildPrompt(cfg, procedureText, { count: opts.count || 10 });
    let text;
    if (hasBuiltIn()) text = await callBuiltIn(prompt);
    else if (userKey()) text = await callAnthropic(prompt);
    else throw new Error("AI not available");
    const parsed = extractJSON(text);
    return validate(parsed, cfg);
  }

  function setKey(k) { localStorage.setItem("tdf_anthropic_key", (k || "").trim()); }
  function getKey() { return userKey(); }

  return { available, hasBuiltIn, generate, setKey, getKey };
})();
