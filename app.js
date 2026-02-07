// Vanilla JS survey runner (client-side, no backend)
// Loads questions_core.json, renders one section at a time, captures answers, then scores via window.scoreAssessment()

const $ = (sel) => document.querySelector(sel);

const state = {
  questions: [],      // flat list
  sections: [],       // array of {id,title,questionIds[]}
  answers: {},        // {QID: value}
  sectionIndex: 0,
  qIndexInSection: 0
};

function loadJSON(url){
  return fetch(url).then(r => {
    if(!r.ok) throw new Error(`Failed to load ${url}`);
    return r.json();
  });
}

function flattenQuestions(survey){
  const qmap = new Map();
  const flat = [];
  for(const q of survey.questions){
    qmap.set(q.id, q);
    flat.push(q);
  }
  return {qmap, flat};
}

function getCurrentQuestion(){
  const sec = state.sections[state.sectionIndex];
  const qid = sec.questionIds[state.qIndexInSection];
  return state.questions.find(q => q.id === qid);
}

function renderProgress(){
  const total = state.sections.reduce((acc,s)=>acc+s.questionIds.length,0);
  let done = 0;
  for(let i=0;i<state.sections.length;i++){
    const s = state.sections[i];
    if(i<state.sectionIndex) done += s.questionIds.length;
    else if(i===state.sectionIndex) done += state.qIndexInSection;
  }
  const pct = total ? Math.round((done/total)*100) : 0;
  $("#progressText").textContent = `Progress: ${done} / ${total} (${pct}%)`;
  $("#progressBar").style.width = pct + "%";
}

function renderSectionTitle(){
  const sec = state.sections[state.sectionIndex];
  $("#sectionTitle").textContent = sec.title;
}

function setButtons(){
  $("#prevBtn").disabled = (state.sectionIndex===0 && state.qIndexInSection===0);
  $("#nextBtn").textContent = isLastQuestion() ? "See Results" : "Next";
}

function isLastQuestion(){
  const sec = state.sections[state.sectionIndex];
  const lastInSec = state.qIndexInSection === sec.questionIds.length - 1;
  const lastSec = state.sectionIndex === state.sections.length - 1;
  return lastInSec && lastSec;
}

function saveAnswer(q){
  const id = q.id;
  const type = q.type;
  if(type === "single"){
    const checked = document.querySelector(`input[name="${id}"]:checked`);
    state.answers[id] = checked ? checked.value : null;
  }else if(type === "multi"){
    const checked = [...document.querySelectorAll(`input[name="${id}"]:checked`)].map(x=>x.value);
    state.answers[id] = checked.length ? checked : [];
  }else if(type === "scale"){
    const checked = document.querySelector(`input[name="${id}"]:checked`);
    state.answers[id] = checked ? Number(checked.value) : null;
  }else if(type === "text"){
    const el = document.querySelector(`#${id}_text`);
    state.answers[id] = el ? el.value.trim() : "";
  }else if(type === "matrix"){
    // matrix: rows with single choice each
    const out = {};
    for(const row of q.rows){
      const rname = `${id}__${row.key}`;
      const checked = document.querySelector(`input[name="${rname}"]:checked`);
      out[row.key] = checked ? checked.value : null;
    }
    state.answers[id] = out;
  }
}

function renderQuestion(q){
  const host = $("#questionHost");
  host.innerHTML = "";

  const box = document.createElement("div");
  box.className = "q";

  const title = document.createElement("div");
  title.className = "qtitle";
  title.textContent = `${q.id}. ${q.text}`;
  box.appendChild(title);

  const prior = state.answers[q.id];

  if(q.type === "single"){
    const opts = document.createElement("div");
    opts.className = "opts";
    q.options.forEach((opt, idx)=>{
      const lab = document.createElement("label");
      lab.className = "opt";
      const inp = document.createElement("input");
      inp.type = "radio";
      inp.name = q.id;
      inp.value = opt.value;
      if(prior === opt.value) inp.checked = true;
      const span = document.createElement("span");
      span.textContent = opt.label;
      lab.appendChild(inp); lab.appendChild(span);
      opts.appendChild(lab);
    });
    box.appendChild(opts);
  }

  if(q.type === "multi"){
    const opts = document.createElement("div");
    opts.className = "opts";
    const priorArr = Array.isArray(prior) ? prior : [];
    q.options.forEach((opt)=>{
      const lab = document.createElement("label");
      lab.className = "opt";
      const inp = document.createElement("input");
      inp.type = "checkbox";
      inp.name = q.id;
      inp.value = opt.value;
      if(priorArr.includes(opt.value)) inp.checked = true;
      const span = document.createElement("span");
      span.textContent = opt.label;
      lab.appendChild(inp); lab.appendChild(span);
      opts.appendChild(lab);
    });
    box.appendChild(opts);
  }

  if(q.type === "scale"){
    const wrap = document.createElement("div");
    wrap.className = "scale";
    const min = q.min ?? 0, max = q.max ?? 10;
    for(let v=min; v<=max; v++){
      const lab = document.createElement("label");
      lab.className = "pill";
      const inp = document.createElement("input");
      inp.type = "radio";
      inp.name = q.id;
      inp.value = String(v);
      if(prior === v) inp.checked = true;
      lab.appendChild(inp);
      lab.appendChild(document.createTextNode(" " + v));
      wrap.appendChild(lab);
    }
    box.appendChild(wrap);
    if(q.hint){
      const h = document.createElement("div");
      h.className = "muted";
      h.style.marginTop="8px";
      h.textContent = q.hint;
      box.appendChild(h);
    }
  }

  if(q.type === "text"){
    const ta = document.createElement("textarea");
    ta.id = `${q.id}_text`;
    ta.rows = q.rows ?? 3;
    ta.placeholder = q.placeholder ?? "";
    ta.value = prior ?? "";
    box.appendChild(ta);
  }

  if(q.type === "matrix"){
    // each row is a single-choice set (same option list)
    for(const row of q.rows){
      const rowBox = document.createElement("div");
      rowBox.className = "card2";
      const rt = document.createElement("div");
      rt.style.fontWeight="600";
      rt.textContent = row.label;
      rowBox.appendChild(rt);

      const opts = document.createElement("div");
      opts.className = "scale";
      const priorObj = (prior && typeof prior === "object") ? prior : {};
      const rname = `${q.id}__${row.key}`;
      for(const opt of q.options){
        const lab = document.createElement("label");
        lab.className = "pill";
        const inp = document.createElement("input");
        inp.type = "radio";
        inp.name = rname;
        inp.value = opt.value;
        if(priorObj[row.key] === opt.value) inp.checked = true;
        lab.appendChild(inp);
        lab.appendChild(document.createTextNode(" " + opt.label));
        opts.appendChild(lab);
      }
      rowBox.appendChild(opts);
      box.appendChild(rowBox);
    }
  }

  host.appendChild(box);
}

