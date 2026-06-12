/* =========================
   STORAGE
========================= */
const STORAGE_KEY = "tracker_30_days_data";
const AI_CONFIG_KEY = "tracker_ai_config";

let currentDay = 1;
let activeWeek = 1;
let focusDebounceTimer = null;
let lastFocusDay = null; // track which day focus was last generated for

/* =========================
   COLORS
========================= */
const COLORS = [
  "#ff6b6b", "#f06595", "#cc5de8", "#845ef7", "#5c7cfa",
  "#339af0", "#22b8cf", "#20c997", "#51cf66", "#94d82d",
  "#fcc419", "#ff922b", "#ff6b6b", "#e64980", "#be4bdb",
  "#7950f2", "#4c6ef5", "#228be6", "#15aabf", "#12b886",
  "#40c057", "#82c91e", "#fab005", "#fd7e14", "#fa5252",
  "#d6336c", "#ae3ec9", "#7048e8", "#4263eb", "#1c7ed6"
];

const RANKS = [
  { name: "Rookie", value: 10 },
  { name: "Veteran", value: 25 },
  { name: "Pro", value: 40 },
  { name: "Master", value: 60 },
  { name: "Grandmaster", value: 80 },
  { name: "Hacker", value: 100 }
];

const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

/* =========================
   TASK HELPERS
   Tasks are stored internally as { task: string, link: string|null }
   JSON input supports both plain strings and objects
========================= */
function normalizeTask(raw) {
  if (typeof raw === "string") return { task: raw, link: null };
  return { task: raw.task || raw.name || "", link: raw.link || raw.url || null };
}

function getTaskLabel(t) {
  return typeof t === "string" ? t : (t.task || "");
}

function getTaskLink(t) {
  return typeof t === "string" ? null : (t.link || null);
}

/* =========================
   LOAD DATA
========================= */
let appData = loadData();

if (!appData) {
  appData = {
    title: "Junior Pentester 30 Days",
    description: "Interactive Progress Tracker",
    days: Array.from({ length: 30 }, (_, i) => ({
      day: i + 1,
      tasks: [],
      completed: []
    }))
  };
  saveData();
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

function loadData() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : null;
}

/* =========================
   PARTICLE BACKGROUND
========================= */
(function initParticles() {
  const canvas = document.getElementById("particleBg");
  const ctx = canvas.getContext("2d");
  let particles = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  let _particleResizeTimer = null;
  window.addEventListener("resize", () => { clearTimeout(_particleResizeTimer); _particleResizeTimer = setTimeout(resize, 200); });

  function spawnParticle() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height + canvas.height * 0.3,
      r: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.5 + 0.1,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -(Math.random() * 0.5 + 0.2),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: 0,
      maxLife: Math.random() * 200 + 100
    };
  }

  for (let i = 0; i < 60; i++) particles.push(spawnParticle());

  function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      const t = p.life / p.maxLife;
      const alpha = p.alpha * (1 - t);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      ctx.fill();
      if (p.life >= p.maxLife) {
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
  if (window.innerWidth <= 980) {
    if (!sidebar.classList.contains("collapsed")) {
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

if (window.innerWidth <= 980) {
  sidebar.classList.add("collapsed");
}

/* =========================
   DRAW CIRCLE (mini day cards)
========================= */
function drawCircle(canvas, percent, color, thickness = 8) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2, r = (w / 2) - 6;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = "#1d2147";
  ctx.lineWidth = thickness;
  ctx.stroke();

  if (percent > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * percent));
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.lineCap = "round";
    ctx.stroke();
  }
}

/* =========================
   PROGRESS HELPERS
========================= */
function getDayProgress(dayNumber) {
  const day = appData.days.find(d => d.day === dayNumber);
  if (!day || day.tasks.length === 0) return 0;
  return day.completed.length / day.tasks.length;
}

function getOverallProgress() {
  let total = 0, completed = 0;
  appData.days.forEach(d => { total += d.tasks.length; completed += d.completed.length; });
  return total === 0 ? 0 : completed / total;
}

/* =========================
   BUILD FULL CONTEXT FOR AI
   Returns a structured snapshot of the entire plan
========================= */
function buildFullContext() {
  const overallPct = Math.floor(getOverallProgress() * 100);
  const day = appData.days.find(d => d.day === currentDay);

  // All tasks for current day with status
  const todayTasks = (day?.tasks || []).map((t, i) => {
    const label = getTaskLabel(t);
    const done = day.completed.includes(i);
    return `  [${done ? "✓ DONE" : "○ TODO"}] ${label}`;
  });

  // Completed tasks across all days
  const allCompleted = [];
  appData.days.forEach(d => {
    d.completed.forEach(i => {
      const label = getTaskLabel(d.tasks[i]);
      if (label) allCompleted.push(`Day ${d.day}: ${label}`);
    });
  });

  // Pending tasks for current day
  const pending = (day?.tasks || [])
    .filter((_, i) => !day.completed.includes(i))
    .map(t => getTaskLabel(t));

  // Days with partial or no progress
  const behindDays = appData.days
    .filter(d => d.tasks.length > 0 && d.completed.length < d.tasks.length && d.day < currentDay)
    .map(d => `Day ${d.day} (${d.completed.length}/${d.tasks.length})`);

  return {
    overallPct,
    currentDay,
    planTitle: appData.title,
    todayTasks,
    pendingToday: pending,
    completedToday: (day?.completed || []).map(i => getTaskLabel(day.tasks[i])),
    allCompleted,
    behindDays
  };
}

/* =========================
   HEADER
========================= */
function renderHeader() {
  document.getElementById("mainTitle").textContent = appData.title;
  document.getElementById("mainDescription").textContent = appData.description || "Interactive Progress Tracker";
}

