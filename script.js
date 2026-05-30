/* =========================
   STORAGE
========================= */
const STORAGE_KEY = "tracker_30_days_data";
const AI_CONFIG_KEY = "tracker_ai_config";

let currentDay = 1;
let activeWeek = 1;

/* =========================
   COLORS
========================= */
const COLORS = [
  "#ff6b6b","#f06595","#cc5de8","#845ef7","#5c7cfa",
  "#339af0","#22b8cf","#20c997","#51cf66","#94d82d",
  "#fcc419","#ff922b","#ff6b6b","#e64980","#be4bdb",
  "#7950f2","#4c6ef5","#228be6","#15aabf","#12b886",
  "#40c057","#82c91e","#fab005","#fd7e14","#fa5252",
  "#d6336c","#ae3ec9","#7048e8","#4263eb","#1c7ed6"
];

const RANKS = [
  { name:"Rookie",      value:10  },
  { name:"Veteran",     value:25  },
  { name:"Pro",         value:40  },
  { name:"Master",      value:60  },
  { name:"Grandmaster", value:80  },
  { name:"Hacker",      value:100 }
];

const DAY_LABELS = ["MON","TUE","WED","THU","FRI","SAT","SUN"];

/* =========================
   LOAD DATA
========================= */
let appData = loadData();

if(!appData){
  appData = {
    title:"Junior Pentester 30 Days",
    description:"Interactive Progress Tracker",
    days:Array.from({ length:30 }, (_,i) => ({
      day:i+1,
      tasks:[],
      completed:[]
    }))
  };
  saveData();
}

function saveData(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

function loadData(){
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : null;
}

/* =========================
   PARTICLE BACKGROUND
========================= */
(function initParticles(){
  const canvas = document.getElementById("particleBg");
  const ctx = canvas.getContext("2d");
  let particles = [];

  function resize(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  function spawnParticle(){
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height + canvas.height * 0.3,
      r: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.5 + 0.1,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -(Math.random() * 0.5 + 0.2),
      color: COLORS[Math.floor(Math.random()*COLORS.length)],
      life: 0,
      maxLife: Math.random() * 200 + 100
    };
  }

  for(let i = 0; i < 60; i++) particles.push(spawnParticle());

  function animateParticles(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach((p,i) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      const t = p.life / p.maxLife;
      const alpha = p.alpha * (1 - t);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = p.color + Math.floor(alpha*255).toString(16).padStart(2,'0');
      ctx.fill();
      if(p.life >= p.maxLife){
        particles[i] = spawnParticle();
      }
    });
    requestAnimationFrame(animateParticles);
  }
  animateParticles();
})();

/* =========================
   SIDEBAR
========================= */
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const sidebarOverlay = document.getElementById("sidebarOverlay");

sidebarToggle.onclick = () => {
  sidebar.classList.toggle("collapsed");
  if(window.innerWidth <= 980){
    if(!sidebar.classList.contains("collapsed")){
      sidebarOverlay.classList.add("active");
    } else {
      sidebarOverlay.classList.remove("active");
    }
  }
};

sidebarOverlay.onclick = () => {
  sidebar.classList.add("collapsed");
  sidebarOverlay.classList.remove("active");
};

if(window.innerWidth <= 980){
  sidebar.classList.add("collapsed");
}

/* =========================
   DRAW CIRCLE (mini day cards)
========================= */
function drawCircle(canvas, percent, color, thickness=8){
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0,0,w,h);
  const cx=w/2, cy=h/2, r=(w/2)-6;

  ctx.beginPath();
  ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.strokeStyle="#1d2147";
  ctx.lineWidth=thickness;
  ctx.stroke();

  if(percent > 0){
    ctx.beginPath();
    ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+(Math.PI*2*percent));
    ctx.strokeStyle=color;
    ctx.lineWidth=thickness;
    ctx.lineCap="round";
    ctx.stroke();
  }
}

/* =========================
   PROGRESS HELPERS
========================= */
function getDayProgress(dayNumber){
  const day = appData.days.find(d=>d.day===dayNumber);
  if(!day || day.tasks.length===0) return 0;
  return day.completed.length / day.tasks.length;
}

function getOverallProgress(){
  let total=0, completed=0;
  appData.days.forEach(d=>{ total+=d.tasks.length; completed+=d.completed.length; });
  return total===0 ? 0 : completed/total;
}

