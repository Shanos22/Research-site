// scoring.js
// This is a starter scoring model that you can expand.
// It produces: CONSENT, SECRECY, SELF_JUSTIFY, SEX_DETAIL_INTENSITY, RECLAIM_BONDING, AVOIDANCE, ATTACH_RISK
// and maps to 4 profiles.
// NOTE: It only scores questions that exist; missing answers simply reduce certainty.

function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }

function isHigh(n, t=7){ return (typeof n==="number" && n>=t); }
function isLow(n, t=3){ return (typeof n==="number" && n<=t); }

function get(ans, id){ return ans[id]; }

function scoreAssessment(ans){
  // Helper: treat Likert single-choice as strings; scale as numbers; missing -> null
  const scores = {
    CONSENT: 50,
    SECRECY: 50,
    SELF_JUSTIFY: 50,
    SEX_DETAIL_INTENSITY: 50,
    RECLAIM_BONDING: 50,
    AVOIDANCE: 50,
    ATTACH_RISK: 50
  };

  // --- Consent integrity signals (from MM module / safety gates where present)
  // Examples: Q207 (framed as optional), Q238 (free to say no), Q333/334 (reclaim pressure), etc.
  // We'll use a few ids that exist in your authored set; placeholders won't break anything.
  const q207 = get(ans,"Q207"); // yes/mostly/mixed... stored as option value
  const q238 = get(ans,"Q238");
  const q334 = get(ans,"Q334"); // Never/Rare/Sometimes/Often/Always
  const q212 = get(ans,"Q212"); // leverage
  const q213 = get(ans,"Q213"); // pressure felt
  const q223 = get(ans,"Q223"); // consensual felt

  const badWords = ["often","always","yes","felt pressured","not consensual","no","not really","mixed"];
  function penalizeIfIncludes(val, penalty){
    if(!val) return;
    const s = String(val).toLowerCase();
    for(const w of badWords){
      if(s.includes(w)){
        scores.CONSENT -= penalty;
        break;
      }
    }
  }
  // heuristics (conservative)
  penalizeIfIncludes(q212, 10);
  penalizeIfIncludes(q213, 10);
  penalizeIfIncludes(q223, 12);
  penalizeIfIncludes(q334, 8);
  penalizeIfIncludes(q207, 6);
  penalizeIfIncludes(q238, 10);

  // --- Secrecy / curated truth signals (Q316, Q320, Q312, Q320, Q360, etc.)
  const q312 = get(ans,"Q312");
  const q316 = get(ans,"Q316");
  const q320 = get(ans,"Q320");
  const q360 = get(ans,"Q360");
  function bumpSecrecy(val, bump){
    if(!val) return;
    const s = String(val).toLowerCase();
    if(s.includes("often") || s.includes("always") || s.includes("vague") || s.includes("avoid")){
      scores.SECRECY += bump;
    }
    if(s.includes("full truth")) scores.SECRECY -= bump;
  }
  bumpSecrecy(q312, 8);
  bumpSecrecy(q316, 10);
  bumpSecrecy(q320, 12);
  bumpSecrecy(q360, 6);

  // --- Self-justification index (from kept items: Q391, Q392, Q394, Q395, Q398, Q402 + Q403/Q404 + lie pair)
  // If these aren't present (placeholders), score stays neutral.
  const q391 = get(ans,"Q391");
  const q392 = get(ans,"Q392");
  const q394 = get(ans,"Q394");
  const q395 = get(ans,"Q395");
  const q398 = get(ans,"Q398");
  const q402 = get(ans,"Q402");

  // If you implement these as 1–5 scales in JSON, this scoring will work.
  const likerts = [q391,q392,q394,q395,q398,q402].filter(v=>typeof v==="number");
  if(likerts.length){
    const avg = likerts.reduce((a,b)=>a+b,0)/likerts.length; // 1..5
    // Higher avg => more self-justification / cover reasons
    scores.SELF_JUSTIFY = clamp(Math.round(20 + (avg-1)*20), 0, 100);
  }

  // Counterfactuals (Q403/Q404) as strings; if "definitely not" => cover reason likely
  const q403 = get(ans,"Q403");
  const q404 = get(ans,"Q404");
  if(q403 && String(q403).toLowerCase().includes("definitely not")) scores.SELF_JUSTIFY += 10;
  if(q404 && (String(q404).toLowerCase().includes("more") || String(q404).toLowerCase().includes("much more"))) scores.SELF_JUSTIFY += 8;

  // Lie detector pair: Q434/Q435 if implemented as numeric 1–5
  const q434 = get(ans,"Q434");
  const q435 = get(ans,"Q435");
  if(typeof q434==="number" && typeof q435==="number"){
    // if both high, suggests cover-story pattern
    if(q434>=4 && q435>=4) scores.SELF_JUSTIFY += 10;
  }

  // --- Sex-detail intensity (your priority): based on size importance, dominance preference, porn influence, group interest
  const q296 = get(ans,"Q296");
  const q303 = get(ans,"Q303");
  const q304 = get(ans,"Q304");
  const q321 = get(ans,"Q321"); // optional
  function bumpIntensity(val, bump){
    if(!val) return;
    const s = String(val).toLowerCase();
    if(s.includes("essential") || s.includes("central") || s.includes("strong")) scores.SEX_DETAIL_INTENSITY += bump;
    if(s.includes("not at all") || s.includes("not important")) scores.SEX_DETAIL_INTENSITY -= bump;
  }
  bumpIntensity(q296, 8);
  bumpIntensity(q303, 8);
  bumpIntensity(q304, 6);
  if(typeof q321==="number"){
    if(q321>=7) scores.SEX_DETAIL_INTENSITY += 8;
    if(q321<=3) scores.SEX_DETAIL_INTENSITY -= 6;
  }

  // --- Reclaim bonding vs obligation (Q330, Q336, Q360, etc.)
  const q330 = get(ans,"Q330");
  const q336 = get(ans,"Q336");
  if(q330){
    const s = String(q330).toLowerCase();
    if(s.includes("bonding") || s.includes("connection")) scores.RECLAIM_BONDING += 12;
    if(s.includes("duty") || s.includes("prevent") || s.includes("manage")) scores.RECLAIM_BONDING -= 10;
  }
  if(q336){
    const s = String(q336).toLowerCase();
    if(s.includes("closer") || s.includes("aroused")) scores.RECLAIM_BONDING += 10;
    if(s.includes("disconnected") || s.includes("irritated") || s.includes("guilty")) scores.RECLAIM_BONDING -= 10;
  }

  // --- Avoidance / substitution (Q344, Q385, Q364, Q346)
  const q344 = get(ans,"Q344");
  const q385 = get(ans,"Q385");
  const q364 = get(ans,"Q364");
  const q346 = get(ans,"Q346");
  function bumpAvoid(val, bump){
    if(!val) return;
    const s = String(val).toLowerCase();
    if(s.includes("often") || s.includes("almost always") || s.includes("always")) scores.AVOIDANCE += bump;
    if(s.includes("never")) scores.AVOIDANCE -= Math.floor(bump/2);
  }
  bumpAvoid(q344, 10);
  bumpAvoid(q385, 12);
  bumpAvoid(q364, 8);
  bumpAvoid(q346, 8);

  // --- Attachment risk (Q233/Q234 + any "attached" items if you add later)
  const q233 = get(ans,"Q233");
  const q234 = get(ans,"Q234");
  if(q233 && String(q233).toLowerCase().includes("attached")) scores.ATTACH_RISK += 10;
  if(q234){
    const s = String(q234).toLowerCase();
    if(s.includes("strongly") || s.includes("yes")) scores.ATTACH_RISK += 10;
    if(s.includes("not at all")) scores.ATTACH_RISK -= 6;
  }

  // Clamp all to 0..100
  for(const k of Object.keys(scores)) scores[k] = clamp(scores[k], 0, 100);

  // Profile mapping (starter)
  const risk = (100 - scores.CONSENT) * 0.35 + scores.SECRECY * 0.25 + scores.AVOIDANCE * 0.2 + scores.ATTACH_RISK * 0.2;
  let profile;
  if(risk < 35){
    profile = {
      id: "P1",
      title: "Stable / High-clarity dynamic",
      summary: "Your answers point to generally solid consent integrity, manageable secrecy load, and relatively stable after-effects.",
      nextSteps: [
        "Codify boundaries (including stop-words) and review them monthly.",
        "Keep debriefs consistent (pick 'full truth' or a defined 'curated truth' rule—don’t freestyle).",
        "If you want more intensity, increase structure first (not spontaneity)."
      ]
    };
  }else if(risk < 55){
    profile = {
      id: "P2",
      title: "Works, but needs structure",
      summary: "You’re getting value from the dynamic, but volatility risk rises when logistics, debrief style, or reassurance pressure is inconsistent.",
      nextSteps: [
        "Define post-encounter rules (reclaim expectations, timing, and whether it’s optional).",
        "Reduce ambiguity: one agreed debrief format and one safety checklist.",
        "Track 'avoidance' moments—name the real reason within 24 hours."
      ]
    };
  }else if(risk < 70){
    profile = {
      id: "P3",
      title: "High drift / Curated-truth risk",
      summary: "Your answers suggest elevated secrecy/softening, increasing the chance of jealousy spirals, resentment, or long-run instability.",
      nextSteps: [
        "Stop relying on 'cover reasons' (stress/tired) as the default—replace with a neutral truth script.",
        "Move to slower escalation: add rules before adding intensity.",
        "Consider a short 'truth boundary' agreement: what must be shared vs what stays private."
      ]
    };
  }else{
    profile = {
      id: "P4",
      title: "High risk flags (consent / pressure / attachment)",
      summary: "Multiple signals suggest the dynamic may be crossing into pressure, coercion, or destabilizing attachment/avoidance patterns.",
      nextSteps: [
        "Pause escalation. Rebuild consent integrity first (explicit opt-outs, no consequences for 'no').",
        "If MM involvement or humiliation is present, re-check that it’s clearly consensual—not leverage.",
        "If anyone feels unsafe, stop and seek qualified help."
      ]
    };
  }

  return {scores, profile};
}

// Expose to app.js
window.scoreAssessment = scoreAssessment;