/* =========================
   OVERALL CIRCLE
========================= */
function renderOverallProgress() {
  const canvas = document.getElementById("overallCanvas");
  const rect = canvas.getBoundingClientRect();
  const size = Math.round(rect.width) || 200;
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size / 2 - 29;
  const step = maxRadius / 40;

  for (let i = 0; i < 30; i++) {
    const radius = maxRadius - (i * step);
    if (radius <= 2) break;
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
function renderRankSystem(percent) {
  const container = document.querySelector(".rank-system");
  container.innerHTML = "";
  RANKS.forEach(rank => {
    const line = document.createElement("div");
    line.className = "rank-line";
    const name = document.createElement("div");
    name.className = "rank-name";
    name.textContent = rank.name;
    const bar = document.createElement("div");
    bar.className = "rank-bar";
    const fill = document.createElement("div");
    fill.className = "rank-fill";
    let width = 0;
    if (percent >= rank.value) { width = 100; }
    else { width = (percent / rank.value) * 100; }
    fill.style.width = "0%";
    bar.appendChild(fill);
    line.appendChild(name);
    line.appendChild(bar);
    container.appendChild(line);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fill.style.width = `${Math.max(0, Math.min(width, 100))}%`;
      });
    });
  });
}

/* =========================
   DAYS GRID
========================= */
function renderDaysGrid() {
  const grid = document.getElementById("daysGrid");
  const planSig = appData.title + "_" + appData.days.length;
  const needRebuild = grid.children.length !== appData.days.length || grid.dataset.planSig !== planSig;

  if (needRebuild) {
    grid.innerHTML = "";
    grid.dataset.planSig = planSig;
    appData.days.forEach((day, index) => {
      const card = document.createElement("div");
      card.className = "day-card";
      card.dataset.day = day.day;
      if (currentDay === day.day) card.classList.add("active");
      const canvas = document.createElement("canvas");
      canvas.width = 80; canvas.height = 80;
      const title = document.createElement("h4");
      title.textContent = `Day ${day.day}`;
      card.appendChild(canvas);
      card.appendChild(title);
      grid.appendChild(card);
      drawCircle(canvas, getDayProgress(day.day), COLORS[index]);
      card.onclick = () => {
        currentDay = day.day;
        render();
        if (window.innerWidth <= 980) {
          sidebar.classList.add("collapsed");
          sidebarOverlay.classList.remove("active");
        }
      };
    });
  } else {
    Array.from(grid.children).forEach((card, index) => {
      const day = appData.days[index];
      card.classList.toggle("active", currentDay === day.day);
      const canvas = card.querySelector("canvas");
      drawCircle(canvas, getDayProgress(day.day), COLORS[index]);
    });
  }
}

