/* ============================================================
   scenarios.js — Pre-baked tabletop exercise library.
   Every scenario, question and "model answer" is grounded in
   the facility's PFSP (ISPS Code). Narration strings support
   {placeholders} filled from RANDOM_POOL at runtime so each
   run is varied. `role` = the primarily-responsible role for
   scoring; all participants are asked, but that role's answer
   is the one recorded.
   ============================================================ */

const RANDOM_POOL = {
  vessel: ["MT Caribbean Trader","MT Atlantic Pioneer","MT Bridgetown Star","MT Sargasso","MT Windward Spirit","MT Petrel","MT Coral Galaxy","MT Speightstown"],
  cargo:  ["unleaded gasoline","gasoil","automotive diesel","jet A-1 aviation fuel","fuel oil"],
  flag:   ["Panama","Liberia","Marshall Islands","Singapore","Malta"],
  time:   ["02:40","23:15","19:50","05:30","21:05","14:20"],
  wind:   ["a light easterly breeze","a fresh 18-knot trade wind","near-calm conditions","gusty 25-knot squalls","a moderate onshore swell"],
  craft:  ["an unlit go-fast skiff","a small open fishing pirogue","an unmarked RIB","a jet-ski","a wooden fishing boat with no lights"],
  plate:  ["a white panel van","a dark SUV with tinted windows","an unmarked grey pickup","a taxi with no roof light"]
};

// Convenience: phase labels used in the timeline rail.
const PHASES = ["Detection","Notification","Assessment","Response","Escalation","Recovery"];

