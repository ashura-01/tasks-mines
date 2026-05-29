/* =========================
   STORAGE
========================= */

const STORAGE_KEY = "tracker_30_days_data";
const AI_CONFIG_KEY = "tracker_ai_config";

let currentDay = 1;

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

/* =========================
   RANKS
========================= */

const RANKS = [
  { name:"Rookie", value:10 },
  { name:"Veteran", value:25 },
  { name:"Pro", value:40 },
  { name:"Master", value:60 },
  { name:"Grandmaster", value:80 },
  { name:"Hacker", value:100 }
];

/* =========================
   LOAD DATA
========================= */

let appData = loadData();

if(!appData){

  appData = {
    title:"Junior Pentester 30 Days",
    description:"Interactive Progress Tracker",

    days:Array.from(
      { length:30 },
      (_, i) => ({
        day:i + 1,
        tasks:[],
        completed:[]
      })
    )
  };

  saveData();
}

/* =========================
   STORAGE FUNCTIONS
========================= */

function saveData(){

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(appData)
  );
}

function loadData(){

  const data =
    localStorage.getItem(STORAGE_KEY);

  return data
    ? JSON.parse(data)
    : null;
}

/* =========================
   SIDEBAR
========================= */

const sidebar =
  document.getElementById("sidebar");

const sidebarToggle =
  document.getElementById("sidebarToggle");

const sidebarOverlay =
  document.getElementById("sidebarOverlay");