/* =========================
   HEADER
========================= */
function renderHeader(){
  document.getElementById("mainTitle").textContent = appData.title;
  document.getElementById("mainDescription").textContent = appData.description || "Interactive Progress Tracker";
}

/* =========================
   OVERALL CIRCLE
   Uses canvas.width/height so it works at any size
========================= */
function renderOverallProgress(){
  const canvas = document.getElementById("overallCanvas");

  // Read the actual rendered CSS width — works at any breakpoint
  const rect = canvas.getBoundingClientRect();
  const size = Math.round(rect.width) || 200;

  // Sync drawing buffer to CSS display size
  canvas.width  = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size / 2 - 29;
  const step = maxRadius / 40;

  for(let i = 0; i < 30; i++){
    const radius = maxRadius - (i * step);
    if(radius <= 2) break;
    const start = -Math.PI / 2;
    const end = start + (Math.PI * 2 * getDayProgress(i + 1));
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "#1b1f3d";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, end);
    ctx.strokeStyle = COLORS[i];
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  const percent = Math.floor(getOverallProgress() * 100);
  document.getElementById("overallPercent").textContent = `${percent}%`;
  renderRankSystem(percent);
}

/* =========================
   RANK SYSTEM
========================= */
function renderRankSystem(percent){
  const container = document.querySelector(".rank-system");
  container.innerHTML="";
  RANKS.forEach(rank=>{
    const line=document.createElement("div");
    line.className="rank-line";
    const name=document.createElement("div");
    name.className="rank-name";
    name.textContent=rank.name;
    const bar=document.createElement("div");
    bar.className="rank-bar";
    const fill=document.createElement("div");
    fill.className="rank-fill";
    let width=0;
    if(percent>=rank.value){ width=100; }
    else { width=(percent/rank.value)*100; }
    fill.style.width="0%";
    bar.appendChild(fill);
    line.appendChild(name);
    line.appendChild(bar);
    container.appendChild(line);
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        fill.style.width=`${Math.max(0,Math.min(width,100))}%`;
      });
    });
  });
}

/* =========================
   DAYS GRID
========================= */
function renderDaysGrid(){
  const grid = document.getElementById("daysGrid");
  grid.innerHTML="";
  appData.days.forEach((day,index)=>{
    const card=document.createElement("div");
    card.className="day-card";
    card.style.animationDelay=`${index*0.03}s`;
    if(currentDay===day.day) card.classList.add("active");
    const canvas=document.createElement("canvas");
    canvas.width=80; canvas.height=80;
    const title=document.createElement("h4");
    title.textContent=`Day ${day.day}`;
    card.appendChild(canvas);
    card.appendChild(title);
    grid.appendChild(card);
    drawCircle(canvas, getDayProgress(day.day), COLORS[index]);
    card.onclick=()=>{
      currentDay=day.day;
      render();
      if(window.innerWidth<=980){
        sidebar.classList.add("collapsed");
        sidebarOverlay.classList.remove("active");
      }
    };
  });
}

/* =========================
   TASKS + DAY HEADER
========================= */
function renderTasks(){
  const container = document.getElementById("tasksContainer");
  container.innerHTML="";
  const day = appData.days.find(d=>d.day===currentDay);

  document.getElementById("dayNum").textContent = String(currentDay).padStart(2,"0");
  document.getElementById("navCurrentDay").textContent = currentDay;
  document.getElementById("currentDayTitle").textContent = `Day ${currentDay} Tasks`;

  const totalTasks = day?.tasks?.length || 0;
  const doneTasks  = day?.completed?.length || 0;
  const dayPct     = totalTasks === 0 ? 0 : (doneTasks / totalTasks) * 100;

  document.getElementById("dayProgressLabel").textContent = `${doneTasks} of ${totalTasks} completed`;
  document.getElementById("dayProgressBar").style.width = `${dayPct}%`;

  if(!day || day.tasks.length===0){
    container.innerHTML=`<div class="task-item"><label>No tasks added.</label></div>`;
    return;
  }

  day.tasks.forEach((task,index)=>{
    const item=document.createElement("div");
    item.className="task-item";
    item.style.animationDelay=`${index*0.07}s`;
    const checked=day.completed.includes(index);
    if(checked) item.classList.add("completed");
    const checkbox=document.createElement("input");
    checkbox.type="checkbox";
    checkbox.checked=checked;
    checkbox.onchange=()=>{
      if(checkbox.checked){
        if(!day.completed.includes(index)) day.completed.push(index);
      } else {
        day.completed=day.completed.filter(i=>i!==index);
      }
      saveData();
      render();
    };
    const label=document.createElement("label");
    label.textContent=task;
    label.onclick=()=>{ checkbox.click(); };
    item.appendChild(checkbox);
    item.appendChild(label);
    container.appendChild(item);
  });
}

