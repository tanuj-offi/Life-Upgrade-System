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
  editingTaskId: null,     // null = creating, integer = editing
  confirmCb:     null,     // callback for confirm modal
};

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
  const validPages = ["dashboard", "tasks", "schedule"];
  const targetPage = validPages.includes(path) ? path : "dashboard";
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
  const titles = { dashboard: "Dashboard", tasks: "My Tasks", schedule: "Schedule" };
  document.getElementById("topbar-title").textContent = titles[page] || page;

  // Hide all pages, show target
  document.querySelectorAll(".page").forEach(el => el.classList.add("hidden"));
  document.getElementById("page-" + page).classList.remove("hidden");

  // Close sidebar on mobile
  document.getElementById("sidebar").classList.remove("open");

  // Load page data
  if (page === "dashboard") loadDashboard();
  else if (page === "tasks") loadTasks();
  else if (page === "schedule") loadSchedule();
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
  const pInfo = p
    ? `<div class="sidebar-player-mini" style="margin-top:6px;font-size:.8rem;color:var(--text-secondary);"><span class="lime" style="font-weight:700">Lv.${p.level}</span> ${esc(p.levelTitle)} &middot; <span style="color:var(--text-muted)">${p.totalXP.toLocaleString()} XP</span></div>`
    : "";
  el.innerHTML = `<div>Signed in as <strong>${esc(State.user.username)}</strong></div>${pInfo}`;
}

function updateTopbarPlayer() {
  const el = document.getElementById("topbar-player");
  if (!el) return;
  if (!State.player) { el.textContent = ""; return; }
  const p = State.player;
  el.textContent = `Lv.${p.level} · ${p.totalXP.toLocaleString()} XP`;
}

function renderPlayerCard(p, container) {
  if (!container || !p) return;
  const nextLabel = p.isMaxLevel
    ? "Max Level Reached!"
    : `${p.xpToNext} XP to ${esc(p.nextLevelTitle || "")}`;

  container.innerHTML = `
    <div class="player-card">
      <div class="player-top">
        <div>
          <div class="player-level-badge">⚡ Level ${p.level} &mdash; ${esc(p.levelTitle)}</div>
        </div>
        <div class="player-xp-info">
          <div class="xp-total">${p.totalXP.toLocaleString()} XP</div>
          <div class="xp-label">Total Experience</div>
        </div>
      </div>
      <div class="xp-bar-track">
        <div class="xp-bar-fill" style="width:${p.progressPct}%"></div>
      </div>
      <div class="xp-bar-labels">
        <span>${p.progressPct}% complete</span>
        <span>${nextLabel}</span>
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
    if (tasksCard) renderPlayerCard(State.player, tasksCard);
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

  let upcomingHTML = "";
  if (!data.upcoming || data.upcoming.length === 0) {
    upcomingHTML = `<div class="empty-state"><div class="empty-icon">🎉</div>No upcoming tasks with due dates.</div>`;
  } else {
    upcomingHTML = `<div class="task-list">${data.upcoming.map(t => renderTaskCardHTML(t)).join("")}</div>`;
  }

  let schedPreviewHTML = "";
  if (!data.schedulePreview || data.schedulePreview.length === 0) {
    schedPreviewHTML = `<div class="empty-state"><div class="empty-icon">📋</div>Your schedule is empty. Add tasks to plan your work order.</div>`;
  } else {
    schedPreviewHTML = `<div class="queue-list">${
      data.schedulePreview.map((t, i) => `
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
    <div class="page-header">
      <h2>Welcome back, ${esc(State.user?.username || "adventurer")}!</h2>
      <p id="dash-header-subtitle">Level ${p.level} ${esc(p.levelTitle)} · ${p.totalXP.toLocaleString()} XP earned</p>
    </div>

    <div id="dash-player-card"></div>

    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">Total Tasks</div>
        <div class="stat-value" id="stat-total-tasks">${stats.total}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Completed</div>
        <div class="stat-value lime" id="stat-completed-tasks">${stats.completed}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Pending</div>
        <div class="stat-value muted" id="stat-pending-tasks">${stats.pending}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <h3>⏰ Upcoming Tasks</h3>
        <span class="section-link" onclick="navigate('tasks')">View all</span>
      </div>
      <div id="dash-upcoming-container">${upcomingHTML}</div>
    </div>

    <div class="section">
      <div class="section-header">
        <h3>📋 Schedule Preview</h3>
        <span class="section-link" onclick="navigate('schedule')">Manage schedule</span>
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
  const activeTasks    = State.tasks.filter(t => !t.completed);
  const completedTasks = State.tasks.filter(t => t.completed);

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
      contentHTML = `<div class="empty-state"><div class="empty-icon">✅</div>No tasks yet. Create your first task to get started!</div>`;
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

    <div id="tasks-player-card"></div>

    <div class="tasks-controls">
      <div class="filter-tabs">
        <button class="filter-tab${filter === 'all'       ? ' active' : ''}" onclick="setFilter('all')">All (${State.tasks.length})</button>
        <button class="filter-tab${filter === 'pending'   ? ' active' : ''}" onclick="setFilter('pending')">Pending (${activeTasks.length})</button>
        <button class="filter-tab${filter === 'completed' ? ' active' : ''}" onclick="setFilter('completed')">Completed (${completedTasks.length})</button>
      </div>
      <button class="btn-primary" onclick="openNewTaskModal()">+ New Task</button>
    </div>
    <div id="tasks-list-container">
      ${contentHTML}
    </div>`;

  if (State.player) {
    renderPlayerCard(State.player, document.getElementById("tasks-player-card"));
  }
}

function setFilter(f) {
  State.taskFilter = f;
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
      <div class="task-check" onclick="toggleComplete(${task.id}, ${task.completed})">${checkmark}</div>
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
  return `<span class="badge badge-${cls}">${label} · ${task.xp} XP</span>`;
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
        <div class="snc-label">📌 Up Next</div>
        <div class="snc-name">${esc(next.name)}</div>
        <div class="task-meta" style="margin-bottom:12px">
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
      queueHTML = `<div class="empty-state"><div class="empty-icon">📋</div>Your schedule is empty.<br/>Go to <span class="lime" style="cursor:pointer" onclick="navigate('tasks')">My Tasks</span> and add tasks to your schedule.</div>`;
    }
  } else {
    // Show items after the first
    queueHTML = `
      <div class="section-header" style="margin-top:24px">
        <h3>Coming Up</h3>
        <span style="color:var(--text-muted);font-size:.82rem">${sched.length - 1} more task${sched.length - 1 !== 1 ? "s" : ""}</span>
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
          <p>${sched.length} task${sched.length !== 1 ? "s" : ""} in queue &mdash; your planned work order</p>
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
  for (let i = 0; i < 20; i++) {
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