const SCENARIOS = [
  /* ========================================================
     1 — WATERSIDE INTRUSION DURING DISCHARGE
     ======================================================== */
  {
    id: "waterside-intrusion",
    title: "Unidentified Craft Approaching the Berth",
    category: "Waterside intrusion",
    startLevel: 1,
    synopsis: "During an overnight cargo transfer, the contracted tender spots an unidentified small craft making a deliberate approach toward the shore connection and the berthed tanker.",
    setup: "It is {time}. {vessel} ({flag} flag) is alongside discharging {cargo} through the floating hose. Conditions: {wind}. The contracted tender is patrolling the waterside; the control room is monitoring CCTV. Security Level 1 is in force.",
    injects: [
      {
        phase: "Detection", role: "boatman",
        scene: "From the tender, the boatman sights {craft} approaching from seaward at speed, on a line toward the floating hose and the tanker's offshore side. It is not responding to lights.",
        q: "As the contracted tender, what is your FIRST action?",
        options: [
          "Maintain constant communication: immediately report the contact to the PFSO-certified operator by radio with position, heading and description, and keep observing.",
          "Intercept and physically block the craft to force it away from the hose.",
          "Do nothing until the craft comes within 50 metres \u2014 it may just be a fisherman.",
          "Leave the patrol line and pursue the craft out to sea."
        ],
        correct: 0, partial: [],
        rationale: "The contracted tender's duties are monitoring the waterside and TIMELY reporting in constant communication with the PFSO-certified operators \u2014 not interception or pursuit. Report first; observe; let command decide.",
        ref: "PFSP \u00a73.3 (Duties of contracted tenders)", points: 10
      },
      {
        phase: "Notification", role: "control_room",
        scene: "The tender's report reaches the control room over UHF. The primary radio channel is busy with cargo traffic.",
        q: "As Control Room Operator, how do you handle the communication and the record?",
        options: [
          "Log the time and details, then immediately relay to the PFSO and Loading Master; if the radio is disrupted, fall back through the sequence: radio \u2192 cellular \u2192 landline.",
          "Wait for the cargo radio traffic to finish before passing anything on.",
          "Broadcast a general alarm to the whole terminal at once.",
          "Note it in the log and review it at the next shift handover."
        ],
        correct: 0, partial: [],
        rationale: "The duty operator logs the information and relays it to all relevant personnel without delay; if one means of communication is disrupted the next in sequence is used (radio \u2192 cellular \u2192 landline \u2192 internet \u2192 messenger).",
        ref: "PFSP \u00a72.4 & \u00a78 (Communication sequence)", points: 10
      },
      {
        phase: "Assessment", role: "pfso",
        scene: "You, the PFSO, receive the report: an unidentified craft on a deliberate approach to a tanker discharging {cargo}, at {time}.",
        q: "What is the correct command decision at this point?",
        options: [
          "Treat it as a potential security incident: direct the response, alert the ship (SSO), and prepare to notify Police and the Coast Guard \u2014 you may raise local measures even before the DA changes the level.",
          "Stand down \u2014 only the Designated Authority can authorise any change in posture.",
          "Order the tender to ram the craft.",
          "Continue the discharge unchanged and reassess in the morning."
        ],
        correct: 0, partial: [],
        rationale: "Following an incident or security deficiency, the PFSO can change the level of security / initiate measures as deemed necessary without waiting for the DA. The PFSO directs the response and coordinates with the ship and authorities.",
        ref: "PFSP \u00a75.1 & \u00a73.3 (PFSO authority)", points: 10
      },
      {
        phase: "Response", role: "loading_master",
        scene: "The PFSO declares a security response. The craft is now ~200 m off and still closing on the offshore side of {vessel}.",
        q: "As Loading Master, what do you do with the cargo transfer?",
        options: [
          "Prepare to suspend and safely shut down the transfer on the PFSO's direction, ready the emergency release, and confirm the line is in a safe state.",
          "Keep discharging at full rate \u2014 stopping costs money and demurrage.",
          "Disconnect the hose immediately by opening the coupling under pressure.",
          "Hand control of the transfer to the ship and leave the jetty."
        ],
        correct: 0, partial: [],
        rationale: "The Loading Master / operators are responsible for the safe and successful control of the discharge, including suspending it and bringing the line to a safe state when security or safety requires \u2014 never an uncontrolled disconnection under pressure.",
        ref: "PFSP \u00a73.3 (Operator duties)", points: 10
      },
      {
        phase: "Response", role: "chief_jetty",
        scene: "On the jetty, you must protect the shore connection \u2014 a restricted area marked only by signage and a locked gate in an otherwise public space.",
        q: "As Chief Jetty Man, what is the appropriate action for the restricted shore connection?",
        options: [
          "Confirm the gate is secured/locked, account for personnel on the jetty, keep clear of the waterside edge, and report status to the PFSO \u2014 do not attempt to engage the craft.",
          "Arm the jetty crew and prepare to repel boarders.",
          "Open the gate so people can flee inland in any direction.",
          "Walk to the seaward edge to film the approaching craft up close."
        ],
        correct: 0, partial: [],
        rationale: "Access points to restricted areas are secured/locked and monitored; personnel protect the area and report. Firearms are prohibited at the facility and staff do not engage \u2014 that is for law enforcement.",
        ref: "PFSP \u00a75.6 (Restricted areas) & \u00a75.5 (Firearms)", points: 10
      },
      {
        phase: "Escalation", role: "chief_officer",
        scene: "The craft is now very close to {vessel}'s offshore side. The ship's watch has also seen it.",
        q: "As the ship's Chief Officer / SSO interface, what should the ship do, coordinated with the facility?",
        options: [
          "Implement ship-side security measures, alert the ship's crew/deck watch, and coordinate by the previously agreed secure radio channel with the PFSO \u2014 and be ready to activate the SSAS if a threat materialises.",
          "Single up and leave the berth immediately with the hose still connected.",
          "Ignore it \u2014 waterside security is entirely the port's problem.",
          "Send unarmed crew down to the waterline in the ship's boat to investigate."
        ],
        correct: 0, partial: [],
        rationale: "Ship and facility coordinate security by the previously agreed secure communications channel; the ship implements its own measures and the SSAS exists for exactly this kind of threat. Departing with the hose connected would cause a major spill.",
        ref: "PFSP \u00a74.1 & \u00a74.6 (Ship interface / SSAS)", points: 10
      },
      {
        phase: "Escalation", role: "pfso",
        scene: "You judge this a credible threat to a loaded tanker and the facility.",
        q: "Who does the PFSO notify, and in what spirit?",
        options: [
          "Notify the Barbados Police Service, the Barbados Defence Force / Coast Guard and the Port Controller as soon as possible, recording times and who received each report; initiate the incident command structure.",
          "Notify only head office and wait for their PR guidance.",
          "Notify no one externally to avoid alarming the public.",
          "Post about the contact on the company's social media to warn others."
        ],
        correct: 0, partial: [],
        rationale: "The PFSO/Terminal Supervisor initiates the incident command system and notifies the Police, Defence Force and Port Controller as soon as possible; times of reporting and identities of those receiving reports are recorded in the security log.",
        ref: "PFSP \u00a72.4 (Reporting security incidents)", points: 10
      },
      {
        phase: "Response", role: "coast_guard",
        scene: "The Coast Guard / BDF is now engaged and inbound. The craft has slowed and is loitering 100 m off the berth.",
        q: "What is the appropriate division of responsibility now?",
        options: [
          "Waterside law enforcement and any use of force is for the Coast Guard / police; the facility supports with information, lighting and access \u2014 staff continue to observe and report, not intercept.",
          "The jetty crew should board the tender and conduct the arrest themselves.",
          "The facility should switch off all lighting so the craft can't see the jetty.",
          "Everyone should evacuate and leave the berth and ship completely unobserved."
        ],
        correct: 0, partial: [],
        rationale: "At a heightened/level-3 posture outside authorities take control of the situation; the facility cooperates and supports. Increasing lighting (not killing it) and maintaining observation aids the response.",
        ref: "PFSP \u00a75.1 (Level 3) & \u00a75.6 (Surveillance/lighting)", points: 10
      },
      {
        phase: "Recovery", role: "control_room",
        scene: "The Coast Guard intercepts and detains the craft \u2014 it turns out to be probing the facility's response. The threat is cleared after 40 minutes.",
        q: "As Control Room Operator, what must be captured for the record?",
        options: [
          "A full incident record: date/time, location within the facility and port, description of the incident, who observed it, to whom it was reported, and the response taken.",
          "Just a one-line note: 'boat came near, gone now'.",
          "Nothing \u2014 since no damage occurred there is no incident.",
          "Only the cargo figures; security details are confidential and not recorded."
        ],
        correct: 0, partial: [],
        rationale: "Records of incidents/breaches must contain date and time, location within the facility and port, an incident description, by whom observed, to whom reported, and a description of the response \u2014 kept for two years.",
        ref: "PFSP \u00a73.4 (Records & documentation)", points: 10
      },
      {
        phase: "Recovery", role: "pfso",
        scene: "Operations are stable. The DA asks for a debrief and the auditor will want the drill on file.",
        q: "What does the PFSO do to close out and learn from the event?",
        options: [
          "Document the event and lessons learned, debrief the team, and feed any weaknesses into a review/update of the PFSP \u2014 a security incident is a trigger for plan review.",
          "Consider it closed once the craft is gone; no follow-up needed.",
          "Delete the CCTV to protect privacy.",
          "Wait for the annual audit before doing anything."
        ],
        correct: 0, partial: [],
        rationale: "Review and updating of the PFSP is performed following a security incident (as well as after audits and at least annually); lessons learned are part of the drill/exercise record.",
        ref: "PFSP \u00a72.2 & \u00a73.4", points: 10
      }
    ]
  },

  /* ========================================================
     2 — TELEPHONE BOMB THREAT
     ======================================================== */
  {
    id: "bomb-threat",
    title: "Telephone Bomb Threat to the Terminal",
    category: "Bomb threat",
    startLevel: 1,
    synopsis: "A caller phones the terminal office claiming a device has been placed at the facility during an active cargo transfer.",
    setup: "It is {time}. {vessel} is alongside discharging {cargo}. A call comes in to the terminal landline. The caller states a device will detonate 'within the hour' and hangs up. Conditions: {wind}.",
    injects: [
      {
        phase: "Detection", role: "control_room",
        scene: "You take the call. The caller is agitated and speaks for about 30 seconds.",
        q: "As the person receiving the threat, what should you do DURING and immediately after the call?",
        options: [
          "Keep them talking and capture as much as possible \u2014 gender, voice pitch, accent, background noises, exact wording, any time/location given \u2014 then immediately inform the PFSO and the ship (SSO).",
          "Hang up at once and say nothing to anyone until you're sure it's real.",
          "Transfer the caller to head office switchboard and forget it.",
          "Pull the fire alarm before noting anything down."
        ],
        correct: 0, partial: [],
        rationale: "For telephone threats the plan says: take as much information from the caller as possible \u2014 gender, voice pitch, background noises \u2014 and immediately inform the PFSO and SSO.",
        ref: "PFSP \u00a77.1 (Incident response chart)", points: 10
      },
      {
        phase: "Notification", role: "control_room",
        scene: "The call has ended. You have your notes.",
        q: "Who is notified, and how is it logged?",
        options: [
          "Report directly and immediately to the Police (211) and the PFSO/Terminal Supervisor by the fastest means; log the information and relay it to other personnel as appropriate.",
          "Email the PFSO and wait for a reply before doing anything else.",
          "Tell only the loading master and keep the threat off the record.",
          "Notify the press so the public can take cover."
        ],
        correct: 0, partial: [],
        rationale: "The person first aware of a threat reports directly and immediately to the Police and Terminal Supervisor by the fastest means; the duty operator logs and relays the information.",
        ref: "PFSP \u00a72.4 & \u00a77.1 (Police 211)", points: 10
      },
      {
        phase: "Assessment", role: "pfso",
        scene: "You, the PFSO, now own the incident. A loaded tanker is alongside; a device may or may not exist.",
        q: "What is your first command priority?",
        options: [
          "Initiate the incident command structure, assess the credibility/threat, and direct safe shutdown and (if warranted) evacuation \u2014 protecting life takes priority over the cargo.",
          "Order everyone to search for the device by hand before stopping the transfer.",
          "Carry on discharging and treat it as a hoax without assessing it.",
          "Evacuate so fast that the cargo transfer is abandoned mid-flow with valves open."
        ],
        correct: 0, partial: [],
        rationale: "The Terminal Supervisor/PFSO initiates an incident command structure immediately and directs the response; evacuation occurs where it enhances safety \u2014 but the line must be brought to a safe state, not abandoned open.",
        ref: "PFSP \u00a72.4 & \u00a77.2", points: 10
      },
      {
        phase: "Response", role: "loading_master",
        scene: "The PFSO orders preparations to shut down and stand off.",
        q: "As Loading Master / with the Tank Farm Operator, what is the correct shutdown sequence?",
        options: [
          "Follow the controlled shutdown in the Terminal Emergency Plan: stop pumps, close valves and isolate the line so the pipeline and tanks are in a safe state before anyone moves.",
          "Leave everything running and just walk away from the jetty.",
          "Crack the hose coupling to relieve pressure onto the deck.",
          "Open all tank valves to 'drain the system' quickly."
        ],
        correct: 0, partial: [],
        rationale: "Shut-down procedures are governed by the Terminal Emergency Plan (TEP); critical equipment, valves and piping must be isolated and left safe. Operators are responsible for the safe control of the transfer.",
        ref: "PFSP \u00a77.2 (Shutdown / TEP) & \u00a73.3", points: 10
      },
      {
        phase: "Response", role: "chief_jetty",
        scene: "The order to evacuate the jetty is given. Evacuation routes are posted throughout the property.",
        q: "As Chief Jetty Man, how do you run the evacuation and muster?",
        options: [
          "Move personnel along the posted evacuation routes to the muster point, account for everyone, and report the head-count \u2014 deviating from a route only if that is clearly safer.",
          "Tell everyone to run individually in whatever direction feels safest and meet up later.",
          "Search lockers and toilets for the bomb before allowing anyone to leave.",
          "Keep working \u2014 evacuation will slow the discharge."
        ],
        correct: 0, partial: [],
        rationale: "Evacuation routes are posted throughout the property and are deviated from only if alternate routes enhance safety; mustering and reporting follow the TEP, and a head-count is essential.",
        ref: "PFSP \u00a72.4 & \u00a77.2 (Evacuation)", points: 10
      },
      {
        phase: "Response", role: "chief_officer",
        scene: "The threat may extend to {vessel}. The ship must protect itself.",
        q: "What should the ship (Chief Officer / SSO) do, coordinated with the facility?",
        options: [
          "Coordinate with the PFSO on the agreed secure channel, implement the ship's own security/emergency measures, and prepare the ship to disconnect and stand off SAFELY if directed.",
          "Order an immediate emergency breakaway with the hose still connected and pumps running.",
          "Send crew ashore to help search the terminal for the device.",
          "Take no action \u2014 a shore threat is not the ship's concern."
        ],
        correct: 0, partial: [],
        rationale: "Ship and facility coordinate by the agreed secure channel; the ship implements its own measures. Any breakaway must be a safe, controlled disconnection \u2014 never with pumps running and the line open.",
        ref: "PFSP \u00a74.1 (Exchange of information)", points: 10
      },
      {
        phase: "Escalation", role: "police",
        scene: "The Police arrive on scene. There is no posted guard and the shore connection sits in a public space.",
        q: "What is the appropriate handling once law enforcement is on scene?",
        options: [
          "Police lead the search/clearance and any law-enforcement action; the facility hands over information, site access and a description of the threat, and supports their direction.",
          "The jetty crew should conduct the bomb search themselves to save time.",
          "Refuse the Police entry because the plan is confidential.",
          "Let the Police take over the cargo pumps and resume discharge."
        ],
        correct: 0, partial: [],
        rationale: "For suspect devices the facility notifies law enforcement and does not disturb anything; outside authorities lead. The facility supports with access and information and complies with their instructions.",
        ref: "PFSP \u00a77.1 (Suspicious package) & \u00a75.1 (Level 3)", points: 10
      },
      {
        phase: "Escalation", role: "pfso",
        scene: "Given a credible threat to a fuel terminal, you consider the security posture.",
        q: "What is a defensible decision on security level?",
        options: [
          "Apply Level 2/3 measures locally as the situation demands and stay in continuous contact with the Designated Authority \u2014 the DA sets the formal level but the PFSO can act on heightened measures immediately.",
          "Do nothing about levels \u2014 levels are only an annual paperwork exercise.",
          "Declare Level 3 publicly on the radio so everyone in the harbour hears.",
          "Drop to Level 1 to keep operations smooth."
        ],
        correct: 0, partial: [],
        rationale: "The DA determines the formal level, but following an incident the PFSO can change the posture as necessary and must maintain continuous contact with the DA (e.g. facility status calls at Level 3).",
        ref: "PFSP \u00a75.1 & \u00a75.4", points: 10
      },
      {
        phase: "Recovery", role: "pfso",
        scene: "After 90 minutes the Police declare the area clear \u2014 the threat is assessed as a hoax intended to disrupt operations.",
        q: "What is required before resuming, and for the record?",
        options: [
          "Confirm the all-clear from authorities, brief the team, complete the threat and incident records (time, how communicated, who received it, response), then resume the transfer under controlled conditions.",
          "Resume discharge the instant the caller's hour is up.",
          "Skip the paperwork since it was 'only a hoax'.",
          "Resume without telling the ship the all-clear was given."
        ],
        correct: 0, partial: [],
        rationale: "Reports of security threats must record date/time, how the threat was communicated, who received/identified it, a description and the response. Resume only on a confirmed all-clear, under control, with the ship informed.",
        ref: "PFSP \u00a73.4 (Reports of security threats)", points: 10
      },
      {
        phase: "Recovery", role: "control_room",
        scene: "The HSE department and internal auditor will review the event.",
        q: "What documentation closes the loop?",
        options: [
          "A complete, time-stamped security log and incident report, the threat record, and lessons learned \u2014 retained for two years and available to the Designated Authority on request.",
          "A verbal account at the next toolbox talk only.",
          "Nothing \u2014 the call recording is enough on its own.",
          "A note to delete all records after a week to save space."
        ],
        correct: 0, partial: [],
        rationale: "The PFSO maintains incident, threat and drill records for two years and makes them available to the DA; lessons learned feed the plan review.",
        ref: "PFSP \u00a73.4 & \u00a72.2", points: 10
      }
    ]
  },

  /* ========================================================
     3 — SHIP SECURITY ALERT SYSTEM (SSAS) ACTIVATION
     ======================================================== */
  {
    id: "ssas",
    title: "Ship Security Alert System Activated at the Berth",
    category: "SSAS / armed threat",
    startLevel: 1,
    synopsis: "The berthed tanker covertly activates its Ship Security Alert System, indicating a possible boarding or armed threat onboard while alongside the facility.",
    setup: "It is {time}. {vessel} ({flag}) is alongside, part-way through discharging {cargo}. The company receives an SSAS alert from the ship. There is no overt sign of trouble on deck. Conditions: {wind}.",
    injects: [
      {
        phase: "Detection", role: "pfso",
        scene: "You are informed the ship's SSAS has been activated. The alert is covert \u2014 the ship may not be able to speak freely.",
        q: "As PFSO, what is your FIRST duty per the plan?",
        options: [
          "Contact the SSO and verify the precise threat \u2014 who, number of persons, type of threat \u2014 using the most secure means, recognising the crew may be under duress.",
          "Call the ship on open VHF and ask loudly what is wrong.",
          "Ignore it pending confirmation \u2014 SSAS alerts are usually accidental.",
          "Order the ship to sail immediately."
        ],
        correct: 0, partial: [],
        rationale: "On an activated SSAS the PFSO's first duty is to contact the SSO and verify the precise threats to the ship and facility (who, number of persons, type of threat, etc.) \u2014 by secure means.",
        ref: "PFSP \u00a74.6 (Activated SSAS)", points: 10
      },
      {
        phase: "Notification", role: "pfso",
        scene: "You cannot raise the ship cleanly and treat the alert as genuine.",
        q: "Who do you inform, and what do you stand up?",
        options: [
          "Inform the security authorities (Police, Defence Force/Coast Guard, Port Controller) and establish an on-site location for the authorities to use as a command point.",
          "Inform only the cargo surveyor.",
          "Keep it internal to avoid embarrassing the ship.",
          "Wait until the discharge finishes before telling anyone."
        ],
        correct: 0, partial: [],
        rationale: "PFSO SSAS duties: inform the security authorities and establish a site at the facility for their use \u2014 with multiple phone lines, fax, internet-capable computers, a whiteboard and support items.",
        ref: "PFSP \u00a74.6", points: 10
      },
      {
        phase: "Notification", role: "control_room",
        scene: "The PFSO directs you to prepare the command point and manage comms discipline.",
        q: "As Control Room Operator, what do you set up?",
        options: [
          "Ready the authorities' site (phone lines, fax, internet, whiteboard, refreshments), keep a strict time-stamped log, and protect communications \u2014 keep sensitive traffic on secure channels.",
          "Put the SSAS details out on the open public channel so all vessels know.",
          "Shut down all communications to 'go dark'.",
          "Leave the control room to watch events on the jetty."
        ],
        correct: 0, partial: [],
        rationale: "The plan specifies the authorities' site should have multiple phone lines, fax, internet-capable computers, a whiteboard and support items; communications are kept secure and logged.",
        ref: "PFSP \u00a74.6 & \u00a78", points: 10
      },
      {
        phase: "Assessment", role: "chief_officer",
        scene: "Through a brief, guarded exchange the SSO indicates persons may have boarded from the offshore side.",
        q: "What is the appropriate ship-side posture under duress?",
        options: [
          "Follow the ship security plan: protect the crew, avoid provoking the intruders, preserve the SSAS, and pass what information it safely can to the PFSO/authorities on the secure channel.",
          "Have the crew confront and overpower the intruders.",
          "Cancel the SSAS to avoid a fuss.",
          "Resume cargo operations as if nothing is happening."
        ],
        correct: 0, partial: [],
        rationale: "The SSO is accountable for ship security per the ship security plan and liaises with the PFSO; under an armed-threat duress the priority is crew safety and information-sharing, not confrontation.",
        ref: "PFSP \u00a74.6 & Definitions (SSO)", points: 10
      },
      {
        phase: "Response", role: "loading_master",
        scene: "With a possible armed party aboard a tanker mid-discharge, the PFSO orders the transfer made safe.",
        q: "As Loading Master, what is the correct action?",
        options: [
          "Suspend the transfer and isolate the line so the cargo system is in a safe, low-energy state, ready for a controlled disconnection if the authorities order the ship moved.",
          "Continue discharging to empty the ship faster so it can leave.",
          "Increase the pump rate to finish before the situation worsens.",
          "Abandon the jetty leaving valves open and pumps running."
        ],
        correct: 0, partial: [],
        rationale: "Operators control the safe conduct of the discharge; with a security threat the line is suspended and isolated to a safe state \u2014 raising the rate or abandoning it open would create a catastrophic spill/fire risk.",
        ref: "PFSP \u00a73.3 & \u00a77.1.1 (critical equipment/valves)", points: 10
      },
      {
        phase: "Response", role: "chief_jetty",
        scene: "The authorities want the landside secured and a clear approach for their response team.",
        q: "As Chief Jetty Man, what do you do landside?",
        options: [
          "Secure and lock access points, clear non-essential personnel back from the connection, keep the approach clear for responders, and account for facility staff \u2014 without going toward the ship.",
          "Send jetty crew aboard to help retake the ship.",
          "Open all gates so the public can see what's happening.",
          "Gather staff at the foot of the gangway for safety."
        ],
        correct: 0, partial: [],
        rationale: "Restricted-area access points are secured/locked and non-essential personnel restricted; the facility supports responders and keeps staff clear of the threat \u2014 boarding is strictly for the authorities.",
        ref: "PFSP \u00a75.6 (Access control / restricted areas)", points: 10
      },
      {
        phase: "Escalation", role: "coast_guard",
        scene: "The Coast Guard / BDF and Police mount a response to the vessel.",
        q: "How are firearms and the use of force handled at this facility?",
        options: [
          "Firearms are prohibited for facility staff; law enforcement and military may use firearms around the facility in the case of a clear threat to life or to the integrity of the facility/port.",
          "The jetty crew should draw weapons and support the assault.",
          "No one may use firearms anywhere near a fuel terminal under any circumstances.",
          "The ship's crew should be issued the facility's firearms."
        ],
        correct: 0, partial: [],
        rationale: "Use/possession of firearms is prohibited at the facility (and cannot be enforced in a public space), but law enforcement and military may use firearms in the case of a clear threat to life or to the integrity of the facility or port.",
        ref: "PFSP \u00a75.5 (Use of firearms)", points: 10
      },
      {
        phase: "Escalation", role: "pfso",
        scene: "This is now a probable, imminent security incident with outside forces engaged.",
        q: "What security level posture and contact regime applies?",
        options: [
          "Treat it as Level 3: maintain continuous contact with the Designated Authority (facility status calls), post additional guards for the duration, and let the authorities take control of the situation.",
          "Hold at Level 1 to avoid paperwork.",
          "Declare the drill over and send everyone home.",
          "Refuse contact with the DA to keep the channel clear."
        ],
        correct: 0, partial: [],
        rationale: "Level 3 is for when an incident is probable or imminent; outside assistance takes control. The PFSO maintains continuous contact with the DA via facility status calls and posts additional guards for the duration.",
        ref: "PFSP \u00a75.1 (Level 3) & \u00a75.4", points: 10
      },
      {
        phase: "Recovery", role: "police",
        scene: "The authorities secure the vessel; the intruders are detained. The scene is now a crime scene.",
        q: "What is the facility's role during stand-down?",
        options: [
          "Preserve evidence and CCTV, hand records to the authorities, and resume operations only when law enforcement and the PFSO jointly confirm it is safe.",
          "Wash down and reset the jetty immediately to resume cargo.",
          "Delete CCTV to protect the company's reputation.",
          "Restart discharge the moment the detainees are removed, without an all-clear."
        ],
        correct: 0, partial: [],
        rationale: "The facility preserves evidence/CCTV and supports the authorities; records are made available to the DA. Operations resume only on a confirmed all-clear.",
        ref: "PFSP \u00a73.4 & \u00a72.4", points: 10
      },
      {
        phase: "Recovery", role: "pfso",
        scene: "The Designated Authority and internal auditor require a full account.",
        q: "What closes the incident properly?",
        options: [
          "A complete incident record and security log, a debrief capturing lessons learned, and a review/update of the PFSP \u2014 plus the change-in-security-level record (time notified, time of compliance).",
          "A short email saying 'all good now'.",
          "Nothing until the next annual audit.",
          "Only the cargo completion certificate."
        ],
        correct: 0, partial: [],
        rationale: "Records include incident reports and changes in security level (date/time notified, time of compliance); the plan is reviewed/updated following a security incident, with lessons learned documented.",
        ref: "PFSP \u00a73.4 & \u00a72.2", points: 10
      }
    ]
  },

  /* ========================================================
     4 — HOSTILE RECONNAISSANCE
     ======================================================== */
  {
    id: "hostile-recon",
    title: "Surveillance & Hostile Reconnaissance",
    category: "Hostile reconnaissance",
    startLevel: 1,
    synopsis: "Over several hours, staff notice someone photographing the shore connection and a vehicle repeatedly passing the facility \u2014 possible pre-attack surveillance ahead of a vessel call.",
    setup: "It is {time}, the day before {vessel} is due to arrive with {cargo}. Conditions: {wind}. A member of staff notices a person photographing the pipeline slab and fence line, and {plate} has driven slowly past the gate three times.",
    injects: [
      {
        phase: "Detection", role: "chief_jetty",
        scene: "You notice the individual photographing the restricted shore connection and the protective concrete slab over the pipeline.",
        q: "As the first person aware, what do you do?",
        options: [
          "Note a detailed description (person, clothing, what they're photographing, vehicle), do NOT confront them, and immediately notify law enforcement and the PFSO/SSO.",
          "Confront and detain the person and seize their phone.",
          "Ignore it \u2014 the connection is in a public place so anyone can take photos.",
          "Post their photo online asking the public to identify them."
        ],
        correct: 0, partial: [],
        rationale: "For a person surveying/photographing the facility: immediately notify law enforcement describing the person/vehicle in detail and notify the PFSO and SSO \u2014 observe and report, do not engage.",
        ref: "PFSP \u00a77.1 (Incident response chart)", points: 10
      },
      {
        phase: "Detection", role: "control_room",
        scene: "Minutes later you spot {plate} on CCTV making a slow third pass of the gate.",
        q: "As Control Room Operator, how do you treat the vehicle?",
        options: [
          "Record the description (make, colour, plate, occupants, times of each pass) and immediately notify law enforcement and the PFSO; preserve the CCTV footage.",
          "Assume it's lost and ignore it.",
          "Open the gate to see if they want to come in.",
          "Erase earlier footage to free up disk space."
        ],
        correct: 0, partial: [],
        rationale: "For a suspicious vehicle: immediately notify law enforcement describing the person/vehicle in detail. CCTV with recording capability should be preserved as evidence.",
        ref: "PFSP \u00a77.1 & \u00a75.6 (Surveillance)", points: 10
      },
      {
        phase: "Notification", role: "pfso",
        scene: "Two reports in one afternoon \u2014 photography of the pipeline and repeated vehicle passes \u2014 the day before a tanker call.",
        q: "As PFSO, how do you interpret and act on this pattern?",
        options: [
          "Treat it as possible hostile reconnaissance: log it, report to law enforcement, raise alertness and consider additional measures, and brief staff to watch for further activity.",
          "Dismiss each report in isolation as a coincidence.",
          "Cancel the vessel call permanently with no assessment.",
          "Keep it to yourself until something actually happens."
        ],
        correct: 0, partial: [],
        rationale: "The PFSO strengthens consciousness and alertness, keeps records of threats, reports to the authorities, and has knowledge of current security threats and patterns \u2014 connecting indicators is exactly the PFSO's role.",
        ref: "PFSP \u00a73.3 (PFSO duties) & \u00a76.1", points: 10
      },
      {
        phase: "Assessment", role: "police",
        scene: "You have passed descriptions to the Police.",
        q: "What is the Police role at this stage?",
        options: [
          "Receive the detailed descriptions, investigate the individual/vehicle, and advise the facility \u2014 the facility supports with information and access but does not conduct the investigation itself.",
          "Tell the facility to handle it internally.",
          "Arrest the nearest member of the public.",
          "Take over running the terminal."
        ],
        correct: 0, partial: [],
        rationale: "Law enforcement investigates; the facility's duty is to notify with detail and support. Government/agency personnel are granted access on presenting official credentials.",
        ref: "PFSP \u00a77.1 & \u00a75.1.1 (Government access)", points: 10
      },
      {
        phase: "Response", role: "pfso",
        scene: "Given credible pre-attack indicators before a vessel call, you consider tightening the posture for the call.",
        q: "What additional measures are appropriate (Level 2 style)?",
        options: [
          "Restrict access for non-essential personnel, place temporary barriers around the shore connection, increase patrols/monitoring, and establish a restricted area on the shore side for the vessel call.",
          "Reduce staffing to draw less attention.",
          "Leave the gate open to appear normal.",
          "Switch off CCTV so the surveillance team can't tell it's recording."
        ],
        correct: 0, partial: [],
        rationale: "Level 2 access-control measures include restricting non-essential personnel, temporary barriers around the ship-to-shore connection, additional patrols, and a shore-side restricted area for the vessel.",
        ref: "PFSP \u00a75.6 (Security measures at Level 2)", points: 10
      },
      {
        phase: "Response", role: "chief_jetty",
        scene: "You are setting up for the heightened vessel call.",
        q: "How do you manage access and identity at the connection during Level 2?",
        options: [
          "Log frequent visitors/contractors, require valid photo ID and issue visitor badges, verify each person against their plant contact, and escort personnel in restricted areas as appropriate.",
          "Wave everyone through to keep things moving.",
          "Refuse entry to the Police and inspectors.",
          "Let contractors sign in under any name without ID."
        ],
        correct: 0, partial: [],
        rationale: "Visitors/contractors are admitted only on valid photo ID, issued a numbered VISITOR badge, verified with their plant contact and logged; in restricted areas personnel are escorted as appropriate.",
        ref: "PFSP \u00a75.6 (Access control) & \u00a75.1.1", points: 10
      },
      {
        phase: "Escalation", role: "boatman",
        scene: "On the day of the call, you patrol the waterside as the tanker comes alongside.",
        q: "Given the recon indicators, what is your patrol focus?",
        options: [
          "Increase monitoring of the waterside and landside from seaward, maintain constant comms with the PFSO-certified operators, and report any approaching craft or unusual activity at once.",
          "Tie up and wait by the jetty until something happens.",
          "Patrol far out to sea away from the berth.",
          "Stop reporting routine sightings to keep the channel clear."
        ],
        correct: 0, partial: [],
        rationale: "The contracted tender monitors the waterside and landside from the sea with timely reporting in constant communication with the PFSO-certified operators \u2014 patrols increase under heightened conditions.",
        ref: "PFSP \u00a73.3 & \u00a75.6 (Patrols)", points: 10
      },
      {
        phase: "Escalation", role: "chief_officer",
        scene: "The arriving ship should be made aware of the shore-side intelligence.",
        q: "What information exchange should occur with the ship?",
        options: [
          "The PFSO/designee establishes contact with the SSO, advises the security level and the recon concern, and \u2014 if the situation warrants \u2014 a Declaration of Security (DoS) is agreed for the call.",
          "Tell the ship nothing to avoid worrying the master.",
          "Demand the ship leave the area.",
          "Share the full confidential PFSP with the ship's whole crew."
        ],
        correct: 0, partial: [],
        rationale: "The PFSO establishes contact with the SSO and provides the security level and relevant information; a DoS may be issued \u2014 it can be requested by the ship or demanded by the facility \u2014 to agree the split of security duties.",
        ref: "PFSP \u00a74.1 & \u00a74.2 (DoS)", points: 10
      },
      {
        phase: "Recovery", role: "control_room",
        scene: "The vessel call passes without incident. The recon activity is logged.",
        q: "What record is kept?",
        options: [
          "A security-threat / incident record with date/time, how it was observed, descriptions, to whom reported and the response \u2014 plus the CCTV \u2014 retained for two years.",
          "Nothing, because no attack occurred.",
          "A verbal mention only.",
          "Just the visitor log, discarding the surveillance notes."
        ],
        correct: 0, partial: [],
        rationale: "Reports of security threats and incident records capture date/time, observation, description, who it was reported to and the response; records are retained for two years and available to the DA.",
        ref: "PFSP \u00a73.4 (Records)", points: 10
      },
      {
        phase: "Recovery", role: "pfso",
        scene: "You review the episode for the auditor and the wider company.",
        q: "What is the value-adding follow-up?",
        options: [
          "Share the indicators and lessons learned, feed them into the PFSA/PFSP review, and reinforce staff awareness training on recognising surveillance and hostile reconnaissance.",
          "Forget it \u2014 nothing was stolen or damaged.",
          "Tell staff to stop reporting 'minor' things to avoid false alarms.",
          "Keep the lessons secret from other staff."
        ],
        correct: 0, partial: [],
        rationale: "The PFSA is reviewed periodically and the PFSP after incidents; staff receive training in recognising characteristics/behaviours of persons likely to threaten security and techniques used to circumvent measures.",
        ref: "PFSP \u00a72.2 & \u00a76.1 (Training topics)", points: 10
      }
    ]
  },

  /* ========================================================
     5 — DESIGNATED AUTHORITY RAISES SECURITY LEVEL + SUSPICIOUS PACKAGE
     ======================================================== */
  {
    id: "level-raise",
    title: "Security Level Raised to 2 \u2014 Package at the Gate",
    category: "Level change / suspect package",
    startLevel: 1,
    synopsis: "The Designated Authority raises the national security level to 2 ahead of a vessel call; during set-up a suspicious package is found by the gate to the shore connection.",
    setup: "It is {time}. The Designated Authority notifies a change to Security Level 2 for the port. {vessel} is due with {cargo}. While placing barriers, staff find an unattended package against the gate of the restricted shore connection. Conditions: {wind}.",
    injects: [
      {
        phase: "Detection", role: "pfso",
        scene: "The DA's notification of Security Level 2 arrives.",
        q: "As PFSO, what must happen on receiving the level change?",
        options: [
          "Record the date/time the notification was received, implement the Level 2 measures, and log the time of compliance \u2014 then inform the ship/SSO of the new level.",
          "File the notice and act on it after the weekend.",
          "Ignore it \u2014 only Level 3 requires action.",
          "Announce it publicly on social media."
        ],
        correct: 0, partial: [],
        rationale: "Records of changes in security levels must contain the date/time the notification was received and the time of compliance with the additional requirements; the PFSO informs the SSO of changes in level.",
        ref: "PFSP \u00a73.4 (Changes in security levels) & \u00a74.1", points: 10
      },
      {
        phase: "Response", role: "chief_jetty",
        scene: "You begin implementing Level 2 at the shore connection.",
        q: "What are the correct Level 2 access/restricted-area measures?",
        options: [
          "Restrict access for non-essential personnel, place temporary barriers around the ship-to-shore connection, increase patrol frequency, and tighten monitoring of the restricted area.",
          "Remove the barriers so emergency vehicles have clear access at all times.",
          "Keep everything exactly as Level 1 \u2014 nothing changes until Level 3.",
          "Open the restricted area to the public to show transparency."
        ],
        correct: 0, partial: [],
        rationale: "At Level 2, access for non-essential personnel is restricted, temporary barriers are placed around the connection, monitoring/access-control frequency increases and additional patrols are assigned.",
        ref: "PFSP \u00a75.6 (Level 2 measures)", points: 10
      },
      {
        phase: "Detection", role: "chief_jetty",
        scene: "While placing a barrier you find an unattended package pushed against the gate of the restricted connection.",
        q: "What do you do about the package?",
        options: [
          "Do NOT touch or disturb it; immediately notify the PFSO and SSO, and clear/evacuate the immediate area around it.",
          "Pick it up and carry it away from the gate to a bin.",
          "Open it carefully to see if it's addressed to anyone.",
          "Leave it and carry on \u2014 it's probably rubbish."
        ],
        correct: 0, partial: [],
        rationale: "For a suspicious package: immediately notify the PFSO and SSO WITHOUT disturbing the package, and evacuate the immediate area.",
        ref: "PFSP \u00a77.1 (Suspicious package)", points: 10
      },
      {
        phase: "Notification", role: "control_room",
        scene: "The report of the package reaches you.",
        q: "As Control Room Operator, what is the correct notification?",
        options: [
          "Report directly and immediately to the Police (211) and the PFSO/Terminal Supervisor by the fastest means, log it, and relay to other personnel as appropriate.",
          "Send a non-urgent email to the PFSO.",
          "Wait to see if anyone claims the package.",
          "Call a staff meeting to discuss it first."
        ],
        correct: 0, partial: [],
        rationale: "The person first aware reports directly and immediately to the Police and Terminal Supervisor by the fastest means; the duty operator logs and relays.",
        ref: "PFSP \u00a72.4 & \u00a77.1 (Police 211)", points: 10
      },
      {
        phase: "Assessment", role: "pfso",
        scene: "A suspect package at a fuel terminal gate, under a Level 2 posture, with a tanker inbound.",
        q: "What command actions do you take?",
        options: [
          "Initiate incident command, establish a safe cordon and evacuation of the immediate area, notify Police/DA, and hold the vessel's berthing until the package is resolved.",
          "Berth the tanker on schedule regardless of the package.",
          "Send a worker to stand guard over the package by hand.",
          "Resume normal Level 1 operations to keep to schedule."
        ],
        correct: 0, partial: [],
        rationale: "The PFSO initiates the incident command structure, evacuates the immediate area and notifies the authorities; berthing a tanker next to an unresolved suspect device would be reckless.",
        ref: "PFSP \u00a72.4 & \u00a77.1", points: 10
      },
      {
        phase: "Response", role: "loading_master",
        scene: "The inbound tanker is approaching and asks for berthing instructions.",
        q: "As Loading Master coordinating the call, what is correct?",
        options: [
          "Hold the vessel off / delay berthing and keep it clear of the facility until the package is cleared and the PFSO authorises the approach.",
          "Berth and start discharge to avoid demurrage.",
          "Have the vessel anchor right on top of the suspect area.",
          "Tell the ship to sort out its own berthing."
        ],
        correct: 0, partial: [],
        rationale: "Safe, successful and controlled cargo operations are the operators' responsibility; with an unresolved threat the vessel is held clear until the PFSO authorises the approach.",
        ref: "PFSP \u00a73.3 & \u00a72.4", points: 10
      },
      {
        phase: "Escalation", role: "police",
        scene: "Police and an explosives capability respond to the package.",
        q: "How is the package handled once authorities arrive?",
        options: [
          "Authorities lead the assessment/render-safe; the facility maintains the cordon, hands over information and access, and complies with their instructions.",
          "Facility staff move the package to a 'safe' area for the Police.",
          "The Police are turned away because the plan is confidential.",
          "Operations resume around the Police while they work."
        ],
        correct: 0, partial: [],
        rationale: "The facility does not disturb the package and supports the authorities, who lead. Police explosives contacts are listed for exactly this; the facility provides access and information.",
        ref: "PFSP \u00a77.1 & \u00a77.3 (SME/explosives contacts)", points: 10
      },
      {
        phase: "Escalation", role: "chief_officer",
        scene: "The ship is being held off and asks what is happening and what is expected of it.",
        q: "What is the correct ship-facility coordination now?",
        options: [
          "PFSO/designee keeps the SSO informed of the level and situation on the secure channel and, given the heightened posture, agrees a Declaration of Security setting out each party's security duties for the call.",
          "Cut all contact with the ship until the package is cleared.",
          "Order the ship to berth itself unaided.",
          "Tell the ship the all-clear before the Police have given one."
        ],
        correct: 0, partial: [],
        rationale: "The PFSO keeps the SSO informed of the security level and relevant information; a DoS may be agreed (and can be demanded by the facility) to define the share of security responsibilities, especially at a higher level.",
        ref: "PFSP \u00a74.1 & \u00a74.2 (DoS)", points: 10
      },
      {
        phase: "Recovery", role: "pfso",
        scene: "Police declare the package a harmless discard. The level remains at 2 for the day.",
        q: "On what basis do you resume the vessel call?",
        options: [
          "On a confirmed all-clear from the authorities, resume under the full Level 2 regime, brief the team and ship, and continue logging \u2014 the formal level stays as set by the DA.",
          "Drop straight back to Level 1 and relax all measures.",
          "Resume before the all-clear to recover lost time.",
          "Stand everyone down and cancel the call without telling the DA."
        ],
        correct: 0, partial: [],
        rationale: "Operations resume on a confirmed all-clear and continue under the Level 2 measures the DA has set; the DA determines the formal level and the PFSO maintains contact with them.",
        ref: "PFSP \u00a75.1 & \u00a72.4", points: 10
      },
      {
        phase: "Recovery", role: "control_room",
        scene: "The HSE department and internal auditor will review both the level change and the package.",
        q: "What records close out the day?",
        options: [
          "The change-in-level record (time notified / time of compliance), the incident record for the package, the security log, and lessons learned \u2014 retained two years and available to the DA.",
          "A single line: 'Level 2 day, false alarm'.",
          "Nothing \u2014 the package was harmless.",
          "Only the cargo transfer paperwork."
        ],
        correct: 0, partial: [],
        rationale: "Required records include changes in security levels (time notified and time of compliance) and incident records; all are kept for two years and made available to the Designated Authority on request.",
        ref: "PFSP \u00a73.4 (Records & documentation)", points: 10
      }
    ]
  }
];