/* =========================
   PLAN
========================= */
function renderPlanText(){
  const el=document.getElementById("planText");
  let text="";
  appData.days.forEach(day=>{
    text+=`DAY ${day.day}\n`;
    if(day.tasks.length===0){ text+="  • No Tasks\n\n"; }
    else {
      day.tasks.forEach(t=>{ text+=`  • ${t}\n`; });
      text+="\n";
    }
  });
  el.textContent=text;
}

/* =========================
   STATS (sidebar intel)
========================= */
function renderStats(){
  const completed=appData.days.reduce((a,d)=>a+d.completed.length,0);
  const total=appData.days.reduce((a,d)=>a+d.tasks.length,0);
  document.getElementById("statsText").textContent=`${completed} / ${total} tasks completed`;
  const day=appData.days.find(d=>d.day===currentDay);
  document.getElementById("focusText").textContent=
    day?.tasks?.[0] ? `${day.tasks[0]}` : "No tasks for today.";
}

/* =========================
   WEEKLY MONITOR
========================= */
function getWeekData(week){
  const startDay = (week - 1) * 7 + 1;
  return Array.from({ length: 7 }, (_, i) => {
    const dayNum = startDay + i;
    if(dayNum > 30) return null;
    const d = appData.days.find(x => x.day === dayNum);
    return d || { day: dayNum, tasks: [], completed: [] };
  });
}

function renderWeeklyMonitor(){
  const totalWeeks = 5;
  const tabsEl   = document.getElementById("weekTabs");
  const barsEl   = document.getElementById("weeklyBars");
  const statsEl  = document.getElementById("weeklyStatsRow");

  tabsEl.innerHTML = "";
  for(let w = 1; w <= totalWeeks; w++){
    const btn = document.createElement("button");
    btn.className = "week-tab" + (w === activeWeek ? " active" : "");
    btn.textContent = `W${w}`;
    btn.onclick = () => {
      activeWeek = w;
      renderWeeklyMonitor();
    };
    tabsEl.appendChild(btn);
  }

  barsEl.innerHTML = "";
  const weekDays = getWeekData(activeWeek);

  let weekTasks = 0, weekDone = 0;

  weekDays.forEach((d, i) => {
    const wrap = document.createElement("div");
    wrap.className = "weekly-bar-wrap";

    const bg = document.createElement("div");
    bg.className = "weekly-bar-bg";

    const fill = document.createElement("div");
    fill.className = "weekly-bar-fill";

    const label = document.createElement("div");
    label.className = "weekly-bar-label";

    if(!d){
      fill.classList.add("empty");
      fill.style.height = "0%";
      label.textContent = "—";
      bg.appendChild(fill);
      wrap.appendChild(bg);
      wrap.appendChild(label);
      barsEl.appendChild(wrap);
      return;
    }

    const total = d.tasks.length;
    const done  = d.completed.length;
    weekTasks += total;
    weekDone  += done;

    const pct = total === 0 ? 0 : done / total;

    if(pct === 1 && total > 0){
      fill.classList.add("done");
    } else if(pct > 0){
      fill.classList.add("partial");
    } else {
      fill.classList.add("empty");
    }

    label.textContent = DAY_LABELS[i];
    if(d.day === currentDay) label.classList.add("active-day");

    fill.style.height = "0%";
    bg.appendChild(fill);
    wrap.appendChild(bg);
    wrap.appendChild(label);
    barsEl.appendChild(wrap);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fill.style.height = `${Math.round(pct * 100)}%`;
      });
    });

    bg.title = `Day ${d.day}: ${done}/${total}`;
    bg.onclick = () => {
      currentDay = d.day;
      render();
    };
  });

  const weekPct = weekTasks === 0 ? 0 : Math.round((weekDone / weekTasks) * 100);
  statsEl.innerHTML = `
    <div class="weekly-stat">
      <div class="weekly-stat-val">${weekDone}</div>
      <span class="weekly-stat-label">DONE</span>
    </div>
    <div class="weekly-stat">
      <div class="weekly-stat-val">${weekTasks}</div>
      <span class="weekly-stat-label">TOTAL</span>
    </div>
    <div class="weekly-stat">
      <div class="weekly-stat-val">${weekPct}%</div>
      <span class="weekly-stat-label">RATE</span>
    </div>
  `;
}