function goPrev(){
  const q = getCurrentQuestion();
  saveAnswer(q);

  if(state.qIndexInSection>0){
    state.qIndexInSection--;
  } else if(state.sectionIndex>0){
    state.sectionIndex--;
    const sec = state.sections[state.sectionIndex];
    state.qIndexInSection = sec.questionIds.length - 1;
  }
  refresh();
}

function goNext(){
  const q = getCurrentQuestion();
  saveAnswer(q);

  if(isLastQuestion()){
    showResults();
    return;
  }

  const sec = state.sections[state.sectionIndex];
  if(state.qIndexInSection < sec.questionIds.length - 1){
    state.qIndexInSection++;
  } else {
    state.sectionIndex++;
    state.qIndexInSection = 0;
  }
  refresh();
}

function refresh(){
  renderProgress();
  renderSectionTitle();
  setButtons();
  const q = getCurrentQuestion();
  renderQuestion(q);
}

function showResults(){
  $("#survey").classList.add("hidden");
  $("#results").classList.remove("hidden");

  const out = window.scoreAssessment(state.answers);
  $("#resultSummary").innerHTML = `
    <p><strong>Profile:</strong> ${out.profile.title}</p>
    <p class="muted">${out.profile.summary}</p>
  `;

  const scoreList = $("#scoreList");
  scoreList.innerHTML = "";
  for(const [k,v] of Object.entries(out.scores)){
    const row = document.createElement("div");
    row.className = "kv";
    row.innerHTML = `<div>${k}</div><div><strong>${v}</strong></div>`;
    scoreList.appendChild(row);
  }

  const ns = $("#nextSteps");
  ns.innerHTML = "";
  const ul = document.createElement("ul");
  for(const s of out.profile.nextSteps){
    const li = document.createElement("li");
    li.textContent = s;
    ul.appendChild(li);
  }
  ns.appendChild(ul);

  $("#downloadBtn").onclick = () => {
    const payload = {
      timestamp: new Date().toISOString(),
      profile: out.profile,
      scores: out.scores,
      answers: state.answers
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "assessment_results.json";
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1500);
  };
}

function restart(){
  state.answers = {};
  state.sectionIndex = 0;
  state.qIndexInSection = 0;
  $("#results").classList.add("hidden");
  $("#survey").classList.remove("hidden");
  refresh();
}

function setupJump(){
  $("#jumpBtn").onclick = () => {
    $("#jumpModal").classList.remove("hidden");
    $("#jumpModal").setAttribute("aria-hidden","false");
  };
  $("#closeJump").onclick = () => {
    $("#jumpModal").classList.add("hidden");
    $("#jumpModal").setAttribute("aria-hidden","true");
  };

  const jl = $("#jumpList");
  jl.innerHTML = "";
  state.sections.forEach((s, idx)=>{
    const item = document.createElement("div");
    item.className = "jumpItem";
    item.innerHTML = `<strong>${idx+1}.</strong> ${s.title} <span class="muted">(${s.questionIds.length} q)</span>`;
    item.onclick = () => {
      state.sectionIndex = idx;
      state.qIndexInSection = 0;
      $("#jumpModal").classList.add("hidden");
      refresh();
    };
    jl.appendChild(item);
  });
}

async function init(){
  try{
    const survey = await loadJSON("questions_core.json");
    const {flat} = flattenQuestions(survey);
    state.questions = flat;
    state.sections = survey.sections;

    $("#loading").classList.add("hidden");
    $("#survey").classList.remove("hidden");

    $("#prevBtn").onclick = goPrev;
    $("#nextBtn").onclick = goNext;
    $("#restartBtn").onclick = restart;

    setupJump();
    refresh();
  }catch(err){
    $("#loading").textContent = "Error loading survey: " + err.message;
  }
}

init();