/* =========================
   TASKS + DAY HEADER
========================= */
function renderTasks() {
  const container = document.getElementById("tasksContainer");
  container.innerHTML = "";
  const day = appData.days.find(d => d.day === currentDay);

  document.getElementById("dayNum").textContent = String(currentDay).padStart(2, "0");
  document.getElementById("navCurrentDay").textContent = currentDay;
  document.getElementById("currentDayTitle").textContent = `Day ${currentDay} Tasks`;

  const totalTasks = day?.tasks?.length || 0;
  const doneTasks = day?.completed?.length || 0;
  const dayPct = totalTasks === 0 ? 0 : (doneTasks / totalTasks) * 100;

  document.getElementById("dayProgressLabel").textContent = `${doneTasks} of ${totalTasks} completed`;
  document.getElementById("dayProgressBar").style.width = `${dayPct}%`;

  if (!day || day.tasks.length === 0) {
    container.innerHTML = `<div class="task-item"><label>No tasks added.</label></div>`;
    return;
  }

  day.tasks.forEach((taskRaw, index) => {
    const taskLabel = getTaskLabel(taskRaw);
    const taskLink = getTaskLink(taskRaw);

    const item = document.createElement("div");
    item.className = "task-item";

    const checked = day.completed.includes(index);
    if (checked) item.classList.add("completed");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = checked;
    checkbox.onchange = () => {
      if (checkbox.checked) {
        if (!day.completed.includes(index)) day.completed.push(index);
        saveData();
        render();
        if (typeof window.checkMilestonesAndNotify === "function") {
          window.checkMilestonesAndNotify(currentDay - 1);
        }
      } else {
        day.completed = day.completed.filter(i => i !== index);
        saveData();
        render();
      }
    };

    const taskBody = document.createElement("div");
    taskBody.className = "task-body";

    const label = document.createElement("label");
    label.textContent = taskLabel;
    label.onclick = () => { checkbox.click(); };

    taskBody.appendChild(label);

    // Link chip
    if (taskLink) {
      const chip = document.createElement("a");
      chip.className = "task-link-chip";
      chip.href = taskLink;
      chip.target = "_blank";
      chip.rel = "noopener noreferrer";
      chip.title = taskLink;

      // Extract domain for display
      let displayUrl = taskLink;
      try {
        const u = new URL(taskLink);
        displayUrl = u.hostname.replace(/^www\./, "");
      } catch (_) { }

      chip.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>${displayUrl}`;
      taskBody.appendChild(chip);
    }

    item.appendChild(checkbox);
    item.appendChild(taskBody);
    container.appendChild(item);
  });
}

/* =========================
   PLAN
========================= */
let _planTextCache = null;
function renderPlanText() {
  const el = document.getElementById("planText");
  let text = "";
  appData.days.forEach(day => {
    text += `DAY ${day.day}\n`;
    if (day.tasks.length === 0) { text += "  • No Tasks\n\n"; }
    else {
      day.tasks.forEach(t => { text += `  • ${getTaskLabel(t)}\n`; });
      text += "\n";
    }
  });
  if (text !== _planTextCache) { el.textContent = text; _planTextCache = text; }
}

/* =========================
   STATS (sidebar intel)
========================= */
function renderStats() {
  const completed = appData.days.reduce((a, d) => a + d.completed.length, 0);
  const total = appData.days.reduce((a, d) => a + d.tasks.length, 0);
  document.getElementById("statsText").textContent = `${completed} / ${total} tasks completed`;
}

/* =========================
   AI-DRIVEN DAILY FOCUS
   Generates a smart motivational + tactical tip from Marko
   based on actual task status for the current day
========================= */
async function renderAiFocus() {
  const config = getAiConfig();
  const focusEl = document.getElementById("focusText");

  // If no AI config, fall back to first pending task
  if (!config?.key || !config?.model) {
    const day = appData.days.find(d => d.day === currentDay);
    const pending = (day?.tasks || []).find((_, i) => !day.completed.includes(i));
    focusEl.textContent = pending ? getTaskLabel(pending) : (day?.tasks?.length ? "All tasks done! 🎉" : "No tasks for today.");
    return;
  }

  // Don't re-generate if same day (avoid hammering API on every checkbox)
  // We use a cache key that includes completion state
  const day = appData.days.find(d => d.day === currentDay);
  const cacheKey = `focus_${currentDay}_${(day?.completed || []).sort().join(",")}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    focusEl.innerHTML = cached;
    return;
  }

  // Show loading dots
  focusEl.innerHTML = `<span class="typing-dots"><span></span><span></span><span></span></span>`;

  const ctx = buildFullContext();
  const doneToday = ctx.completedToday.length;
  const totalToday = (day?.tasks || []).length;
  const pendingToday = ctx.pendingToday;

  const prompt = `You are Marko, a sharp pentesting mentor AI inside a 30-day training tracker. 

Current state:
- Plan: ${ctx.planTitle}
- Overall progress: ${ctx.overallPct}%
- Day ${ctx.currentDay} of 30
- Tasks done today: ${doneToday}/${totalToday}
- Completed today: ${ctx.completedToday.join(", ") || "none yet"}
- Still pending today: ${pendingToday.join(", ") || "all done!"}
- Days behind: ${ctx.behindDays.join(", ") || "none"}

Write a single sharp, tactical focus tip for right now. Max 2 sentences. Be specific to the actual pending tasks. No fluff. Sound like a real mentor, not a chatbot. Don't use generic phrases like "keep it up" or "you've got this".`;

  try {
    const response = await fetch(`${config.base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.key}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 80,
        temperature: 0.7
      })
    });
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "Focus on your next pending task.";
    focusEl.textContent = text;
    sessionStorage.setItem(cacheKey, focusEl.innerHTML);
  } catch (err) {
    const fallback = pendingToday[0] ? `Next: ${pendingToday[0]}` : "All tasks done today!";
    focusEl.textContent = fallback;
  }
}

/* =========================
   WEEKLY MONITOR
========================= */
function getWeekData(week) {
  const startDay = (week - 1) * 7 + 1;
  return Array.from({ length: 7 }, (_, i) => {
    const dayNum = startDay + i;
    if (dayNum > 30) return null;
    const d = appData.days.find(x => x.day === dayNum);
    return d || { day: dayNum, tasks: [], completed: [] };
  });
}

function renderWeeklyMonitor() {
  const totalWeeks = 5;
  const tabsEl = document.getElementById("weekTabs");
  const barsEl = document.getElementById("weeklyBars");
  const statsEl = document.getElementById("weeklyStatsRow");

  tabsEl.innerHTML = "";
  for (let w = 1; w <= totalWeeks; w++) {
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

    if (!d) {
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
    const done = d.completed.length;
    weekTasks += total;
    weekDone += done;

    const pct = total === 0 ? 0 : done / total;

    if (pct === 1 && total > 0) {
      fill.classList.add("done");
    } else if (pct > 0) {
      fill.classList.add("partial");
    } else {
      fill.classList.add("empty");
    }

    label.textContent = DAY_LABELS[i];
    if (d.day === currentDay) label.classList.add("active-day");

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
function render() {
  renderHeader();
  renderOverallProgress();
  renderDaysGrid();
  renderTasks();
  renderPlanText();
  renderStats();
  activeWeek = Math.ceil(currentDay / 7);
  renderWeeklyMonitor();
  // AI focus: debounce slightly so rapid checkbox clicks don't spam
  clearTimeout(focusDebounceTimer);
  focusDebounceTimer = setTimeout(() => {
    renderAiFocus();
  }, 400);
}

render();

/* =========================
   NAVIGATION
========================= */
document.getElementById("prevDayBtn").onclick = () => {
  if (currentDay > 1) { currentDay--; render(); }
};
document.getElementById("nextDayBtn").onclick = () => {
  if (currentDay < 30) { currentDay++; render(); }
};

/* =========================
   JSON MODAL
========================= */
const jsonModal = document.getElementById("jsonModal");
document.getElementById("openModalBtn").onclick = () => { jsonModal.classList.remove("hidden"); };
document.getElementById("closeModalBtn").onclick = () => { jsonModal.classList.add("hidden"); };

/* =========================
   SETTINGS MODAL
========================= */
const settingsModal = document.getElementById("settingsModal");
document.getElementById("openSettingsBtn").onclick = () => { settingsModal.classList.remove("hidden"); };
document.getElementById("closeSettingsBtn").onclick = () => { settingsModal.classList.add("hidden"); };

/* =========================
   SAVE JSON
   Supports tasks as strings OR { task, link } objects
========================= */
document.getElementById("saveJsonBtn").onclick = () => {
  try {
    const raw = document.getElementById("jsonInput").value;
    const parsed = JSON.parse(raw);
    if (!parsed.days || !Array.isArray(parsed.days)) { alert("Invalid JSON format."); return; }
    const newDays = Array.from({ length: 30 }, (_, i) => {
      const found = parsed.days.find(d => d.day === i + 1);
      const rawTasks = found?.tasks || [];
      // Normalize: accept both strings and { task, link } objects
      const tasks = rawTasks.map(t => {
        if (typeof t === "string") return t; // keep as string for backward compat
        return { task: t.task || t.name || "", link: t.link || t.url || null };
      });
      return { day: i + 1, tasks, completed: [] };
    });
    appData = {
      title: parsed.title || "30 Days Plan",
      description: parsed.description || "Interactive Progress Tracker",
      days: newDays
    };
    saveData();
    sessionStorage.clear(); // clear focus cache on new plan
    currentDay = 1;
    render();
    jsonModal.classList.add("hidden");
    alert("Plan Imported Successfully");
  } catch { alert("JSON Parse Error"); }
};

/* =========================
   RESET
========================= */
document.getElementById("resetBtn").onclick = () => {
  if (!confirm("Reset all progress?")) return;
  appData.days.forEach(d => { d.completed = []; });
  sessionStorage.clear();
  saveData();
  render();
};

/* =========================
   AI CONFIG
========================= */
function loadAiConfig() {
  const config = JSON.parse(localStorage.getItem(AI_CONFIG_KEY) || "null");
  if (!config) return;
  document.getElementById("apiBase").value = config.base || "";
  document.getElementById("modelName").value = config.model || "";
  document.getElementById("apiKey").value = config.key || "";
}
loadAiConfig();

document.getElementById("saveAiConfigBtn").onclick = () => {
  const config = {
    base: document.getElementById("apiBase").value,
    model: document.getElementById("modelName").value,
    key: document.getElementById("apiKey").value
  };
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
  sessionStorage.clear(); // clear focus cache so it regenerates with new config
  alert("AI Config Saved");
  settingsModal.classList.add("hidden");
  renderAiFocus(); // immediately re-generate focus with new config
};

/* =========================
   AI CORE
========================= */
function getAiConfig() {
  return JSON.parse(localStorage.getItem(AI_CONFIG_KEY) || "null");
}

function buildPrompt(question) {
  const ctx = buildFullContext();

  // Build a rich task status block
  const taskStatusLines = appData.days.map(d => {
    if (d.tasks.length === 0) return null;
    const doneCount = d.completed.length;
    const totalCount = d.tasks.length;
    const taskLines = d.tasks.map((t, i) => {
      const label = getTaskLabel(t);
      const done = d.completed.includes(i);
      return `      [${done ? "✓" : "○"}] ${label}`;
    }).join("\n");
    return `  Day ${d.day} (${doneCount}/${totalCount} done):\n${taskLines}`;
  }).filter(Boolean).join("\n");

  return `You are Marko, a sharp pentesting mentor AI inside a 30-day training tracker.

=== FULL TRACKER STATE ===
Plan: ${ctx.planTitle}
Overall progress: ${ctx.overallPct}% complete
Current day being viewed: Day ${ctx.currentDay}

Today's task breakdown:
${(appData.days.find(d => d.day === currentDay)?.tasks || []).map((t, i) => {
    const day = appData.days.find(d => d.day === currentDay);
    const done = day.completed.includes(i);
    return `  [${done ? "✓ DONE" : "○ TODO"}] ${getTaskLabel(t)}`;
  }).join("\n") || "  No tasks"}

All tasks across the plan:
${taskStatusLines || "  No tasks loaded yet"}

Days behind schedule: ${ctx.behindDays.join(", ") || "none"}

=== USER QUESTION ===
${question}

Answer as Marko — sharp, technical, concise. Reference the user's actual tasks and progress where relevant. 2-4 sentences max unless the question genuinely needs more.`;
}

async function callAI(question, chatBoxEl) {
  const config = getAiConfig();
  if (!config?.key || !config?.model) {
    appendMessage("Please configure AI settings first (⚙ button).", "ai", chatBoxEl);
    return;
  }

  const dots = document.createElement("div");
  dots.className = "typing-dots";
  dots.innerHTML = "<span></span><span></span><span></span>";
  chatBoxEl.appendChild(dots);
  chatBoxEl.scrollTop = chatBoxEl.scrollHeight;

  try {
    const response = await fetch(`${config.base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.key}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: buildPrompt(question) }]
      })
    });
    dots.remove();
    const data = await response.json();
    appendMessage(data.choices?.[0]?.message?.content || "No response.", "ai", chatBoxEl);
  } catch (err) {
    dots.remove();
    appendMessage("AI request failed. Check your config.", "ai", chatBoxEl);
  }
}

function appendMessage(text, type = "ai", chatBoxEl) {
  const div = document.createElement("div");
  div.className = type === "user" ? "user-message" : "ai-message";
  if (type === "ai") {
    const prefix = document.createElement("span");
    prefix.className = "ai-prefix";
    prefix.textContent = "◈ Marko /";
    div.appendChild(prefix);
    div.appendChild(document.createTextNode(text));
  } else {
    div.textContent = text;
  }
  chatBoxEl.appendChild(div);
  chatBoxEl.scrollTop = chatBoxEl.scrollHeight;
}

/* =========================
   DESKTOP CHAT
========================= */
const askAiBtn = document.getElementById("askAiBtn");
const aiQuestion = document.getElementById("aiQuestion");
const chatBox = document.getElementById("chatBox");

async function askAIDesktop() {
  const q = aiQuestion.value.trim();
  if (!q) return;
  appendMessage(q, "user", chatBox);
  aiQuestion.value = "";
  await callAI(q, chatBox);
}

askAiBtn.onclick = askAIDesktop;
aiQuestion.addEventListener("keypress", e => { if (e.key === "Enter") askAIDesktop(); });

/* =========================
   MOBILE AI DRAWER
========================= */
const mobileAiFab = document.getElementById("mobileAiFab");
const mobileAiDrawer = document.getElementById("mobileAiDrawer");
const mobileAiClose = document.getElementById("mobileAiClose");
const mobileAskAiBtn = document.getElementById("mobileAskAiBtn");
const mobileAiQuestion = document.getElementById("mobileAiQuestion");
const mobileChatBox = document.getElementById("mobileChatBox");

mobileAiFab.onclick = () => { mobileAiDrawer.classList.add("open"); };
mobileAiClose.onclick = () => { mobileAiDrawer.classList.remove("open"); };
mobileAiDrawer.onclick = (e) => {
  if (e.target === mobileAiDrawer) mobileAiDrawer.classList.remove("open");
};

async function askAIMobile() {
  const q = mobileAiQuestion.value.trim();
  if (!q) return;
  appendMessage(q, "user", mobileChatBox);
  mobileAiQuestion.value = "";
  await callAI(q, mobileChatBox);
}

mobileAskAiBtn.onclick = askAIMobile;
mobileAiQuestion.addEventListener("keypress", e => { if (e.key === "Enter") askAIMobile(); });

function checkFabVisibility() {
  mobileAiFab.style.display = window.innerWidth <= 768 ? "flex" : "none";
}
checkFabVisibility();
window.addEventListener("resize", checkFabVisibility);

/* =========================
   CLOCK
========================= */
function updateClock() {
  const el = document.getElementById("digitalClock");
  if (!el) return;
  const now = new Date();
  let h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  el.textContent = `${String(h).padStart(2, "0")}:${m}:${s} ${ampm}`;
}
setInterval(updateClock, 1000);
updateClock();

let _renderResizeTimer = null;
window.addEventListener("resize", () => { clearTimeout(_renderResizeTimer); _renderResizeTimer = setTimeout(render, 200); });

/* =========================
   ACHIEVEMENT ANIMATIONS
========================= */
(function initAchievements() {
  const overlay   = document.getElementById("achieveOverlay");
  const dismiss   = document.getElementById("achieveDismiss");
  const mainLine  = document.getElementById("achieveMainLine");
  const subLine   = document.getElementById("achieveSubLine");
  const textWrap  = document.getElementById("achieveTextWrap");
  const spinner   = document.getElementById("achieveSpinner");

  let hideTimer   = null;
  let busy        = false;

  /* ── Dragon ── */
  const dragonOverlay = document.getElementById("dragonOverlay");
  const dragonDismiss = document.getElementById("dragonDismiss");
  const dragonScreen  = document.getElementById("dragonScreen");
  const dragonSvg     = dragonOverlay.querySelector("svg");
  let dragonRunning = false;
  let dragonRaf     = null;
  let dragonTimer   = null;
  let dragonColor   = "#6366f1"; // updated per day

  const xmlns   = "http://www.w3.org/2000/svg";
  const xlinkns = "http://www.w3.org/1999/xlink";

  function applyDragonColor(col) {
    // Parse hex → r,g,b
    const r = parseInt(col.slice(1,3),16);
    const g = parseInt(col.slice(3,5),16);
    const b = parseInt(col.slice(5,7),16);

    // Derive a dark shade for body shadow areas
    const dr = Math.round(r * 0.15), dg = Math.round(g * 0.15), db = Math.round(b * 0.22);

    // ── Inject a <style> block into the SVG that overrides fills ──
    // This works on <use> rendered instances because CSS specificity beats inline style
    let svgStyle = dragonOverlay.querySelector("#dragonColorStyle");
    if (!svgStyle) {
      svgStyle = document.createElementNS(xmlns, "style");
      svgStyle.id = "dragonColorStyle";
      dragonSvg.insertBefore(svgStyle, dragonSvg.firstChild);
    }
    svgStyle.textContent = `
      #Cabeza path:first-child { fill: rgba(${r},${g},${b},0.92) !important; }
      #Cabeza path:last-child  { fill: rgb(${dr},${dg},${db}) !important; }
      #AlD1 stop:first-child   { stop-color: ${col}; }
      #AlD1 stop:last-child    { stop-color: #06d6a0; }
      #SpD2 stop:first-child   { stop-color: ${col}; }
      #SpD2 stop:last-child    { stop-color: #06d6a0; }
    `;

    // Glow the screen group with day color
    dragonScreen.style.filter = `drop-shadow(0 0 8px rgba(${r},${g},${b},0.9))`;
    // Tint the overlay background slightly
    dragonOverlay.style.background = `rgba(${Math.round(r*0.04)},${Math.round(g*0.04)},${Math.round(b*0.08)},0.92)`;
  }

  let _dragonMoveHandler = null;

  function stopDragon() {
    dragonRunning = false;
    if (dragonRaf)   cancelAnimationFrame(dragonRaf);
    if (dragonTimer) clearTimeout(dragonTimer);
    if (_dragonMoveHandler) {
      window.removeEventListener("pointermove", _dragonMoveHandler);
      _dragonMoveHandler = null;
    }
    dragonOverlay.classList.remove("active");
    dragonScreen.innerHTML = "";
  }

  function startDragon() {
    if (dragonRunning) stopDragon();
    dragonRunning = true;
    dragonScreen.innerHTML = "";
    applyDragonColor(dragonColor);

    const vbW = 300, vbH = 300, vbXMin = -150, vbYMin = -150;
    const mapSvg = (px, py) => ({
      x: (px / window.innerWidth)  * vbW + vbXMin,
      y: (py / window.innerHeight) * vbH + vbYMin
    });

    const N     = 30;
    const elems = [];
    const mid   = mapSvg(window.innerWidth / 2, window.innerHeight / 2);
    for (let i = 0; i < N; i++) elems[i] = { use: null, x: mid.x, y: mid.y };

    const pointer = { x: mid.x, y: mid.y };
    let frm = Math.random(), rad = 0;
    const radm = Math.min(vbW, vbH) / 6 - 20;

    const addUse = (id, i) => {
      const el = document.createElementNS(xmlns, "use");
      elems[i].use = el;
      el.setAttributeNS(xlinkns, "xlink:href", "#" + id);
      dragonScreen.prepend(el);
    };

    for (let i = 1; i < N; i++) {
      if (i === 1)              addUse("Cabeza", i);
      else if (i === 6 || i === 13) addUse("Aletas", i);
      else                      addUse("Espina", i);
    }

    const onMove = (e) => {
      const c = mapSvg(e.clientX, e.clientY);
      pointer.x = c.x; pointer.y = c.y; rad = 0;
    };
    _dragonMoveHandler = onMove;
    window.addEventListener("pointermove", onMove);

    const run = () => {
      if (!dragonRunning) { return; }
      dragonRaf = requestAnimationFrame(run);
      const e0 = elems[0];
      e0.x += ((Math.cos(3 * frm) * rad * vbW / vbH) + pointer.x - e0.x) / 10;
      e0.y += ((Math.sin(4 * frm) * rad * vbH / vbW) + pointer.y - e0.y) / 10;

      for (let i = 1; i < N; i++) {
        const e = elems[i], ep = elems[i - 1];
        const a = Math.atan2(e.y - ep.y, e.x - ep.x);
        e.x += (ep.x - e.x + Math.cos(a) * (100 - i) / 22) / 4;
        e.y += (ep.y - e.y + Math.sin(a) * (100 - i) / 22) / 4;
        const s = (162 + 4 * (1 - i)) / 480;
        if (e.use) {
          e.use.setAttributeNS(null, "transform",
            `translate(${(ep.x + e.x) / 2},${(ep.y + e.y) / 2}) rotate(${(180 / Math.PI) * a}) scale(${s},${s})`);
        }
      }
      if (rad < radm) rad++;
      frm += 0.003;
      if (rad > 60) { pointer.x += (0 - pointer.x) * 0.05; pointer.y += (0 - pointer.y) * 0.05; }
    };
    run();

    dragonDismiss.onclick = stopDragon;
    dragonTimer = setTimeout(stopDragon, 30000);
  }

  function showDragon() {
    dragonColor = COLORS[(currentDay - 1) % COLORS.length];
    dragonOverlay.classList.add("active");
    setTimeout(startDragon, 300);
  }

  /* ── Animate in helper ── */
  function animIn() {
    textWrap.classList.remove("pop-in", "pop-out", "smoke-out");
    void textWrap.offsetWidth; // force reflow
    textWrap.classList.add("pop-in");
  }

  /* ── Main show ── */
  function show(type, mainText, subText, holdMs) {
    // Priority: month > week > day > task
    // A higher-priority event can interrupt a task overlay
    const priority = { task: 0, day: 1, week: 2, month: 3 };
    const incoming = priority[type] ?? 0;
    const current  = priority[mainLine.dataset.type ?? "task"] ?? 0;
    if (busy && incoming <= current) return;

    // Cancel any running hide timer and force-reset state
    busy = true;
    clearTimeout(hideTimer);
    overlay.classList.remove("active");
    textWrap.classList.remove("pop-in", "pop-out", "smoke-out");

    spinner.style.display  = type === "task" ? "none" : "block";
    mainLine.className     = `achieve-line ${type}`;
    mainLine.dataset.type  = type;
    mainLine.textContent   = mainText;
    subLine.textContent    = subText;

    // Small delay so DOM reset is visible before pop-in
    requestAnimationFrame(() => {
      overlay.classList.add("active");
      animIn();
    });

    dismiss.onclick = () => forceHide(type);

    if (type === "month") {
      hideTimer = setTimeout(() => {
        // Smoke out current text
        textWrap.classList.remove("pop-in");
        void textWrap.offsetWidth;
        textWrap.classList.add("smoke-out");
        setTimeout(() => {
          // Swap text and pop in again
          mainLine.textContent = "Ready for next 30 days";
          subLine.textContent  = "// reset and go again";
          mainLine.className   = "achieve-line day";
          animIn();
          hideTimer = setTimeout(() => forceHide(type), 3000);
        }, 850);
      }, holdMs);
    } else {
      hideTimer = setTimeout(() => forceHide(type), holdMs);
    }
  }

  function forceHide(type) {
    textWrap.classList.remove("pop-in");
    void textWrap.offsetWidth;
    textWrap.classList.add("pop-out");
    setTimeout(() => {
      overlay.classList.remove("active");
      textWrap.classList.remove("pop-out");
      busy = false;
      if (type === "day" || type === "week" || type === "month") {
        setTimeout(showDragon, 400);
      }
    }, 420);
  }

  /* ── State guards ── */
  let lastDayComplete  = -1;
  let lastWeekComplete = -1;
  let monthDoneFired   = false;

  /* ── Public API ── */
  window.checkMilestonesAndNotify = function(dayIdx) {
    // dayIdx = 0-based index in COLORS / appData.days
    const day = appData.days.find(d => d.day === currentDay);
    if (!day || day.tasks.length === 0) {
      // no tasks — just fire task done
      show("task", "TASK DONE", "// objective cleared", 1800);
      return;
    }

    const allDaysDone = appData.days.filter(d => d.tasks.length > 0)
                             .every(d => d.completed.length === d.tasks.length);
    const dayDone     = day.completed.length === day.tasks.length;

    const week        = Math.ceil(currentDay / 7);
    const startD      = (week - 1) * 7 + 1;
    const endD        = Math.min(week * 7, 30);
    const weekDays    = appData.days.filter(d => d.day >= startD && d.day <= endD && d.tasks.length > 0);
    const weekDone    = weekDays.length > 0 && weekDays.every(d => d.completed.length === d.tasks.length);

    if (allDaysDone && !monthDoneFired) {
      monthDoneFired = true;
      show("month", "EXECUTED THE MONTH", "// 30 days — mission complete", 3500);
    } else if (weekDone && lastWeekComplete !== week) {
      lastWeekComplete = week;
      show("week", "KILLED THE WEEK", `// week ${week} — fully executed`, 3800);
    } else if (dayDone && lastDayComplete !== currentDay) {
      lastDayComplete = currentDay;
      show("day", "COMPLETED THE DAY", `// day ${String(currentDay).padStart(2,"0")} cleared`, 3200);
    } else {
      show("task", "TASK DONE", "// objective cleared", 1800);
    }
  };

  /* ── Reset: clear achievement flags when user resets progress ── */
  document.getElementById("resetBtn").addEventListener("click", () => {
    monthDoneFired   = false;
    lastDayComplete  = -1;
    lastWeekComplete = -1;
    busy             = false;
    clearTimeout(hideTimer);
    overlay.classList.remove("active");
    textWrap.classList.remove("pop-in", "pop-out", "smoke-out");
    stopDragon();
  }, true); // capture phase so it runs before the onclick handler
})();

/* =========================
   WORD MAP — global water-surface physics
   - Mouse color: #FFD0C4 (warm peach)
   - No overlap: grid-based origin placement
   - All words highlighted via focus queue (no skips)
   - Add words to WORDS array → everything auto-adjusts
========================= */
(function initWordMap() {
  const card = document.querySelector(".big-progress-card");
  if (!card) return;

  const old = document.getElementById("wordMapCanvas");
  if (old) old.remove();

  const wc = document.createElement("canvas");
  wc.id = "wordMapCanvas";
  wc.style.cssText = [
    "position:absolute","inset:0",
    "width:100%","height:100%",
    "pointer-events:none","z-index:0",
    "border-radius:inherit"
  ].join(";");
  card.insertBefore(wc, card.firstChild);
  card.style.position = card.style.position || "relative";

  // ── Word list — add/remove freely, everything auto-adjusts ───────
const WORDS = [
  "success","pain","failure","try again",
  "becoming demon","psychopath","hacker","black hat",
  "Network","Cyber Security","persistence","recon",
  "exploit","privilege","escalation","enumeration",
  "shell","payload","lateral movement","zero day",
  "brute force","OSINT","red team","blue team",
  "CVE","patch","firewall","bypass","stealth","rootkit",
  "job","business","poverty","richness","knowledge",
  "discipline","grind","focus","patience","sacrifice",
  "sleep","hunger","obsession","purpose","legacy",
  "malware","ransomware","trojan","worm","backdoor",
  "keylogger","dropper","crypter","obfuscation","sandbox",
  "reverse shell","bind shell","web shell","C2","beacon",
  "exfiltration","injection","heap spray","stack smash","ROP",
  "token stealing","pass the hash","DLL hijacking","bootkit","firmware",
  "phishing","spear phishing","vishing","smishing","whaling",
  "proxy","TOR","VPN","dark web","marketplace",
  "burner","opsec","anonymity","footprinting","scanning",
  "sniffing","spoofing","poisoning","pivoting","tunneling",
  "loneliness","rage","hunger for more","no days off","war mode",
  "broken","unbroken","shadow","ghost","machine"
];

  // ── Physics ──────────────────────────────────────────────────────
  const SPRING_K      = 0.022;
  const DAMPING       = 0.78;
  const MAX_SPEED     = 22;
  const MOUSE_FORCE   = 3.2;
  const FALLOFF_EXP   = 1.6;
  const RADIUS_FACTOR = 1.1;   // covers full card diagonal

  // ── Highlight ────────────────────────────────────────────────────
  const FOCUS_INTERVAL = 130;   // ticks per word — shorter so all get turns
  const FOCUS_SCALE    = 1.44;
  const FOCUS_ALPHA    = 0.82;
  const IDLE_ALPHA_LO  = 0.13;
  const IDLE_ALPHA_HI  = 0.26;
  const ALPHA_LERP     = 0.042;
  const SCALE_LERP     = 0.058;

  // Mouse color #FFD0C4 decomposed
  const MOUSE_R = 255, MOUSE_G = 0, MOUSE_B = 0;

  let W = 0, H = 0, DIAG = 1;
  let words = [], focusIdx = -1, focusCycle = 0;
  // Round-robin queue so every word gets highlighted
  let focusQueue = [];
  let mouse = { x: 0, y: 0, active: false };

  card.addEventListener("mousemove", e => {
    const r = card.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
    mouse.active = true;
  }, { passive: true });
  card.addEventListener("mouseleave", () => { mouse.active = false; }, { passive: true });

  // ── Grid-based seed — no overlaps ────────────────────────────────
  function seedWords() {
    W = wc.offsetWidth  || card.offsetWidth  || 340;
    H = wc.offsetHeight || card.offsetHeight || 500;
    wc.width  = W;
    wc.height = H;
    DIAG = Math.sqrt(W * W + H * H);

    const count  = WORDS.length;
    // Fit words into a grid with padding
    const PAD_X  = 0.06 * W;
    const PAD_Y  = 0.07 * H;
    const areaW  = W - PAD_X * 2;
    const areaH  = H - PAD_Y * 2;

    // cols × rows grid that fits all words
    const cols   = Math.ceil(Math.sqrt(count * (areaW / areaH)));
    const rows   = Math.ceil(count / cols);
    const cellW  = areaW / cols;
    const cellH  = areaH / rows;

    // Shuffle word order for visual variety
    const indices = Array.from({ length: count }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    words = WORDS.map((text, idx) => {
      const slot  = indices[idx];
      const col   = slot % cols;
      const row   = Math.floor(slot / cols);
      // Jitter within cell (±30%) so it doesn't look like a grid
      const jx    = (Math.random() - 0.5) * cellW * 0.6;
      const jy    = (Math.random() - 0.5) * cellH * 0.6;
      const ox    = PAD_X + col * cellW + cellW * 0.5 + jx;
      const oy    = PAD_Y + row * cellH + cellH * 0.5 + jy;
      const baseAlpha = IDLE_ALPHA_LO + Math.random() * (IDLE_ALPHA_HI - IDLE_ALPHA_LO);
      return {
        text, ox, oy, x: ox, y: oy,
        vx: 0, vy: 0,
        baseSize: 9 + Math.random() * 7,   // 9–16px — smaller so more fit
        baseAlpha, alpha: baseAlpha, targetAlpha: baseAlpha,
        scale: 1, targetScale: 1,
        focused: false,
        mouseT: 0
      };
    });

    // Reset focus queue
    focusQueue = Array.from({ length: count }, (_, i) => i);
    shuffleArr(focusQueue);
    focusIdx = -1;
  }

  function shuffleArr(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // ── Round-robin focus — every word gets highlighted ──────────────
  function pickNextFocus() {
    if (focusIdx !== -1 && words[focusIdx]) {
      words[focusIdx].focused = false;
      words[focusIdx].targetAlpha = words[focusIdx].baseAlpha;
      words[focusIdx].targetScale = 1;
    }
    if (focusQueue.length === 0) {
      focusQueue = Array.from({ length: words.length }, (_, i) => i);
      shuffleArr(focusQueue);
    }
    focusIdx = focusQueue.pop();
    words[focusIdx].focused = true;
    words[focusIdx].targetAlpha = FOCUS_ALPHA;
    words[focusIdx].targetScale  = FOCUS_SCALE;
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  let rafId = null;

  function tick() {
    rafId = requestAnimationFrame(tick);
    const ctx = wc.getContext("2d");
    ctx.clearRect(0, 0, W, H);

    focusCycle++;
    if (focusCycle >= FOCUS_INTERVAL) { focusCycle = 0; pickNextFocus(); }

    const ATTRACT_RADIUS = DIAG * RADIUS_FACTOR;

    for (let i = 0; i < words.length; i++) {
      const w = words[i];

      const sx = (w.ox - w.x) * SPRING_K;
      const sy = (w.oy - w.y) * SPRING_K;

      let fmx = 0, fmy = 0, prox = 0;
      if (mouse.active) {
        const dx = mouse.x - w.ox;
        const dy = mouse.y - w.oy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const t  = clamp(1 - dist / ATTRACT_RADIUS, 0, 1);
        const ft = Math.pow(t, FALLOFF_EXP);
        prox = ft;
        const ddx = mouse.x - w.x;
        const ddy = mouse.y - w.y;
        const ddist = Math.sqrt(ddx * ddx + ddy * ddy) || 0.01;
        fmx = (ddx / ddist) * MOUSE_FORCE * ft;
        fmy = (ddy / ddist) * MOUSE_FORCE * ft;
      }

      w.vx = (w.vx + sx + fmx) * DAMPING;
      w.vy = (w.vy + sy + fmy) * DAMPING;
      const spd = Math.sqrt(w.vx * w.vx + w.vy * w.vy);
      if (spd > MAX_SPEED) { w.vx = w.vx / spd * MAX_SPEED; w.vy = w.vy / spd * MAX_SPEED; }
      w.x += w.vx;
      w.y += w.vy;

      w.mouseT = lerp(w.mouseT, prox, mouse.active ? 0.10 : 0.05);
      const mt = clamp(w.mouseT, 0, 1);

      if (mt > 0.02) {
        w.targetAlpha = clamp(lerp(w.focused ? FOCUS_ALPHA : w.baseAlpha, 0.90, mt), 0, 1);
        w.targetScale = lerp(w.focused ? FOCUS_SCALE : 1, 1.55, mt * 0.85);
      } else {
        w.targetAlpha = w.focused ? FOCUS_ALPHA : w.baseAlpha;
        w.targetScale = w.focused ? FOCUS_SCALE : 1;
      }

      w.alpha = lerp(w.alpha, w.targetAlpha, ALPHA_LERP);
      w.scale = lerp(w.scale, w.targetScale, SCALE_LERP);

      const size = w.baseSize * w.scale;

      // Color: dim indigo → whitish-indigo (focus) → #FFD0C4 (mouse)
      const focusT = w.focused && mt < 0.05
        ? clamp((w.alpha - w.baseAlpha) / (FOCUS_ALPHA - w.baseAlpha + 0.001), 0, 1)
        : 0;
      let r = lerp(110, 205, focusT);
      let g = lerp(115, 208, focusT);
      let b = lerp(185, 255, focusT);
      // blend to #FFD0C4 on mouse proximity
      r = lerp(r, MOUSE_R, mt);
      g = lerp(g, MOUSE_G, mt);
      b = lerp(b, MOUSE_B, mt);

      ctx.save();
      ctx.font = `${Math.round(size)}px 'JetBrains Mono','Space Mono',monospace`;
      ctx.fillStyle = `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${w.alpha.toFixed(3)})`;
      ctx.textBaseline = "middle";

      if (focusT > 0.08 || mt > 0.04) {
        // glow shifts from indigo (focus) to warm peach (mouse)
        const glowR = Math.round(lerp(180, 255, mt));
        const glowG = Math.round(lerp(190, 200, mt));
        const glowB = Math.round(lerp(255, 180, mt));
        ctx.shadowColor = `rgba(${glowR},${glowG},${glowB},${(focusT * 0.28 + mt * 0.52).toFixed(3)})`;
        ctx.shadowBlur  = 5 + mt * 20 + focusT * 9;
      }

      ctx.fillText(w.text, w.x, w.y);
      ctx.restore();
    }
  }

  let _rt = null;
  window.addEventListener("resize", () => {
    clearTimeout(_rt);
    _rt = setTimeout(() => {
      if (rafId) cancelAnimationFrame(rafId);
      const prev = words.map(w => ({ vx: w.vx, vy: w.vy }));
      seedWords();
      prev.forEach((p, i) => { if (words[i]) { words[i].vx = p.vx * 0.25; words[i].vy = p.vy * 0.25; }});
      pickNextFocus();
      tick();
    }, 250);
  });

  seedWords();
  requestAnimationFrame(() => { pickNextFocus(); tick(); });
})();