/* =========================
   MAIN RENDER
========================= */
function render(){
  renderHeader();
  renderOverallProgress();
  renderDaysGrid();
  renderTasks();
  renderPlanText();
  renderStats();
  activeWeek = Math.ceil(currentDay / 7);
  renderWeeklyMonitor();
}

render();

/* =========================
   NAVIGATION
========================= */
document.getElementById("prevDayBtn").onclick=()=>{
  if(currentDay>1){ currentDay--; render(); }
};
document.getElementById("nextDayBtn").onclick=()=>{
  if(currentDay<30){ currentDay++; render(); }
};

/* =========================
   JSON MODAL
========================= */
const jsonModal=document.getElementById("jsonModal");
document.getElementById("openModalBtn").onclick=()=>{ jsonModal.classList.remove("hidden"); };
document.getElementById("closeModalBtn").onclick=()=>{ jsonModal.classList.add("hidden"); };

/* =========================
   SETTINGS MODAL
========================= */
const settingsModal=document.getElementById("settingsModal");
document.getElementById("openSettingsBtn").onclick=()=>{ settingsModal.classList.remove("hidden"); };
document.getElementById("closeSettingsBtn").onclick=()=>{ settingsModal.classList.add("hidden"); };

/* =========================
   SAVE JSON
========================= */
document.getElementById("saveJsonBtn").onclick=()=>{
  try{
    const raw=document.getElementById("jsonInput").value;
    const parsed=JSON.parse(raw);
    if(!parsed.days || !Array.isArray(parsed.days)){ alert("Invalid JSON format."); return; }
    const newDays=Array.from({length:30},(_,i)=>{
      const found=parsed.days.find(d=>d.day===i+1);
      return { day:i+1, tasks:found?.tasks||[], completed:[] };
    });
    appData={ title:parsed.title||"30 Days Plan", description:parsed.description||"Interactive Progress Tracker", days:newDays };
    saveData();
    currentDay=1;
    render();
    jsonModal.classList.add("hidden");
    alert("Plan Imported Successfully");
  }catch{ alert("JSON Parse Error"); }
};

/* =========================
   RESET
========================= */
document.getElementById("resetBtn").onclick=()=>{
  if(!confirm("Reset all progress?")) return;
  appData.days.forEach(d=>{ d.completed=[]; });
  saveData();
  render();
};

/* =========================
   AI CONFIG
========================= */
function loadAiConfig(){
  const config=JSON.parse(localStorage.getItem(AI_CONFIG_KEY)||"null");
  if(!config) return;
  document.getElementById("apiBase").value=config.base||"";
  document.getElementById("modelName").value=config.model||"";
  document.getElementById("apiKey").value=config.key||"";
}
loadAiConfig();

document.getElementById("saveAiConfigBtn").onclick=()=>{
  const config={
    base:document.getElementById("apiBase").value,
    model:document.getElementById("modelName").value,
    key:document.getElementById("apiKey").value
  };
  localStorage.setItem(AI_CONFIG_KEY,JSON.stringify(config));
  alert("AI Config Saved");
  settingsModal.classList.add("hidden");
};

/* =========================
   AI CORE
========================= */
function getAiConfig(){
  return JSON.parse(localStorage.getItem(AI_CONFIG_KEY)||"null");
}

function buildPrompt(question){
  const completed=Math.floor(getOverallProgress()*100);
  const day=appData.days.find(d=>d.day===currentDay);
  const dayTasks=day?.tasks?.join(", ")||"none";
  return `You are an AI pentesting mentor and productivity assistant.

Current progress: ${completed}% overall completed.
Current Day: ${currentDay}
Today's tasks: ${dayTasks}

User question:
${question}

Keep response concise and useful (2-4 sentences max).`;
}

