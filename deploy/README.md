# Tabletop Drill Facilitator

A self-contained web app for running **structured, scored tabletop security drills** against an
emergency / security plan or procedure — built for ISPS Code Port Facility Security Plans, but
re-brandable for any plan. Register the team, generate a scenario, walk the response
inject-by-inject with an AI voiceover, and produce a **sign-off-ready report** for HSE / internal audit.

It ships pre-loaded with scenarios grounded in the **Spring Garden Terminal PFSP**, but everything
facility-specific lives in one config file so it can be sold/reused as a template.

---

## What it does

1. **Set up** — facilitator + session details, register participants (name, email, role), choose how
   the scenario is generated.
2. **Brief** — situation brief with randomised vessel / cargo / time / conditions, the roles in play,
   and quick-reference contacts & comms channels pulled from the plan.
3. **Run the drill** — each *inject* (decision point) is narrated (and read aloud by the AI voiceover),
   assigned to a responsible role, answered multiple-choice, then the **model answer + plan reference**
   is revealed and points awarded. Everyone is asked; the responsible role's answer is the one scored.
4. **Report** — team score, per-role breakdown, full answer log, attendance, facilitator notes, and a
   **facilitator sign-off** (typed attestation + drawn signature + timestamp). Export as:
   - on-screen summary,
   - **printable PDF** (Report / PDF button → your browser's *Save as PDF*),
   - **JSON** data file (full structured record for auditors),
   - **CSV** answer log (spreadsheet).

Progress auto-saves to the browser, so a refresh mid-drill never loses your place.

---

## Run it locally

It's plain HTML/CSS/JS — no build step. Because it loads several `.js`/`.css` files, open it through a
local web server (not `file://`):

```bash
# from this folder
python3 -m http.server 8080
# then open http://localhost:8080/Tabletop%20Drill%20Facilitator.html
```

---

## Host it (GitHub Pages)

1. Create a repo and add these files (keep the folder structure):
   ```
   Tabletop Drill Facilitator.html
   css/app.css
   js/config.js  js/scenarios.js  js/tts.js  js/ai.js  js/drill.js  js/results.js  js/report.js
   ```
2. Push to GitHub → **Settings → Pages → Build from branch** (`main`, `/root`).
3. Your drill is live at `https://<user>.github.io/<repo>/Tabletop%20Drill%20Facilitator.html`.
   (Tip: rename the HTML to `index.html` for a clean URL.)

## Host it (Cloudflare Pages)

1. **Create a project → Connect to Git** (or drag-and-drop the folder in *Direct Upload*).
2. Framework preset: **None**. Build command: *(none)*. Output directory: `/`.
3. Deploy. Done.

Both are static hosts — no server needed. The pre-built scenarios and the browser voiceover work
fully offline.

---

## Make it your own (selling / re-branding)

Everything facility-specific is in **`js/config.js`** (`DEFAULT_CONFIG`):
organisation & facility name, plan title/reference, PFSO, emergency contacts, comms channels,
security-level descriptions, and the list of **roles**. Edit that file to retarget the template to a
different plan, then write scenarios for it in **`js/scenarios.js`**.

End users can also override branding at runtime via the in-app **Settings** ("backend") panel — org
name, logo, facility, plan reference, voice — stored in their browser. No code needed.

### Scenarios

`js/scenarios.js` holds the library. Each scenario has a `setup`/`synopsis` and an `injects` array;
each inject has narration (`scene`), a `q`uestion, `options`, the `correct` index, a `rationale` and a
plan `ref`erence. Narration supports `{placeholders}` (vessel, cargo, time, wind, craft, …) drawn from
`RANDOM_POOL` so each run varies. Add scenarios by copying the shape of an existing one.

---

## AI voiceover

Uses the **browser's built-in speech synthesis** — free, no key, works offline once a system voice is
installed. Toggle it from the mic button in the top bar; pick a voice and speed in **Settings**.
(Available voices depend on the operating system / browser.)

## Live AI scenario generation (optional)

By default scenarios come from the built-in library. If you want a **brand-new scenario each time**,
the app can call an LLM:

- Inside the Claude artifact environment this works with no setup.
- When **self-hosted**, paste an **Anthropic API key** in *Settings → Live AI generation*. It's stored
  only in the visitor's browser and used to call the API directly. Leave it blank to stay on the
  reliable pre-built library.

---

## Live multi-device sessions (remote meetings)

Two ways to run a drill:

- **Facilitator screen** (default) — one device, projected in the room or screen-shared on a call.
  Works offline, zero setup. **Best for tomorrow / guaranteed reliability.**
- **Live, multi-device** — each participant opens the link on their **own phone/laptop**, enters a
  room code, logs in with their email + name, picks a role, and answers live. The facilitator drives
  the injects and sees every answer in real time. Great for remote/hybrid meetings.

Live mode needs a free **Firebase Realtime Database** (it provides the realtime sync; the site itself
stays static on GitHub/Cloudflare). One-time setup, ~5 minutes:

1. Go to **console.firebase.google.com** → **Add project** (any name) → you can disable Analytics.
2. In the left menu: **Build → Realtime Database → Create Database**. Pick a location, then start in
   **test mode** (fine for drills; see the security note below).
3. Go to **Project settings** (gear icon) → **General** → scroll to **Your apps** → click the **Web**
   icon (`</>`) → register an app. Firebase shows a `const firebaseConfig = { … }` snippet — copy it.
4. In the Drill Facilitator, open **⚙️ Settings → Live multi-device sessions** → paste the whole
   snippet → **Save**. The **"Live — everyone on their own device"** run mode is now enabled.
5. **For a permanent public deployment**, also paste the same config into **`js/config.js`**
   (the `CONFIG_FIREBASE` block at the top) before you upload — that way *every* visitor (your
   participants) can join, not just your browser.

**Running a live drill:** choose *Live* on the setup screen → generate the scenario → you get a
**room code + share link + QR**. Participants open the link (or tap *"Joining on your own device?"* and
enter the code), log in, and appear in your lobby. Hit **Start the drill** and drive as normal — the
per-person answers fill in live and flow straight into the scored report.

> **Security note:** test-mode rules leave the database open. For ongoing use, lock it down in
> Firebase → Realtime Database → **Rules** (e.g. require the room to exist, limit writes to
> `rooms/{code}`). Firebase web config keys are *meant* to be public — they're safe to ship in
> `config.js`; your data protection comes from the Rules.

## Scoring: team vs. individual

On the setup screen, **"Capture each person's answer"** records an individual response from every
participant on each inject and adds a **per-person competency table** to the report (who answered what,
how many correct, a personal %). It's automatically on in live mode (everyone answers on their own
device). Leave it off for a single team answer per inject. Either way you get the team score and the
per-role breakdown.

---

## File map

| File | Purpose |
|---|---|
| `Tabletop Drill Facilitator.html` | App shell, loads everything |
| `css/app.css` | Theme + layout |
| `js/config.js` | **Facility/plan config + Firebase config — edit to re-brand** |
| `js/scenarios.js` | **Scenario library — edit/add scenarios** |
| `js/sync.js` | Realtime backend (Firebase) for live multi-device sessions |
| `js/participant.js` | Live join / lobby / participant screens |
| `js/tts.js` | Voiceover (browser speech synthesis) |
| `js/ai.js` | Optional live AI generation |
| `js/app.js` | State, routing, Home / Setup / Brief / Settings |
| `js/drill.js` | Inject-by-inject play-through + scoring |
| `js/results.js` | Scoreboard, sign-off, attendance |
| `js/report.js` | Print/PDF + JSON + CSV exports |
