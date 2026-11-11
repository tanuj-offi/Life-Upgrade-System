/* ============================================================
   Life Upgrade System — Frontend Application
   Single-page app that communicates with the Flask JSON API
   ============================================================ */

"use strict";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const State = {
  user:          null,     // { userId, username }
  player:        null,     // { totalXP, level, levelTitle, progressPct, xpToNext, … }
  tasks:         [],       // array of task objects
  schedule:      [],       // array of scheduled task objects in queue order
  currentPage:   "dashboard",
  taskFilter:    "all",    // "all" | "pending" | "completed"
  taskSort:      "default",// "default" | "deadline" | "diff_desc" | "diff_asc"
  currentQuote:  null,     // Random quote picked on load
  editingTaskId: null,     // null = creating, integer = editing
  confirmCb:     null,     // callback for confirm modal
};

// ---------------------------------------------------------------------------
// High-Quality Famous Motivational & Productivity Quotes
// ---------------------------------------------------------------------------
const MOTIVATIONAL_QUOTES = [
  { text: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius" },
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "Luck is what happens when preparation meets opportunity.", author: "Seneca" },
  { text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "What gets measured gets managed.", author: "Peter Drucker" },
  { text: "First say to yourself what you would be; and then do what you have to do.", author: "Epictetus" },
  { text: "Long-term consistency trumps short-term intensity.", author: "Bruce Lee" },
  { text: "The man who moves a mountain begins by carrying away small stones.", author: "Confucius" },
  { text: "Do the thing and you shall have the power.", author: "Ralph Waldo Emerson" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche" },
  { text: "Focus is a muscle. The more tasks you finish without distraction, the stronger you become.", author: "Cal Newport" }
];

function getRandomMotivationalQuote() {
  const idx = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
  return MOTIVATIONAL_QUOTES[idx];
}

// ---------------------------------------------------------------------------
// 20 Level Definitions (Matches Player.cpp & app.py exactly)
// ---------------------------------------------------------------------------
const LEVEL_DEFINITIONS = [
  { level: 1,  title: "Beginner",            xp: 0,    icon: "🌱", desc: "First step on your journey. Build the daily habit." },
  { level: 2,  title: "Starter",             xp: 100,  icon: "⚡", desc: "Taking initiative and building initial momentum." },
  { level: 3,  title: "Learner",             xp: 225,  icon: "📖", desc: "Understanding the compound power of daily routines." },
  { level: 4,  title: "Builder",             xp: 375,  icon: "🔨", desc: "Constructing strong personal productivity habits." },
  { level: 5,  title: "Achiever",            xp: 550,  icon: "🎯", desc: "Consistently hitting daily targets and priorities." },
  { level: 6,  title: "Focused",             xp: 750,  icon: "🔍", desc: "Laser concentration and deep work unlocked." },
  { level: 7,  title: "Consistent",          xp: 975,  icon: "🔄", desc: "Showing up every day without hesitation." },
  { level: 8,  title: "Dedicated",           xp: 1225, icon: "🛡️", desc: "Unwavering commitment through any obstacle." },
  { level: 9,  title: "Skilled",             xp: 1500, icon: "⚔️", desc: "Effortless task execution and prioritization." },
  { level: 10, title: "Pro",                 xp: 1800, icon: "⭐", desc: "A seasoned veteran of daily personal mastery." },
  { level: 11, title: "Advanced",            xp: 2125, icon: "💫", desc: "High output meets continuous self-improvement." },
  { level: 12, title: "Expert",              xp: 2475, icon: "🔮", desc: "Master of workflow efficiency and energy." },
  { level: 13, title: "Specialist",          xp: 2850, icon: "🎖️", desc: "Tactical execution with precision and speed." },
  { level: 14, title: "Champion",            xp: 3250, icon: "🏆", desc: "Top-tier discipline admired by all around you." },
  { level: 15, title: "Elite",               xp: 3675, icon: "💎", desc: "Crystal clarity and immaculate focus." },
  { level: 16, title: "Master",              xp: 4125, icon: "⚜️", desc: "Complete command over time and productivity." },
  { level: 17, title: "Grandmaster",         xp: 4600, icon: "🔱", desc: "Sovereign strategist. Effortless greatness across endeavors." },
  { level: 18, title: "Legend",              xp: 5100, icon: "🔥", desc: "An unstoppable force of daily accomplishment." },
  { level: 19, title: "Icon",                xp: 5625, icon: "💠", desc: "A shining beacon of personal evolution and excellence." },
  { level: 20, title: "Life Upgrade Legend", xp: 6175, icon: "👑", desc: "Transcendent peak potential. Ultimate life mastery achieved." },
];

// ---------------------------------------------------------------------------
// Schedule State Helpers (Single Source of Truth)
// ---------------------------------------------------------------------------
function isTaskScheduled(taskId) {
  const id = Number(taskId);
  if (!id) return false;
  if (Array.isArray(State.schedule) && State.schedule.some(t => Number(t.id) === id || Number(t.taskId) === id)) {
    return true;
  }
  const task = Array.isArray(State.tasks) ? State.tasks.find(t => Number(t.id) === id) : null;
  return Boolean(task && task.isScheduled);
}

function updateTaskScheduleState(taskId, isScheduled) {
  const id = Number(taskId);
  if (Array.isArray(State.tasks)) {
    const t = State.tasks.find(x => Number(x.id) === id);
    if (t) t.isScheduled = Boolean(isScheduled);
  }
}

// ---------------------------------------------------------------------------
// Task Sorting Helper
// ---------------------------------------------------------------------------
function sortTasksList(list, sortKey) {
  const arr = [...list];
  if (sortKey === "deadline") {
    arr.sort((a, b) => {
      // Tasks with deadlines come first sorted chronologically ASC
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      return (a.id || 0) - (b.id || 0);
    });
  } else if (sortKey === "diff_desc") {
    // Hard (50 XP) -> Medium (25 XP) -> Easy (10 XP)
    arr.sort((a, b) => (b.xp || 0) - (a.xp || 0));
  } else if (sortKey === "diff_asc") {
    // Easy (10 XP) -> Medium (25 XP) -> Hard (50 XP)
    arr.sort((a, b) => (a.xp || 0) - (b.xp || 0));
  } else {
    // Default: creation order (ID asc)
    arr.sort((a, b) => (a.id || 0) - (b.id || 0));
  }
  return arr;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
async function api(path, options = {}) {
  const defaults = {
    credentials: "same-origin",
    headers:     { "Content-Type": "application/json" },
  };
  const res = await fetch("/api" + path, { ...defaults, ...options });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

const GET  = (path)        => api(path, { method: "GET" });
const POST = (path, body)  => api(path, { method: "POST",   body: JSON.stringify(body) });
const PUT  = (path, body)  => api(path, { method: "PUT",    body: JSON.stringify(body) });
const DEL  = (path)        => api(path, { method: "DELETE" });

// ---------------------------------------------------------------------------
// Bootstrap — check auth on load
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  // Randomly select one quote per app load/refresh
  State.currentQuote = getRandomMotivationalQuote();

  try {
    const me = await GET("/auth/me");
    if (me.authenticated) {
      State.user = { userId: me.userId, username: me.username };
      showApp();
    } else {
      showAuth();
    }
  } catch {
    showAuth();
  }
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
function showAuth() {
  document.getElementById("auth-screen").classList.remove("hidden");
  document.getElementById("app").classList.add("hidden");
}

function showApp() {
  document.getElementById("auth-screen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  updateSidebarUser();

  // Preserve page route from current URL if user refreshed
  const path = window.location.pathname.replace(/^\/+/, "");
  const validPages = ["dashboard", "tasks", "schedule", "levels", "achievements"];
  const targetPage = validPages.includes(path)
    ? (path === "achievements" ? "levels" : path)
    : "dashboard";
  navigate(targetPage, false);
}

function showAuthTab(tab) {
  const isLogin = tab === "login";
  document.getElementById("login-form")  .classList.toggle("hidden", !isLogin);
  document.getElementById("register-form").classList.toggle("hidden",  isLogin);
  document.getElementById("tab-login")   .classList.toggle("active",  isLogin);
  document.getElementById("tab-register").classList.toggle("active", !isLogin);
  clearFormErrors();
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById("login-btn");
  btn.disabled = true;
  btn.textContent = "Signing in…";
  clearFormErrors();
  try {
    const res = await POST("/auth/login", {
      username: document.getElementById("login-username").value.trim(),
      password: document.getElementById("login-password").value,
    });
    State.user = { username: res.username };
    showApp();
  } catch (err) {
    showFormError("login-error", err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Sign In";
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById("register-btn");
  btn.disabled = true;
  btn.textContent = "Creating account…";
  clearFormErrors();
  try {
    const res = await POST("/auth/register", {
      username: document.getElementById("reg-username").value.trim(),
      password: document.getElementById("reg-password").value,
    });
    State.user = { username: res.username };
    showApp();
  } catch (err) {
    showFormError("register-error", err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Create Account";
  }
}

async function handleLogout() {
  await POST("/auth/logout", {}).catch(() => {});
  State.user = State.player = null;
  State.tasks = []; State.schedule = [];
  document.getElementById("login-username").value = "";
  document.getElementById("login-password").value = "";
  document.getElementById("reg-username").value = "";
  document.getElementById("reg-password").value = "";
  showAuth();
  showAuthTab("login");
}

function showFormError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove("hidden");
}
function clearFormErrors() {
  ["login-error", "register-error", "task-form-error"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
function navigate(page, updateHistory = true) {
  if (page === "achievements") page = "levels";
  State.currentPage = page;

  if (updateHistory) {
    const targetUrl = page === "dashboard" ? "/" : "/" + page;
    if (window.location.pathname !== targetUrl) {
      history.pushState({ page }, "", targetUrl);
    }
  }

  // Update nav items
  document.querySelectorAll(".nav-item").forEach(el => {
    el.classList.toggle("active", el.dataset.page === page);
  });

  // Page titles
  const titles = {
    dashboard: "Dashboard",
    tasks: "My Tasks",
    schedule: "Schedule",
    levels: "Achievements & Levels",
  };
  document.getElementById("topbar-title").textContent = titles[page] || page;

  // Hide all pages, show target
  document.querySelectorAll(".page").forEach(el => el.classList.add("hidden"));
  const targetEl = document.getElementById("page-" + page);
  if (targetEl) targetEl.classList.remove("hidden");

  // Close sidebar on mobile
  document.getElementById("sidebar").classList.remove("open");

  // Load page data
  if (page === "dashboard") loadDashboard();
  else if (page === "tasks") loadTasks();
  else if (page === "schedule") loadSchedule();
  else if (page === "levels") loadLevels();
}

window.addEventListener("popstate", (e) => {
  if (State.user && e.state && e.state.page) {
    navigate(e.state.page, false);
  }
});

// ---------------------------------------------------------------------------
// Sidebar toggle (mobile)
// ---------------------------------------------------------------------------
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}

// ---------------------------------------------------------------------------
// Player synchronization across the entire UI
// ---------------------------------------------------------------------------
function updateSidebarUser() {
  const el = document.getElementById("sidebar-user");
  if (!el) return;
  if (!State.user) { el.textContent = ""; return; }
  const p = State.player;
  const username = State.user.username || "Player";
  const initials = username.slice(0, 2).toUpperCase();

  const pInfo = p
    ? `
      <div class="sidebar-player-widget">
        <div class="sidebar-avatar-row">
          <div class="sidebar-avatar" title="${esc(username)}">${esc(initials)}</div>
          <div class="sidebar-user-details">
            <span class="sidebar-username">${esc(username)}</span>
            <span class="sidebar-rank-tag"><span class="lime">Lv.${p.level}</span> ${esc(p.levelTitle)}</span>
          </div>
        </div>
        <div class="sidebar-xp-bar-wrap">
          <div class="sidebar-xp-track">
            <div class="sidebar-xp-fill" style="width:${p.progressPct}%"></div>
          </div>
          <div class="sidebar-xp-meta">
            <span>${p.totalXP.toLocaleString()} XP</span>
            <span>${p.progressPct}%</span>
          </div>
        </div>
      </div>`
    : `
      <div class="sidebar-player-widget">
        <div class="sidebar-avatar-row">
          <div class="sidebar-avatar">${esc(initials)}</div>
          <div class="sidebar-user-details">
            <span class="sidebar-username">${esc(username)}</span>
          </div>
        </div>
      </div>`;
  el.innerHTML = pInfo;
}

function updateTopbarPlayer() {
  const el = document.getElementById("topbar-player");
  if (!el) return;
  if (!State.player) { el.textContent = ""; return; }
  const p = State.player;
  el.textContent = `Lv.${p.level} · ${p.totalXP.toLocaleString()} XP`;
}

// ---------------------------------------------------------------------------
// Dashboard Horizontal Progress Bar (with distributed ambient glow)
// ---------------------------------------------------------------------------
function renderPlayerCard(p, container) {
  if (!container || !p) return;
  const nextLabel = p.isMaxLevel
    ? "Max Level Reached! You are a legend."
    : `${p.xpToNext.toLocaleString()} XP to Level ${p.level + 1} (${esc(p.nextLevelTitle || "")})`;

  container.innerHTML = `
    <div class="player-card">
      <div class="player-top">
        <div class="player-identity">
          <div class="player-level-badge">
            <span class="level-bolt">⚡</span>
            <span class="level-num">Level ${p.level}</span>
            <span class="level-sep">&bull;</span>
            <span class="level-name">${esc(p.levelTitle)}</span>
          </div>
        </div>
        <div class="player-xp-info">
          <div class="xp-total">${p.totalXP.toLocaleString()} <span class="xp-unit">XP</span></div>
          <div class="xp-label">Total Experience</div>
        </div>
      </div>
      <div class="xp-bar-container">
        <div class="xp-bar-ambient-glow" style="width:${p.progressPct}%"></div>
        <div class="xp-bar-track">
          <div class="xp-bar-fill" style="width:${p.progressPct}%"></div>
        </div>
      </div>
      <div class="xp-bar-labels">
        <span><strong>${p.progressPct}%</strong> progress</span>
        <span>${nextLabel}</span>
      </div>
      <div class="player-card-footer">
        <span class="player-card-levels-link" onclick="navigate('levels')">
          View all 20 ranks &amp; achievements &rarr;
        </span>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// My Tasks Circular / Ring-Style Progress Indicator
// ---------------------------------------------------------------------------
function renderTasksRingProgress(p, container) {
  if (!container || !p) return;
  const pct = Math.min(100, Math.max(0, p.progressPct || 0));
  const r = 50;
  const circ = 2 * Math.PI * r; // ~314.16
  const offset = circ - (pct / 100) * circ;

  const targetLevelText = p.isMaxLevel
    ? "Max Level Reached"
    : `to Level ${p.level + 1} (${esc(p.nextLevelTitle || "")})`;

  container.innerHTML = `
    <div class="tasks-ring-card">
      <div class="tasks-ring-visual">
        <div class="ring-svg-wrapper">
          <svg class="ring-svg" viewBox="0 0 120 120">
            <defs>
              <linearGradient id="tasksRingGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#4ade80"/>
                <stop offset="60%" stop-color="#a3e635"/>
                <stop offset="100%" stop-color="#bef264"/>
              </linearGradient>
            </defs>
            <circle class="ring-track" cx="60" cy="60" r="${r}"></circle>
            <circle class="ring-glow-back" cx="60" cy="60" r="${r}"
              stroke="url(#tasksRingGrad)"
              stroke-dasharray="${circ}"
              stroke-dashoffset="${offset}"></circle>
            <circle class="ring-progress" cx="60" cy="60" r="${r}"
              stroke="url(#tasksRingGrad)"
              stroke-dasharray="${circ}"
              stroke-dashoffset="${offset}"></circle>
          </svg>
          <div class="ring-center-stat">
            <span class="ring-percent">${pct}%</span>
            <span class="ring-tag">TO NEXT RANK</span>
          </div>
        </div>
      </div>
      <div class="tasks-ring-info">
        <div class="tasks-ring-header">
          <div class="ring-level-badge">⚡ Level ${p.level} • ${esc(p.levelTitle)}</div>
          <div class="ring-xp-display">${p.totalXP.toLocaleString()} <span class="ring-xp-unit">XP</span></div>
        </div>
        <div class="tasks-ring-stats-grid">
          <div class="ring-stat-box">
            <span class="ring-stat-val">${p.totalXP.toLocaleString()}</span>
            <span class="ring-stat-lbl">Earned XP</span>
          </div>
          <div class="ring-stat-box">
            <span class="ring-stat-val">${p.isMaxLevel ? '0' : p.xpToNext.toLocaleString()}</span>
            <span class="ring-stat-lbl">XP Remaining</span>
            <span class="ring-stat-target">${targetLevelText}</span>
          </div>
        </div>
      </div>
    </div>`;
}

function updateAllPlayerUI() {
  updateSidebarUser();
  updateTopbarPlayer();

  if (State.player) {
    const dashCard = document.getElementById("dash-player-card");
    if (dashCard) renderPlayerCard(State.player, dashCard);

    const dashHeaderSub = document.getElementById("dash-header-subtitle");
    if (dashHeaderSub) {
      dashHeaderSub.textContent = `Level ${State.player.level} ${esc(State.player.levelTitle)} · ${State.player.totalXP.toLocaleString()} XP earned`;
    }

    const tasksCard = document.getElementById("tasks-player-card");
    if (tasksCard) renderTasksRingProgress(State.player, tasksCard);
  }
}

// ---------------------------------------------------------------------------
// DASHBOARD
// ---------------------------------------------------------------------------
async function loadDashboard() {
  const page = document.getElementById("page-dashboard");
  if (!page.innerHTML.trim() || page.querySelector(".loading-spinner")) {
    page.innerHTML = `
      <div class="page-header">
        <h2>Welcome back${State.user ? ", " + esc(State.user.username) : ""}!</h2>
        <p>Here's what's on your plate today.</p>
      </div>
      <div class="loading-spinner"><div class="spinner"></div> Loading…</div>`;
  }

  try {
    const [data, schedData] = await Promise.all([
      GET("/dashboard"),
      GET("/schedule"),
    ]);
    State.player   = data.player;
    State.schedule = schedData;
    updateAllPlayerUI();
    renderDashboard(page, data);
  } catch (err) {
    page.innerHTML = `<p style="color:var(--danger)">Failed to load dashboard: ${esc(err.message)}</p>`;
  }
}

function renderDashboard(page, data) {
  const p     = data.player;
  const stats = data.stats;
  // Automatically select a quote for this page load
  if (!State.currentQuote) State.currentQuote = getRandomMotivationalQuote();
  const q     = State.currentQuote;
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  let upcomingHTML = "";
  if (!data.upcoming || data.upcoming.length === 0) {
    upcomingHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎉</div>
        <p>No upcoming tasks with due dates.</p>
        <button class="btn-ghost btn-sm" onclick="openNewTaskModal()" style="margin-top:10px">+ Add a Task</button>
      </div>`;
  } else {
    upcomingHTML = `<div class="task-list">${data.upcoming.map(t => renderTaskCardHTML(t)).join("")}</div>`;
  }

  let schedPreviewHTML = "";
  if (!data.schedulePreview || data.schedulePreview.length === 0) {
    schedPreviewHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>Your schedule is empty. Add tasks to plan your work order.</p>
        <button class="btn-ghost btn-sm" onclick="navigate('tasks')" style="margin-top:10px">Browse Tasks</button>
      </div>`;
  } else {
    schedPreviewHTML = `
      <div class="queue-list">
        ${data.schedulePreview.map((t, i) => `
          <div class="queue-item">
            <div class="queue-pos${i === 0 ? " first" : ""}">${i + 1}</div>
            <div class="queue-info">
              <div class="queue-name">${esc(t.name)}</div>
              <div class="queue-meta">${diffBadgeHTML(t)} ${dueDateHTML(t)}</div>
            </div>
          </div>`).join("")}
      </div>`;
  }

  page.innerHTML = `
    <div class="page-header dash-header">
      <div class="dash-header-text">
        <h2>Welcome back, ${esc(State.user?.username || "adventurer")}!</h2>
        <p id="dash-header-subtitle">Level ${p.level} ${esc(p.levelTitle)} &middot; ${p.totalXP.toLocaleString()} XP earned</p>
      </div>
      <div class="dash-header-actions">
        <button class="btn-primary btn-dash-add" onclick="openNewTaskModal()">
          <span class="btn-plus-icon">+</span> Add New Task
        </button>
      </div>
    </div>

    <!-- Motivational Quote Banner (Rotates on Refresh) -->
    <div class="quote-card">
      <div class="quote-content">
        <span class="quote-icon">“</span>
        <div class="quote-body">
          <p class="quote-text" id="dash-quote-text">${esc(q.text)}</p>
          <span class="quote-author" id="dash-quote-author">&mdash; ${esc(q.author)}</span>
        </div>
      </div>
    </div>

    <div id="dash-player-card"></div>

    <div class="stats-row">
      <div class="stat-card stat-card-total">
        <div class="stat-top">
          <span class="stat-label">Total Tasks</span>
          <span class="stat-icon-wrap cyan">
            <svg class="stat-svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="3" y="3" width="14" height="14" rx="2"></rect>
              <path d="M7 8H13M7 12H11"></path>
            </svg>
          </span>
        </div>
        <div class="stat-value" id="stat-total-tasks">${stats.total}</div>
        <div class="stat-sub">Overall created</div>
      </div>
      <div class="stat-card stat-card-completed">
        <div class="stat-top">
          <span class="stat-label">Completed</span>
          <span class="stat-icon-wrap lime">
            <svg class="stat-svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M5 10L8.5 13.5L15 6.5"></path>
              <circle cx="10" cy="10" r="7.5"></circle>
            </svg>
          </span>
        </div>
        <div class="stat-value lime" id="stat-completed-tasks">${stats.completed}</div>
        <div class="stat-sub">${completionRate}% completion rate</div>
      </div>
      <div class="stat-card stat-card-pending">
        <div class="stat-top">
          <span class="stat-label">Pending</span>
          <span class="stat-icon-wrap gold">
            <svg class="stat-svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="10" cy="10" r="7.5"></circle>
              <path d="M10 6V10L13 12"></path>
            </svg>
          </span>
        </div>
        <div class="stat-value gold" id="stat-pending-tasks">${stats.pending}</div>
        <div class="stat-sub">Ready to conquer</div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <h3>⏰ Upcoming Tasks</h3>
        <span class="section-link" onclick="navigate('tasks')">View all tasks &rarr;</span>
      </div>
      <div id="dash-upcoming-container">${upcomingHTML}</div>
    </div>

    <div class="section">
      <div class="section-header">
        <h3>📋 Schedule Preview</h3>
        <span class="section-link" onclick="navigate('schedule')">Manage schedule &rarr;</span>
      </div>
      <div id="dash-schedule-container">${schedPreviewHTML}</div>
    </div>`;

  renderPlayerCard(p, document.getElementById("dash-player-card"));
}

// ---------------------------------------------------------------------------
// TASKS PAGE
// ---------------------------------------------------------------------------
async function loadTasks() {
  const page = document.getElementById("page-tasks");
  if (!page.innerHTML.trim() || page.querySelector(".loading-spinner")) {
    page.innerHTML = `<div class="loading-spinner"><div class="spinner"></div> Loading tasks…</div>`;
  }

  try {
    const [tasks, schedData, playerData] = await Promise.all([
      GET("/tasks"),
      GET("/schedule"),
      GET("/player"),
    ]);
    State.tasks    = tasks;
    State.schedule = schedData;
    State.player   = playerData;
    updateAllPlayerUI();
    renderTasksPage(page);
  } catch (err) {
    page.innerHTML = `<p style="color:var(--danger)">Failed to load tasks: ${esc(err.message)}</p>`;
  }
}

function renderTasksPage(page) {
  const filter = State.taskFilter;
  const sortKey = State.taskSort || "default";

  // Filter raw tasks
  let activeTasks    = State.tasks.filter(t => !t.completed);
  let completedTasks = State.tasks.filter(t => t.completed);

  // Apply sorting client-side
  activeTasks    = sortTasksList(activeTasks, sortKey);
  completedTasks = sortTasksList(completedTasks, sortKey);

  let contentHTML = "";
  if (filter === "pending") {
    contentHTML = activeTasks.length === 0
      ? `<div class="empty-state"><div class="empty-icon">🎉</div>No pending tasks. Great job!</div>`
      : `<div class="task-list">${activeTasks.map(t => renderTaskCardHTML(t)).join("")}</div>`;
  } else if (filter === "completed") {
    contentHTML = completedTasks.length === 0
      ? `<div class="empty-state"><div class="empty-icon">✅</div>No completed tasks yet. Keep going!</div>`
      : `<div class="task-list">${completedTasks.map(t => renderTaskCardHTML(t)).join("")}</div>`;
  } else {
    // "All" view — partitioned into Active and Completed sections
    if (State.tasks.length === 0) {
      contentHTML = `
        <div class="empty-state">
          <div class="empty-icon">✅</div>
          <p>No tasks yet. Create your first task to get started!</p>
          <button class="btn-primary" onclick="openNewTaskModal()" style="margin-top:14px">+ Create First Task</button>
        </div>`;
    } else {
      const activeSection = `
        <div class="tasks-group">
          <div class="tasks-group-header">
            <h3>Active Tasks <span class="group-count">(${activeTasks.length})</span></h3>
          </div>
          <div class="task-list">
            ${activeTasks.length > 0
              ? activeTasks.map(t => renderTaskCardHTML(t)).join("")
              : '<div class="empty-state-sm">No active tasks. All tasks completed!</div>'}
          </div>
        </div>`;

      const completedSection = `
        <div class="tasks-group" style="margin-top:28px">
          <div class="tasks-group-header">
            <h3>Completed Tasks <span class="group-count">(${completedTasks.length})</span></h3>
          </div>
          <div class="task-list">
            ${completedTasks.length > 0
              ? completedTasks.map(t => renderTaskCardHTML(t)).join("")
              : '<div class="empty-state-sm">No completed tasks yet. Check off an active task to earn XP!</div>'}
          </div>
        </div>`;

      contentHTML = activeSection + completedSection;
    }
  }

  page.innerHTML = `
    <div class="page-header">
      <h2>My Tasks</h2>
      <p id="tasks-header-subtitle">${State.tasks.length} task${State.tasks.length !== 1 ? "s" : ""} · ${completedTasks.length} completed</p>
    </div>

    <!-- Ring-Style Progress Indicator on Tasks Page -->
    <div id="tasks-player-card"></div>

    <div class="tasks-controls">
      <div class="tasks-controls-left">
        <div class="filter-tabs">
          <button class="filter-tab${filter === 'all'       ? ' active' : ''}" onclick="setFilter('all')">All (${State.tasks.length})</button>
          <button class="filter-tab${filter === 'pending'   ? ' active' : ''}" onclick="setFilter('pending')">Pending (${activeTasks.length})</button>
          <button class="filter-tab${filter === 'completed' ? ' active' : ''}" onclick="setFilter('completed')">Completed (${completedTasks.length})</button>
        </div>

        <div class="sort-control">
          <span class="sort-icon">⇅</span>
          <select class="sort-select" onchange="setTaskSort(this.value)" aria-label="Sort tasks">
            <option value="default"${sortKey === 'default' ? ' selected' : ''}>Sort: Default (Created)</option>
            <option value="deadline"${sortKey === 'deadline' ? ' selected' : ''}>Sort: Deadline (Nearest)</option>
            <option value="diff_desc"${sortKey === 'diff_desc' ? ' selected' : ''}>Sort: Difficulty (Hardest)</option>
            <option value="diff_asc"${sortKey === 'diff_asc' ? ' selected' : ''}>Sort: Difficulty (Easiest)</option>
          </select>
        </div>
      </div>
      <button class="btn-primary" onclick="openNewTaskModal()">+ New Task</button>
    </div>

    <div id="tasks-list-container">
      ${contentHTML}
    </div>`;

  if (State.player) {
    renderTasksRingProgress(State.player, document.getElementById("tasks-player-card"));
  }
}

function setFilter(f) {
  State.taskFilter = f;
  renderTasksPage(document.getElementById("page-tasks"));
}

function setTaskSort(sortKey) {
  State.taskSort = sortKey;
  renderTasksPage(document.getElementById("page-tasks"));
}

function renderTaskCardHTML(task, isScheduled) {
  if (typeof isScheduled !== "boolean") {
    isScheduled = isTaskScheduled(task.id);
  }

  const cls = task.completed ? " completed" : "";
  const checkmark = task.completed ? "✓" : "";
  const scheduledBadge = isScheduled ? `<span class="badge badge-scheduled">In Schedule</span>` : "";

  // Schedule action button
  let scheduleActionBtn = "";
  if (!task.completed) {
    if (isScheduled) {
      scheduleActionBtn = `
        <button class="btn-schedule is-scheduled" title="In schedule (click to remove)" onclick="removeFromSchedule(${task.id})" aria-label="In schedule">
          <span class="sched-icon">📤</span>
          <span class="sched-label">In Schedule</span>
        </button>`;
    } else {
      scheduleActionBtn = `
        <button class="btn-schedule" title="Add to schedule" onclick="addToSchedule(${task.id})" aria-label="Add to schedule">
          <span class="sched-icon">📋</span>
          <span class="sched-label">Add to Schedule</span>
        </button>`;
    }
  }

  const actions = task.completed
    ? `<button class="btn-icon" title="Undo completion" onclick="undoComplete(${task.id})" aria-label="Undo completion">↩</button>
       <button class="btn-icon" title="Delete task" onclick="confirmDeleteTask(${task.id}, '${esc(task.name).replace(/'/g, "\\'")}')" aria-label="Delete task">🗑</button>`
    : `<button class="btn-icon" title="Edit task" onclick="openEditTaskModal(${task.id})" aria-label="Edit task">✏</button>
       ${scheduleActionBtn}
       <button class="btn-icon" title="Delete task" onclick="confirmDeleteTask(${task.id}, '${esc(task.name).replace(/'/g, "\\'")}')" aria-label="Delete task">🗑</button>`;

  return `
    <div class="task-card${cls}" id="task-card-${task.id}">
      <div class="task-check" onclick="toggleComplete(${task.id}, ${task.completed})" title="${task.completed ? 'Click to undo' : 'Click to complete'}" aria-label="Toggle task">${checkmark}</div>
      <div class="task-info">
        <div class="task-name">${esc(task.name)}</div>
        <div class="task-meta">
          ${diffBadgeHTML(task)}
          ${dueDateHTML(task)}
          ${scheduledBadge}
        </div>
      </div>
      <div class="task-actions">${actions}</div>
    </div>`;
}

function diffBadgeHTML(task) {
  const cls = task.difficulty ? task.difficulty.toLowerCase() : (task.xp <= 10 ? "easy" : task.xp <= 25 ? "medium" : "hard");
  const label = task.difficulty || (task.xp <= 10 ? "Easy" : task.xp <= 25 ? "Medium" : "Hard");
  return `<span class="badge badge-${cls}"><span class="diff-dot ${cls}"></span>${label} · ${task.xp} XP</span>`;
}

function dueDateHTML(task) {
  if (!task.dueDate) return "";
  const today = new Date().toISOString().split("T")[0];
  const isOverdue = task.dueDate < today && !task.completed;
  const cls = isOverdue ? "badge-overdue" : "badge-due";
  const icon = isOverdue ? "⚠" : "📅";
  return `<span class="badge ${cls}">${icon} ${task.dueDate}</span>`;
}

// ---------------------------------------------------------------------------
// Task complete / undo
// ---------------------------------------------------------------------------
async function toggleComplete(taskId, isCompleted) {
  if (!isCompleted) {
    await completeTask(taskId);
  } else {
    await undoComplete(taskId);
  }
}

async function completeTask(taskId) {
  try {
    const res = await POST(`/tasks/${taskId}/complete`, {});
    State.player = res.player;

    // Update in tasks state
    const idx = State.tasks.findIndex(t => Number(t.id) === Number(taskId));
    if (idx !== -1) {
      State.tasks[idx] = res.task;
    } else {
      State.tasks.push(res.task);
    }

    // Remove from schedule state too (DB automatically deletes from scheduled_tasks)
    State.schedule = State.schedule.filter(t => Number(t.id) !== Number(taskId) && Number(t.taskId) !== Number(taskId));
    updateTaskScheduleState(taskId, false);

    // Update player information across all screens immediately
    updateAllPlayerUI();

    // Re-render the active screen immediately
    if (State.currentPage === "tasks") {
      renderTasksPage(document.getElementById("page-tasks"));
    } else if (State.currentPage === "dashboard") {
      loadDashboard();
    } else if (State.currentPage === "schedule") {
      renderSchedulePage(document.getElementById("page-schedule"));
    } else if (State.currentPage === "levels") {
      renderLevelsPage(document.getElementById("page-levels"));
    }

    toast(`+${res.xpEarned} XP earned! Task completed.`, "success", () => undoComplete(taskId));

    if (res.leveledUp) showLevelUp(res.newLevel, res.player.levelTitle);
  } catch (err) {
    toast(err.message, "error");
  }
}

async function undoComplete(taskId) {
  try {
    const res = await POST(`/tasks/${taskId}/uncomplete`, {});
    State.player = res.player;

    const idx = State.tasks.findIndex(t => Number(t.id) === Number(taskId));
    if (idx !== -1) {
      State.tasks[idx] = res.task;
    }

    updateTaskScheduleState(taskId, false);

    // Update player information across all screens immediately
    updateAllPlayerUI();

    // Re-render active page immediately
    if (State.currentPage === "tasks") {
      renderTasksPage(document.getElementById("page-tasks"));
    } else if (State.currentPage === "dashboard") {
      loadDashboard();
    } else if (State.currentPage === "schedule") {
      renderSchedulePage(document.getElementById("page-schedule"));
    } else if (State.currentPage === "levels") {
      renderLevelsPage(document.getElementById("page-levels"));
    }

    toast(`Completion undone. ${res.xpDeducted} XP removed.`, "info");
  } catch (err) {
    toast(err.message, "error");
  }
}

// ---------------------------------------------------------------------------
// Task modal (create / edit)
// ---------------------------------------------------------------------------
function openNewTaskModal() {
  State.editingTaskId = null;
  document.getElementById("task-modal-title").textContent = "New Task";
  document.getElementById("task-name").value = "";
  document.getElementById("task-due").value  = "";
  document.getElementById("diff-easy").checked = true;
  document.getElementById("task-save-btn").textContent = "Create Task";
  clearFormErrors();
  document.getElementById("task-modal").classList.remove("hidden");
  setTimeout(() => document.getElementById("task-name").focus(), 50);
}

function openEditTaskModal(taskId) {
  const task = State.tasks.find(t => Number(t.id) === Number(taskId));
  if (!task) return;
  State.editingTaskId = taskId;
  document.getElementById("task-modal-title").textContent = "Edit Task";
  document.getElementById("task-name").value = task.name;
  document.getElementById("task-due").value  = task.dueDate || "";
  const xpStr = String(task.xp);
  document.querySelectorAll("input[name='task-xp']").forEach(r => {
    r.checked = r.value === xpStr;
  });
  document.getElementById("task-save-btn").textContent = "Save Changes";
  clearFormErrors();
  document.getElementById("task-modal").classList.remove("hidden");
  setTimeout(() => document.getElementById("task-name").focus(), 50);
}

function closeTaskModal() {
  document.getElementById("task-modal").classList.add("hidden");
  State.editingTaskId = null;
}
function closeTaskModalOnBackdrop(e) {
  if (e.target === e.currentTarget) closeTaskModal();
}

async function handleTaskSave(e) {
  e.preventDefault();
  const name    = document.getElementById("task-name").value.trim();
  const xp      = parseInt(document.querySelector("input[name='task-xp']:checked")?.value || "10");
  const dueDate = document.getElementById("task-due").value || "";
  const btn     = document.getElementById("task-save-btn");

  if (!name) { showFormError("task-form-error", "Task name is required."); return; }

  btn.disabled = true;
  btn.textContent = "Saving…";

  try {
    if (State.editingTaskId !== null) {
      // Edit
      const updated = await PUT(`/tasks/${State.editingTaskId}`, { name, xp, dueDate });
      const idx = State.tasks.findIndex(t => Number(t.id) === Number(State.editingTaskId));
      if (idx !== -1) State.tasks[idx] = updated;
      toast("Task updated.", "success");
    } else {
      // Create
      const created = await POST("/tasks", { name, xp, dueDate });
      State.tasks.push(created);
      toast("Task created!", "success");
    }
    closeTaskModal();
    if (State.currentPage === "tasks") renderTasksPage(document.getElementById("page-tasks"));
    if (State.currentPage === "dashboard") loadDashboard();
  } catch (err) {
    showFormError("task-form-error", err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = State.editingTaskId !== null ? "Save Changes" : "Create Task";
  }
}

// ---------------------------------------------------------------------------
// Task delete
// ---------------------------------------------------------------------------
function confirmDeleteTask(taskId, name) {
  openConfirm(
    "Delete Task",
    `Delete "${name}"? This cannot be undone.`,
    async () => {
      try {
        await DEL(`/tasks/${taskId}`);
        State.tasks    = State.tasks.filter(t => Number(t.id) !== Number(taskId));
        State.schedule = State.schedule.filter(t => Number(t.id) !== Number(taskId) && Number(t.taskId) !== Number(taskId));
        if (State.currentPage === "tasks") renderTasksPage(document.getElementById("page-tasks"));
        if (State.currentPage === "schedule") renderSchedulePage(document.getElementById("page-schedule"));
        if (State.currentPage === "dashboard") loadDashboard();
        toast("Task deleted.", "info");
      } catch (err) {
        toast(err.message, "error");
      }
    },
    "Delete"
  );
}

// ---------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------
async function addToSchedule(taskId) {
  try {
    await POST("/schedule", { taskId });
    updateTaskScheduleState(taskId, true);
    // Refresh schedule state from server for exact order
    State.schedule = await GET("/schedule");

    if (State.currentPage === "tasks")    renderTasksPage(document.getElementById("page-tasks"));
    if (State.currentPage === "dashboard") loadDashboard();
    if (State.currentPage === "schedule") renderSchedulePage(document.getElementById("page-schedule"));
    toast("Added to schedule.", "success");
  } catch (err) {
    toast(err.message, "error");
    if (err.message && err.message.toLowerCase().includes("already")) {
      updateTaskScheduleState(taskId, true);
      State.schedule = await GET("/schedule").catch(() => State.schedule);
      if (State.currentPage === "tasks")    renderTasksPage(document.getElementById("page-tasks"));
      if (State.currentPage === "dashboard") loadDashboard();
    }
  }
}

async function removeFromSchedule(taskId) {
  try {
    await DEL(`/schedule/${taskId}`);
    State.schedule = State.schedule.filter(t => Number(t.id) !== Number(taskId) && Number(t.taskId) !== Number(taskId));
    updateTaskScheduleState(taskId, false);

    if (State.currentPage === "tasks")    renderTasksPage(document.getElementById("page-tasks"));
    if (State.currentPage === "dashboard") loadDashboard();
    if (State.currentPage === "schedule") renderSchedulePage(document.getElementById("page-schedule"));
    toast("Removed from schedule.", "info");
  } catch (err) {
    toast(err.message, "error");
  }
}

// ---------------------------------------------------------------------------
// SCHEDULE PAGE
// ---------------------------------------------------------------------------
async function loadSchedule() {
  const page = document.getElementById("page-schedule");
  if (!page.innerHTML.trim() || page.querySelector(".loading-spinner")) {
    page.innerHTML = `<div class="loading-spinner"><div class="spinner"></div> Loading schedule…</div>`;
  }

  try {
    const [sched, playerData] = await Promise.all([GET("/schedule"), GET("/player")]);
    State.schedule = sched;
    State.player   = playerData;
    updateAllPlayerUI();
    renderSchedulePage(page);
  } catch (err) {
    page.innerHTML = `<p style="color:var(--danger)">Failed to load schedule: ${esc(err.message)}</p>`;
  }
}

function renderSchedulePage(page) {
  const sched = State.schedule;

  let nextCardHTML = "";
  if (sched.length > 0) {
    const next = sched[0];
    nextCardHTML = `
      <div class="schedule-next-card">
        <div class="snc-label">📌 Up Next in Queue</div>
        <div class="snc-name">${esc(next.name)}</div>
        <div class="task-meta" style="margin-bottom:14px">
          ${diffBadgeHTML(next)} ${dueDateHTML(next)}
        </div>
        <div class="snc-actions">
          <button class="btn-primary" onclick="processNext()">✓ Complete &amp; Earn XP</button>
          <button class="btn-ghost" onclick="skipNext()">↷ Skip for now</button>
          <button class="btn-ghost" onclick="removeFromSchedule(${next.id})" style="border-color:var(--border);">Remove</button>
        </div>
      </div>`;
  }

  let queueHTML = "";
  if (sched.length <= 1) {
    if (sched.length === 0) {
      queueHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <p>Your schedule is empty.<br/>Go to <span class="lime" style="cursor:pointer;font-weight:600" onclick="navigate('tasks')">My Tasks</span> and add tasks to plan your execution order.</p>
          <button class="btn-primary" onclick="navigate('tasks')" style="margin-top:14px">Go to Tasks</button>
        </div>`;
    }
  } else {
    // Show items after the first
    queueHTML = `
      <div class="section-header" style="margin-top:28px">
        <h3>Coming Up</h3>
        <span style="color:var(--text-muted);font-size:.84rem">${sched.length - 1} more task${sched.length - 1 !== 1 ? "s" : ""}</span>
      </div>
      <div class="queue-list">
        ${sched.slice(1).map((t, i) => `
          <div class="queue-item">
            <div class="queue-pos">${i + 2}</div>
            <div class="queue-info">
              <div class="queue-name">${esc(t.name)}</div>
              <div class="queue-meta">${diffBadgeHTML(t)} ${dueDateHTML(t)}</div>
            </div>
            <div class="task-actions" style="opacity:1">
              <button class="btn-icon" title="Remove from schedule" onclick="removeFromSchedule(${t.id})" aria-label="Remove from schedule">✕</button>
            </div>
          </div>`).join("")}
      </div>`;
  }

  page.innerHTML = `
    <div class="page-header">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
        <div>
          <h2>My Schedule</h2>
          <p>${sched.length} task${sched.length !== 1 ? "s" : ""} in FIFO queue &mdash; your focused execution order</p>
        </div>
        <div class="schedule-header-actions">
          <button class="btn-ghost" onclick="navigate('tasks')">+ Add Tasks</button>
        </div>
      </div>
    </div>
    ${sched.length === 0 ? '' : nextCardHTML}
    ${queueHTML}`;
}

async function processNext() {
  try {
    const res = await POST("/schedule/next/process", {});
    State.player = res.player;
    State.schedule = State.schedule.filter(t => Number(t.id) !== Number(res.task.id) && Number(t.taskId) !== Number(res.task.id));
    const idx = State.tasks.findIndex(t => Number(t.id) === Number(res.task.id));
    if (idx !== -1) State.tasks[idx] = res.task;
    updateTaskScheduleState(res.task.id, false);

    updateAllPlayerUI();
    renderSchedulePage(document.getElementById("page-schedule"));
    if (State.currentPage === "levels") {
      renderLevelsPage(document.getElementById("page-levels"));
    }
    toast(`+${res.xpEarned} XP! "${esc(res.task.name)}" completed.`, "success");
    if (res.leveledUp) showLevelUp(res.newLevel, res.player.levelTitle);
  } catch (err) {
    toast(err.message, "error");
    loadSchedule();
  }
}

async function skipNext() {
  try {
    const skipped = State.schedule[0];
    await POST("/schedule/next/skip", {});
    if (State.schedule.length > 1) {
      const first = State.schedule.shift();
      State.schedule.push(first);
    }
    renderSchedulePage(document.getElementById("page-schedule"));
    toast(`"${esc(skipped?.name || 'Task')}" moved to end of schedule.`, "info");
  } catch (err) {
    toast(err.message, "error");
    loadSchedule();
  }
}

// ---------------------------------------------------------------------------
// ACHIEVEMENTS / LEVELS PAGE
// ---------------------------------------------------------------------------
async function loadLevels() {
  const page = document.getElementById("page-levels");
  if (!page.innerHTML.trim() || page.querySelector(".loading-spinner")) {
    page.innerHTML = `<div class="loading-spinner"><div class="spinner"></div> Loading achievements &amp; ranks…</div>`;
  }
  try {
    const playerData = await GET("/player");
    State.player = playerData;
    updateAllPlayerUI();
    renderLevelsPage(page);
  } catch (err) {
    page.innerHTML = `<p style="color:var(--danger)">Failed to load achievements: ${esc(err.message)}</p>`;
  }
}

function renderLevelsPage(page) {
  const p = State.player || { totalXP: 0, level: 1, levelTitle: "Beginner", progressPct: 0, xpToNext: 100 };
  const curLevel = p.level;
  const totalXP = p.totalXP;
  const unlockedCount = curLevel;
  const nextDef = LEVEL_DEFINITIONS.find(d => d.level === curLevel + 1);

  const cardsHTML = LEVEL_DEFINITIONS.map(def => {
    const isUnlocked = def.level <= curLevel;
    const isCurrent  = def.level === curLevel;
    const isLocked   = def.level > curLevel;
    const xpNeeded   = Math.max(0, def.xp - totalXP);

    let statusBadge = "";
    let cardCls = "level-card";

    // Special prestige card styling for the final four ranks (17, 18, 19, 20)
    if (def.level === 17) cardCls += " prestige-grandmaster";
    if (def.level === 18) cardCls += " prestige-legend";
    if (def.level === 19) cardCls += " prestige-icon";
    if (def.level === 20) cardCls += " prestige-supreme-legend";

    if (isCurrent) {
      cardCls += " current-level-card";
      statusBadge = `<span class="level-status-badge current">Current Rank</span>`;
    } else if (isUnlocked) {
      cardCls += " unlocked-level-card";
      statusBadge = `<span class="level-status-badge unlocked">✓ Unlocked</span>`;
    } else {
      cardCls += " locked-level-card";
      statusBadge = `<span class="level-status-badge locked">🔒 Locked</span>`;
    }

    // Clean two-line XP block: [XP Amount] / [XP Needed or Status]
    const xpPrimaryText = isLocked ? `${xpNeeded.toLocaleString()} XP` : `${def.xp.toLocaleString()} XP`;
    const xpSecondaryText = isCurrent ? "Current Rank" : (isUnlocked ? "Requirement Met" : "XP Needed");

    return `
      <div class="${cardCls}">
        <div class="level-card-top">
          <div class="level-card-icon-wrap">
            <span class="level-card-icon">${def.icon}</span>
          </div>
          <div class="level-card-badge-wrap">
            ${statusBadge}
          </div>
        </div>
        <div class="level-card-header">
          <span class="level-num">Level ${def.level}</span>
          <h4 class="level-title">${esc(def.title)}</h4>
        </div>
        <div class="level-xp-metric">
          <div class="level-xp-primary">${xpPrimaryText}</div>
          <div class="level-xp-secondary">${xpSecondaryText}</div>
        </div>
        <div class="level-milestone-tag">Milestone: ${def.xp.toLocaleString()} XP</div>
        <p class="level-card-desc">${esc(def.desc)}</p>
      </div>`;
  }).join("");

  page.innerHTML = `
    <div class="page-header">
      <h2>Achievements &amp; Ranks</h2>
      <p>Master all 20 ranks from Beginner to Life Upgrade Legend. Complete tasks to earn XP and level up.</p>
    </div>

    <!-- Levels Overview Hero Banner -->
    <div class="levels-hero-card">
      <div class="levels-hero-left">
        <div class="levels-hero-icon">${LEVEL_DEFINITIONS[curLevel - 1]?.icon || '⚡'}</div>
        <div class="levels-hero-info">
          <div class="levels-hero-rank-label">CURRENT ACTIVE RANK</div>
          <div class="levels-hero-rank-title">Level ${curLevel} &mdash; ${esc(p.levelTitle)}</div>
          <div class="levels-hero-meta">
            <span><strong>${totalXP.toLocaleString()}</strong> Total XP</span>
            <span>&bull;</span>
            <span><strong>${unlockedCount}</strong> of 20 ranks unlocked</span>
            ${nextDef ? `<span>&bull;</span><span>${p.xpToNext.toLocaleString()} XP to Level ${curLevel + 1}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="levels-hero-right">
        <div class="levels-stat-badge">
          <span class="levels-stat-num">${unlockedCount} / 20</span>
          <span class="levels-stat-lbl">Unlocked</span>
        </div>
      </div>
    </div>

    <div class="levels-grid">
      ${cardsHTML}
    </div>`;
}

// ---------------------------------------------------------------------------
// Confirm modal
// ---------------------------------------------------------------------------
function openConfirm(title, message, callback, okLabel = "Confirm") {
  State.confirmCb = callback;
  document.getElementById("confirm-title").textContent = title;
  document.getElementById("confirm-message").textContent = message;
  document.getElementById("confirm-ok-btn").textContent = okLabel;
  document.getElementById("confirm-modal").classList.remove("hidden");
}
function closeConfirm() {
  document.getElementById("confirm-modal").classList.add("hidden");
  State.confirmCb = null;
}
function confirmOk() {
  if (State.confirmCb) State.confirmCb();
  closeConfirm();
}
function closeConfirmOnBackdrop(e) {
  if (e.target === e.currentTarget) closeConfirm();
}

// ---------------------------------------------------------------------------
// Level-up overlay
// ---------------------------------------------------------------------------
function showLevelUp(level, title) {
  const overlay = document.getElementById("levelup-overlay");
  document.getElementById("levelup-level").textContent = "Level " + level;
  document.getElementById("levelup-title").textContent = title;

  const sparksContainer = document.getElementById("levelup-sparks");
  sparksContainer.innerHTML = "";
  for (let i = 0; i < 24; i++) {
    const spark = document.createElement("div");
    spark.className = "spark";
    spark.style.left   = Math.random() * 100 + "%";
    spark.style.bottom = "0";
    spark.style.animationDelay = (Math.random() * 0.6) + "s";
    spark.style.width  = spark.style.height = (Math.random() * 6 + 3) + "px";
    sparksContainer.appendChild(spark);
  }

  overlay.classList.remove("hidden");
}

function closeLevelUp() {
  document.getElementById("levelup-overlay").classList.add("hidden");
}

// ---------------------------------------------------------------------------
// Toast notifications
// ---------------------------------------------------------------------------
function toast(message, type = "info", undoCb = null) {
  const container = document.getElementById("toast-container");
  const el = document.createElement("div");
  el.className = `toast ${type}`;

  const msgEl = document.createElement("span");
  msgEl.textContent = message;
  el.appendChild(msgEl);

  if (undoCb) {
    const undoBtn = document.createElement("button");
    undoBtn.className = "toast-undo";
    undoBtn.textContent = "Undo";
    undoBtn.onclick = () => { el.remove(); undoCb(); };
    el.appendChild(undoBtn);
  }

  container.appendChild(el);

  const delay = undoCb ? 5000 : 3500;
  setTimeout(() => {
    el.style.animation = "toastOut .25s ease forwards";
    setTimeout(() => el.remove(), 260);
  }, delay);
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------
function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