async function callAI(question, chatBoxEl){
  const config=getAiConfig();
  if(!config?.key || !config?.model){
    appendMessage("Please configure AI settings first (⚙ button).", "ai", chatBoxEl);
    return;
  }

  const dots=document.createElement("div");
  dots.className="typing-dots";
  dots.innerHTML="<span></span><span></span><span></span>";
  chatBoxEl.appendChild(dots);
  chatBoxEl.scrollTop=chatBoxEl.scrollHeight;

  try{
    const response=await fetch(`${config.base}/chat/completions`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":`Bearer ${config.key}`
      },
      body:JSON.stringify({
        model:config.model,
        messages:[{ role:"user", content:buildPrompt(question) }]
      })
    });
    dots.remove();
    const data=await response.json();
    appendMessage(data.choices?.[0]?.message?.content || "No response.", "ai", chatBoxEl);
  }catch(err){
    dots.remove();
    appendMessage("AI request failed. Check your config.", "ai", chatBoxEl);
  }
}

function appendMessage(text, type="ai", chatBoxEl){
  const div=document.createElement("div");
  div.className=type==="user" ? "user-message" : "ai-message";
  if(type==="ai"){
    const prefix=document.createElement("span");
    prefix.className="ai-prefix";
    prefix.textContent="◈ NEXUS /";
    div.appendChild(prefix);
    div.appendChild(document.createTextNode(text));
  } else {
    div.textContent=text;
  }
  chatBoxEl.appendChild(div);
  chatBoxEl.scrollTop=chatBoxEl.scrollHeight;
}

/* =========================
   DESKTOP CHAT
========================= */
const askAiBtn=document.getElementById("askAiBtn");
const aiQuestion=document.getElementById("aiQuestion");
const chatBox=document.getElementById("chatBox");

async function askAIDesktop(){
  const q=aiQuestion.value.trim();
  if(!q) return;
  appendMessage(q,"user",chatBox);
  aiQuestion.value="";
  await callAI(q, chatBox);
}

askAiBtn.onclick=askAIDesktop;
aiQuestion.addEventListener("keypress",e=>{ if(e.key==="Enter") askAIDesktop(); });

/* =========================
   MOBILE AI DRAWER
========================= */
const mobileAiFab=document.getElementById("mobileAiFab");
const mobileAiDrawer=document.getElementById("mobileAiDrawer");
const mobileAiClose=document.getElementById("mobileAiClose");
const mobileAskAiBtn=document.getElementById("mobileAskAiBtn");
const mobileAiQuestion=document.getElementById("mobileAiQuestion");
const mobileChatBox=document.getElementById("mobileChatBox");

mobileAiFab.onclick=()=>{ mobileAiDrawer.classList.add("open"); };
mobileAiClose.onclick=()=>{ mobileAiDrawer.classList.remove("open"); };
mobileAiDrawer.onclick=(e)=>{
  if(e.target===mobileAiDrawer) mobileAiDrawer.classList.remove("open");
};

async function askAIMobile(){
  const q=mobileAiQuestion.value.trim();
  if(!q) return;
  appendMessage(q,"user",mobileChatBox);
  mobileAiQuestion.value="";
  await callAI(q, mobileChatBox);
}

mobileAskAiBtn.onclick=askAIMobile;
mobileAiQuestion.addEventListener("keypress",e=>{ if(e.key==="Enter") askAIMobile(); });

function checkFabVisibility(){
  mobileAiFab.style.display = window.innerWidth<=768 ? "flex" : "none";
}
checkFabVisibility();
window.addEventListener("resize", checkFabVisibility);

/* =========================
   CLOCK
========================= */
function updateClock(){
  const el=document.getElementById("digitalClock");
  if(!el) return;
  const now=new Date();
  let h=now.getHours();
  const m=String(now.getMinutes()).padStart(2,"0");
  const s=String(now.getSeconds()).padStart(2,"0");
  const ampm=h>=12?"PM":"AM";
  h=h%12||12;
  el.textContent=`${String(h).padStart(2,"0")}:${m}:${s} ${ampm}`;
}

// Re-render on resize so canvas adjusts to screen size
window.addEventListener("resize", () => { render(); });