sidebarToggle.onclick = () => {

  sidebar.classList.toggle("collapsed");

  if(window.innerWidth <= 980){

    if(
      !sidebar.classList.contains("collapsed")
    ){

      sidebarOverlay.classList.add("active");

    }else{

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
   DRAW CIRCLE
========================= */

function drawCircle(
  canvas,
  percent,
  color,
  thickness = 8
){

  const ctx =
    canvas.getContext("2d");

  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0,0,w,h);

  const centerX = w / 2;
  const centerY = h / 2;

  const radius =
    (w / 2) - 20;

  ctx.beginPath();

  ctx.arc(
    centerX,
    centerY,
    radius,
    0,
    Math.PI * 2
  );

  ctx.strokeStyle = "#1d2147";
  ctx.lineWidth = thickness;

  ctx.stroke();

  ctx.beginPath();

  ctx.arc(
    centerX,
    centerY,
    radius,
    -Math.PI / 2,
    (-Math.PI / 2) +
    (Math.PI * 2 * percent)
  );

  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.lineCap = "round";

  ctx.stroke();
}

/* =========================
   PROGRESS
========================= */

function getDayProgress(dayNumber){

  const day =
    appData.days.find(
      d => d.day === dayNumber
    );

  if(
    !day ||
    day.tasks.length === 0
  ){
    return 0;
  }

  return (
    day.completed.length /
    day.tasks.length
  );
}

function getOverallProgress(){

  let totalTasks = 0;
  let completedTasks = 0;

  appData.days.forEach(day => {

    totalTasks += day.tasks.length;

    completedTasks += day.completed.length;
  });

  if(totalTasks === 0){
    return 0;
  }

  return completedTasks / totalTasks;
}

/* =========================
   HEADER
========================= */

function renderHeader(){

  document.getElementById(
    "mainTitle"
  ).textContent =
    appData.title;

  document.getElementById(
    "mainDescription"
  ).textContent =
    appData.description ||
    "Interactive Progress Tracker";
}

/* =========================
   OVERALL CIRCLE
========================= */

function renderOverallProgress(){

  const canvas =
    document.getElementById(
      "overallCanvas"
    );

  const ctx =
    canvas.getContext("2d");

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  const cx =
    canvas.width / 2;

  const cy =
    canvas.height / 2;

  for(let i = 0; i < 30; i++){

    const radius =
      140 - (i * 2.9);

    const start =
      -Math.PI / 2;

    const end =
      start +
      (
        Math.PI * 2 *
        getDayProgress(i + 1)
      );

    ctx.beginPath();

    ctx.arc(
      cx,
      cy,
      radius,
      0,
      Math.PI * 2
    );

    ctx.strokeStyle = "#1b1f3d";
    ctx.lineWidth = 2;

    ctx.stroke();

    ctx.beginPath();

    ctx.arc(
      cx,
      cy,
      radius,
      start,
      end
    );

    ctx.strokeStyle =
      COLORS[i];

    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";

    ctx.stroke();
  }

  const percent =
    Math.floor(
      getOverallProgress() * 100
    );

  document.getElementById(
    "overallPercent"
  ).textContent =
    `${percent}%`;

  renderRankSystem(percent);
}

/* =========================
   RANK SYSTEM
========================= */

function renderRankSystem(percent){

  const container =
    document.querySelector(
      ".rank-system"
    );

  container.innerHTML = "";

  RANKS.forEach(rank => {

    const line =
      document.createElement("div");

    line.className =
      "rank-line";

    const name =
      document.createElement("div");

    name.className =
      "rank-name";

    name.textContent =
      rank.name;

    const bar =
      document.createElement("div");

    bar.className =
      "rank-bar";

    const fill =
      document.createElement("div");

    fill.className =
      "rank-fill";

    let width = 0;

    if(percent >= rank.value){

      width = 100;

    }else{

      width =
        (percent / rank.value) * 100;
    }

    fill.style.width =
      `${Math.max(0,Math.min(width,100))}%`;

    bar.appendChild(fill);

    line.appendChild(name);
    line.appendChild(bar);

    container.appendChild(line);
  });
}

/* =========================
   DAYS GRID
========================= */

function renderDaysGrid(){

  const grid =
    document.getElementById(
      "daysGrid"
    );

  grid.innerHTML = "";

  appData.days.forEach(
    (day, index) => {

      const card =
        document.createElement("div");

      card.className =
        "day-card";

      if(currentDay === day.day){
        card.classList.add("active");
      }

      const canvas =
        document.createElement("canvas");

      canvas.width = 80;
      canvas.height = 80;

      const title =
        document.createElement("h4");

      title.textContent =
        `Day ${day.day}`;

      card.appendChild(canvas);
      card.appendChild(title);

      grid.appendChild(card);

      drawCircle(
        canvas,
        getDayProgress(day.day),
        COLORS[index]
      );

      card.onclick = () => {

        currentDay = day.day;

        render();

        if(window.innerWidth <= 980){

          sidebar.classList.add(
            "collapsed"
          );

          sidebarOverlay.classList.remove(
            "active"
          );
        }
      };
    }
  );
}

/* =========================
   TASKS
========================= */

function renderTasks(){

  const container =
    document.getElementById(
      "tasksContainer"
    );

  container.innerHTML = "";

  const day =
    appData.days.find(
      d => d.day === currentDay
    );

  document.getElementById(
    "currentDayTitle"
  ).textContent =
    `Day ${currentDay} Tasks`;

  if(
    !day ||
    day.tasks.length === 0
  ){

    container.innerHTML = `
      <div class="task-item">
        <label>No tasks added.</label>
      </div>
    `;

    return;
  }

  day.tasks.forEach(
    (task, index) => {

      const item =
        document.createElement("div");

      item.className =
        "task-item";

      const checked =
        day.completed.includes(index);

      if(checked){
        item.classList.add("completed");
      }

      const checkbox =
        document.createElement("input");

      checkbox.type = "checkbox";
      checkbox.checked = checked;

      checkbox.onchange = () => {

        if(checkbox.checked){

          if(
            !day.completed.includes(index)
          ){

            day.completed.push(index);
          }

        }else{

          day.completed =
            day.completed.filter(
              i => i !== index
            );
        }

        saveData();
        render();
      };

      const label =
        document.createElement("label");

      label.textContent = task;

      item.appendChild(checkbox);
      item.appendChild(label);

      container.appendChild(item);
    }
  );
}

/* =========================
   PLAN
========================= */

function renderPlanText(){

  const el =
    document.getElementById(
      "planText"
    );

  let text = "";

  appData.days.forEach(day => {

    text += `DAY ${day.day}\n`;

    if(day.tasks.length === 0){

      text += "  • No Tasks\n\n";

    }else{

      day.tasks.forEach(task => {

        text += `  • ${task}\n`;
      });

      text += "\n";
    }
  });

  el.textContent = text;
}

/* =========================
   STATS
========================= */

function renderStats(){

  const completed =
    appData.days.reduce(
      (acc, day) =>
        acc + day.completed.length,
      0
    );

  const total =
    appData.days.reduce(
      (acc, day) =>
        acc + day.tasks.length,
      0
    );

  document.getElementById(
    "statsText"
  ).textContent =
    `${completed} / ${total} tasks completed`;

  const day =
    appData.days.find(
      d => d.day === currentDay
    );

  document.getElementById(
    "focusText"
  ).textContent =
    day?.tasks?.[0]
      ? `Today's focus: ${day.tasks[0]}`
      : "No tasks for today.";
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
}

render();

/* =========================
   NAVIGATION
========================= */

document.getElementById(
  "prevDayBtn"
).onclick = () => {

  if(currentDay > 1){

    currentDay--;

    render();
  }
};

document.getElementById(
  "nextDayBtn"
).onclick = () => {

  if(currentDay < 30){

    currentDay++;

    render();
  }
};

/* =========================
   JSON MODAL
========================= */

const jsonModal =
  document.getElementById(
    "jsonModal"
  );

document.getElementById(
  "openModalBtn"
).onclick = () => {

  jsonModal.classList.remove(
    "hidden"
  );
};

document.getElementById(
  "closeModalBtn"
).onclick = () => {

  jsonModal.classList.add(
    "hidden"
  );
};

/* =========================
   SETTINGS MODAL
========================= */

const settingsModal =
  document.getElementById(
    "settingsModal"
  );

document.getElementById(
  "openSettingsBtn"
).onclick = () => {

  settingsModal.classList.remove(
    "hidden"
  );
};

document.getElementById(
  "closeSettingsBtn"
).onclick = () => {

  settingsModal.classList.add(
    "hidden"
  );
};

/* =========================
   SAVE JSON
========================= */

document.getElementById(
  "saveJsonBtn"
).onclick = () => {

  try{

    const raw =
      document.getElementById(
        "jsonInput"
      ).value;

    const parsed =
      JSON.parse(raw);

    if(
      !parsed.days ||
      !Array.isArray(parsed.days)
    ){

      alert(
        "Invalid JSON format."
      );

      return;
    }

    const newDays =
      Array.from(
        { length:30 },
        (_, i) => {

          const found =
            parsed.days.find(
              d => d.day === i + 1
            );

          return {
            day:i + 1,
            tasks:
              found?.tasks || [],
            completed:[]
          };
        }
      );

    appData = {

      title:
        parsed.title ||
        "30 Days Plan",

      description:
        parsed.description ||
        "Interactive Progress Tracker",

      days:newDays
    };

    saveData();

    currentDay = 1;

    render();

    jsonModal.classList.add(
      "hidden"
    );

    alert(
      "Plan Imported Successfully"
    );

  }catch{

    alert(
      "JSON Parse Error"
    );
  }
};

/* =========================
   RESET
========================= */

document.getElementById(
  "resetBtn"
).onclick = () => {

  const confirmReset =
    confirm(
      "Reset all progress?"
    );

  if(!confirmReset) return;

  appData.days.forEach(day => {
    day.completed = [];
  });

  saveData();

  render();
};

/* =========================
   AI CONFIG
========================= */

function loadAiConfig(){

  const config =
    JSON.parse(
      localStorage.getItem(
        AI_CONFIG_KEY
      )
    );

  if(!config) return;

  document.getElementById(
    "apiBase"
  ).value =
    config.base || "";

  document.getElementById(
    "modelName"
  ).value =
    config.model || "";

  document.getElementById(
    "apiKey"
  ).value =
    config.key || "";
}

loadAiConfig();

document.getElementById(
  "saveAiConfigBtn"
).onclick = () => {

  const config = {

    base:
      document.getElementById(
        "apiBase"
      ).value,

    model:
      document.getElementById(
        "modelName"
      ).value,

    key:
      document.getElementById(
        "apiKey"
      ).value
  };

  localStorage.setItem(
    AI_CONFIG_KEY,
    JSON.stringify(config)
  );

  alert(
    "AI Config Saved"
  );

  settingsModal.classList.add(
    "hidden"
  );
};

/* =========================
   CHAT
========================= */

const askAiBtn =
  document.getElementById(
    "askAiBtn"
  );

const aiQuestion =
  document.getElementById(
    "aiQuestion"
  );

const chatBox =
  document.getElementById(
    "chatBox"
  );

function addMessage(
  text,
  type = "ai"
){

  const div =
    document.createElement("div");

  div.className =
    type === "user"
      ? "user-message"
      : "ai-message";

  div.textContent = text;

  chatBox.appendChild(div);

  chatBox.scrollTop =
    chatBox.scrollHeight;
}

async function askAI(){

  const question =
    aiQuestion.value.trim();

  if(!question) return;

  addMessage(
    question,
    "user"
  );

  aiQuestion.value = "";

  const config =
    JSON.parse(
      localStorage.getItem(
        AI_CONFIG_KEY
      )
    );

  if(
    !config?.key ||
    !config?.model
  ){

    addMessage(
      "Please configure AI settings first."
    );

    return;
  }

  addMessage(
    "Thinking..."
  );

  try{

    const completed =
      Math.floor(
        getOverallProgress() * 100
      );

    const prompt = `
You are an AI pentesting mentor and productivity assistant.

Current progress:
${completed}% completed.

User question:
${question}

Keep response concise and useful.
`;

    const response =
      await fetch(
        `${config.base}/chat/completions`,
        {
          method:"POST",

          headers:{
            "Content-Type":"application/json",
            "Authorization":
              `Bearer ${config.key}`
          },

          body:JSON.stringify({

            model:config.model,

            messages:[
              {
                role:"user",
                content:prompt
              }
            ]
          })
        }
      );

    const data =
      await response.json();

    const thinking =
      chatBox.lastChild;

    thinking.remove();

    addMessage(
      data.choices?.[0]?.message?.content ||
      "No response."
    );

  }catch{

    const thinking =
      chatBox.lastChild;

    thinking.remove();

    addMessage(
      "AI request failed."
    );
  }
}

askAiBtn.onclick = askAI;

aiQuestion.addEventListener(
  "keypress",
  e => {

    if(e.key === "Enter"){
      askAI();
    }
  }
);
// --- Live 12-Hour Format Clock Extension ---
function updateRightPanelClock() {
    const clockElement = document.getElementById('digitalClock');
    if (!clockElement) return;

    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';

    // Convert standard military 24h structure back down to standard 12h
    hours = hours % 12;
    hours = hours ? hours : 12; // The hour '0' should be rendered as '12'
    const formattedHours = String(hours).padStart(2, '0');

    clockElement.textContent = `${formattedHours}:${minutes}:${seconds} ${ampm}`;
}

// Initial cycle execution and setup loop configuration
updateRightPanelClock();
setInterval(updateRightPanelClock, 1000);