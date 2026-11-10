"""
Life Upgrade System — Flask Web Server
--------------------------------------
Connects to the same MySQL database used by the C++ CLI.
Implements all business logic (XP, levels, task CRUD, scheduling, undo) in Python
so the frontend gets a clean JSON REST API without needing a C++ HTTP server.

The Player XP / level tables and formulas are kept identical to Player.cpp.
The task schema is identical to what DatabaseManager.cpp creates/reads.
"""

import os
import hashlib
import secrets
import re
from functools import wraps
from datetime import datetime, date

from flask import (
    Flask, request, jsonify, session,
    render_template, redirect, url_for
)
import mysql.connector
from mysql.connector import Error as MySQLError

# ---------------------------------------------------------------------------
# App configuration
# ---------------------------------------------------------------------------
app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", secrets.token_hex(32))

# Database credentials — mirrors db_config.h (not committed to Git)
def _load_header_config():
    """Load default credentials from ../db_config.h if present, without hardcoding secrets."""
    header_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "db_config.h")
    cfg = {}
    if os.path.exists(header_path):
        try:
            with open(header_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    m_str = re.match(r'#define\s+(DB_\w+)\s+"([^"]*)"', line)
                    if m_str:
                        cfg[m_str.group(1)] = m_str.group(2)
                        continue
                    m_int = re.match(r'#define\s+(DB_\w+)\s+(\d+)', line)
                    if m_int:
                        cfg[m_int.group(1)] = int(m_int.group(2))
        except Exception:
            pass
    return cfg

_HEADER_CFG = _load_header_config()

DB_CONFIG = {
    "host":     os.environ.get("DB_HOST", _HEADER_CFG.get("DB_HOST", "localhost")),
    "user":     os.environ.get("DB_USER", _HEADER_CFG.get("DB_USER", "root")),
    "password": os.environ.get("DB_PASS", _HEADER_CFG.get("DB_PASS", "")),
    "database": os.environ.get("DB_NAME", _HEADER_CFG.get("DB_NAME", "life_upgrade_db")),
    "port":     int(os.environ.get("DB_PORT", _HEADER_CFG.get("DB_PORT", 3306))),
}

ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGIN", "http://localhost:5000")

# ---------------------------------------------------------------------------
# Player level tables — exact copy from Player.cpp
# ---------------------------------------------------------------------------
MAX_LEVEL = 20
LEVEL_XP = [
    0, 100, 225, 375, 550, 750, 975, 1225, 1500, 1800,
    2125, 2475, 2850, 3250, 3675, 4125, 4600, 5100, 5625, 6175,
]
LEVEL_TITLES = [
    "Beginner", "Starter", "Learner", "Builder", "Achiever",
    "Focused", "Consistent", "Dedicated", "Skilled", "Pro",
    "Advanced", "Expert", "Specialist", "Champion", "Elite",
    "Master", "Grandmaster", "Legend", "Icon", "Life Upgrade Legend",
]


def compute_level(total_xp: int) -> int:
    """Mirror of Player::getLevel()"""
    level = 1
    for i in range(MAX_LEVEL):
        if total_xp >= LEVEL_XP[i]:
            level = i + 1
        else:
            break
    return level


def xp_to_next_level(total_xp: int) -> int:
    level = compute_level(total_xp)
    if level >= MAX_LEVEL:
        return 0
    return LEVEL_XP[level] - total_xp


def progress_percent(total_xp: int) -> int:
    level = compute_level(total_xp)
    if level >= MAX_LEVEL:
        return 100
    cur_min = LEVEL_XP[level - 1]
    nxt_min = LEVEL_XP[level]
    span = nxt_min - cur_min
    return int((total_xp - cur_min) * 100 / span) if span > 0 else 100


def player_data(total_xp: int) -> dict:
    level = compute_level(total_xp)
    return {
        "totalXP":       total_xp,
        "level":         level,
        "levelTitle":    LEVEL_TITLES[level - 1],
        "progressPct":   progress_percent(total_xp),
        "xpToNext":      xp_to_next_level(total_xp),
        "nextLevelTitle": LEVEL_TITLES[level] if level < MAX_LEVEL else None,
        "isMaxLevel":    level >= MAX_LEVEL,
    }


# ---------------------------------------------------------------------------
# Task XP / difficulty helpers — mirrors Task::get_difficulty()
# ---------------------------------------------------------------------------
XP_EASY   = 10
XP_MEDIUM = 25
XP_HARD   = 50


def xp_to_difficulty(xp: int) -> str:
    if xp <= 10:
        return "Easy"
    if xp <= 25:
        return "Medium"
    return "Hard"


# ---------------------------------------------------------------------------
# Password hashing — salted SHA-256, matches DatabaseManager.cpp approach
# ---------------------------------------------------------------------------

def _sha256(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def hash_password(password: str) -> str:
    """Generate a random salt + SHA-256 hash in the same format as the C++ code."""
    salt = secrets.token_hex(16)          # 32 hex chars
    return salt + ":" + _sha256(salt + password)


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify against the salted hash stored by either the C++ or Python server."""
    if ":" not in stored_hash:
        return False
    salt, hashed = stored_hash.split(":", 1)
    return _sha256(salt + password) == hashed


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def get_db():
    """Return a fresh MySQL connection."""
    return mysql.connector.connect(**DB_CONFIG)


def _task_row_to_dict(row, is_scheduled=False) -> dict:
    """Convert a tasks table row to a serialisable dict, including scheduled state."""
    task_id, user_id, name, xp, completed, due_date, created_at = row[:7]
    if len(row) > 7 and row[7] is not None:
        is_scheduled = bool(row[7])
    return {
        "id":          task_id,
        "taskId":      task_id,
        "name":        name,
        "xp":          xp,
        "difficulty":  xp_to_difficulty(xp),
        "completed":   bool(completed),
        "dueDate":     due_date.strftime("%Y-%m-%d") if due_date else None,
        "createdAt":   created_at.isoformat() if created_at else None,
        "isScheduled": bool(is_scheduled),
    }


def _recompact_user_schedule(cur, uid):
    """Re-sequence the user's scheduled tasks to 1..N in queue_order ASC without unique collisions."""
    cur.execute(
        "SELECT id, queue_order FROM scheduled_tasks WHERE user_id = %s ORDER BY queue_order ASC",
        (uid,),
    )
    rows = cur.fetchall()
    if any(order != i for i, (_, order) in enumerate(rows, 1)):
        cur.execute("UPDATE scheduled_tasks SET queue_order = -id WHERE user_id = %s", (uid,))
        for i, (sid, _) in enumerate(rows, 1):
            cur.execute(
                "UPDATE scheduled_tasks SET queue_order = %s WHERE id = %s AND user_id = %s",
                (i, sid, uid),
            )



# ---------------------------------------------------------------------------
# Session authentication decorator
# ---------------------------------------------------------------------------

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)
    return decorated


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def valid_date(s: str) -> bool:
    if not s:
        return True          # optional
    if not ISO_DATE_RE.match(s):
        return False
    try:
        datetime.strptime(s, "%Y-%m-%d")
        return True
    except ValueError:
        return False


def valid_xp(xp) -> bool:
    return xp in (XP_EASY, XP_MEDIUM, XP_HARD)


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or len(username) < 3 or len(username) > 50:
        return jsonify({"error": "Username must be 3–50 characters"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    hashed = hash_password(password)
    try:
        db = get_db()
        cur = db.cursor()
        db.start_transaction()

        # Insert user
        cur.execute(
            "INSERT INTO users (username, password_hash) VALUES (%s, %s)",
            (username, hashed),
        )
        user_id = cur.lastrowid

        # Initialise player progress
        cur.execute(
            "INSERT INTO player_progress (user_id, total_xp) VALUES (%s, 0)",
            (user_id,),
        )
        db.commit()
        cur.close()
        db.close()

        session["user_id"]  = user_id
        session["username"] = username
        return jsonify({"message": "Registered successfully", "username": username}), 201

    except MySQLError as e:
        if e.errno == 1062:
            return jsonify({"error": "Username already taken"}), 409
        return jsonify({"error": "Registration failed"}), 500


@app.route("/api/auth/login", methods=["POST"])
def login():
    data     = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    try:
        db  = get_db()
        cur = db.cursor()
        cur.execute(
            "SELECT id, password_hash FROM users WHERE username = %s",
            (username,),
        )
        row = cur.fetchone()
        cur.close()
        db.close()

        if not row or not verify_password(password, row[1]):
            return jsonify({"error": "Invalid username or password"}), 401

        session["user_id"]  = row[0]
        session["username"] = username
        return jsonify({"message": "Logged in", "username": username})

    except MySQLError:
        return jsonify({"error": "Login failed"}), 500


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})


@app.route("/api/auth/me", methods=["GET"])
def me():
    if "user_id" not in session:
        return jsonify({"authenticated": False}), 401
    return jsonify({"authenticated": True, "username": session["username"], "userId": session["user_id"]})


# ---------------------------------------------------------------------------
# Player / XP routes
# ---------------------------------------------------------------------------

@app.route("/api/player", methods=["GET"])
@login_required
def get_player():
    uid = session["user_id"]
    try:
        db  = get_db()
        cur = db.cursor()
        cur.execute("SELECT total_xp FROM player_progress WHERE user_id = %s", (uid,))
        row = cur.fetchone()
        cur.close()
        db.close()
        total_xp = row[0] if row else 0
        return jsonify(player_data(total_xp))
    except MySQLError:
        return jsonify({"error": "Failed to load player data"}), 500


# ---------------------------------------------------------------------------
# Task routes
# ---------------------------------------------------------------------------

@app.route("/api/tasks", methods=["GET"])
@login_required
def list_tasks():
    uid = session["user_id"]
    try:
        db  = get_db()
        cur = db.cursor()
        cur.execute(
            """
            SELECT t.id, t.user_id, t.name, t.xp, t.completed, t.due_date, t.created_at,
                   CASE WHEN st.id IS NOT NULL THEN 1 ELSE 0 END AS is_scheduled
            FROM tasks t
            LEFT JOIN scheduled_tasks st ON st.task_id = t.id AND st.user_id = t.user_id
            WHERE t.user_id = %s
            ORDER BY t.id ASC
            """,
            (uid,),
        )
        rows = cur.fetchall()
        cur.close()
        db.close()
        return jsonify([_task_row_to_dict(r) for r in rows])
    except MySQLError:
        return jsonify({"error": "Failed to load tasks"}), 500


@app.route("/api/tasks", methods=["POST"])
@login_required
def create_task():
    uid  = session["user_id"]
    data = request.get_json(silent=True) or {}
    name     = (data.get("name") or "").strip()
    xp       = data.get("xp", XP_EASY)
    due_date = (data.get("dueDate") or "").strip()

    if not name:
        return jsonify({"error": "Task name is required"}), 400
    if len(name) > 255:
        return jsonify({"error": "Task name is too long (max 255 chars)"}), 400
    if not valid_xp(xp):
        return jsonify({"error": "Invalid XP value. Use 10 (Easy), 25 (Medium), or 50 (Hard)"}), 400
    if not valid_date(due_date):
        return jsonify({"error": "Due date must be in YYYY-MM-DD format"}), 400

    due_val = due_date if due_date else None
    try:
        db  = get_db()
        cur = db.cursor()
        cur.execute(
            "INSERT INTO tasks (user_id, name, xp, completed, due_date) VALUES (%s, %s, %s, 0, %s)",
            (uid, name, xp, due_val),
        )
        task_id = cur.lastrowid
        db.commit()
        cur.execute(
            "SELECT id, user_id, name, xp, completed, due_date, created_at FROM tasks WHERE id = %s",
            (task_id,),
        )
        row = cur.fetchone()
        cur.close()
        db.close()
        return jsonify(_task_row_to_dict(row, is_scheduled=False)), 201
    except MySQLError:
        return jsonify({"error": "Failed to create task"}), 500


@app.route("/api/tasks/<int:task_id>", methods=["PUT"])
@login_required
def update_task(task_id):
    uid  = session["user_id"]
    data = request.get_json(silent=True) or {}
    name     = (data.get("name") or "").strip()
    xp       = data.get("xp")
    due_date = (data.get("dueDate") or "").strip() if "dueDate" in data else None

    if not name:
        return jsonify({"error": "Task name is required"}), 400
    if len(name) > 255:
        return jsonify({"error": "Task name is too long (max 255 chars)"}), 400
    if xp is not None and not valid_xp(xp):
        return jsonify({"error": "Invalid XP value"}), 400
    if due_date is not None and not valid_date(due_date):
        return jsonify({"error": "Invalid due date format"}), 400

    try:
        db  = get_db()
        cur = db.cursor()

        # Verify ownership and not completed
        cur.execute(
            "SELECT completed FROM tasks WHERE id = %s AND user_id = %s",
            (task_id, uid),
        )
        row = cur.fetchone()
        if not row:
            cur.close(); db.close()
            return jsonify({"error": "Task not found"}), 404
        if row[0]:
            cur.close(); db.close()
            return jsonify({"error": "Completed tasks cannot be edited"}), 409

        # Build update
        updates = ["name = %s"]
        params  = [name]
        if xp is not None:
            updates.append("xp = %s"); params.append(xp)
        if due_date is not None:
            updates.append("due_date = %s"); params.append(due_date if due_date else None)
        params.append(task_id); params.append(uid)

        cur.execute(
            f"UPDATE tasks SET {', '.join(updates)} WHERE id = %s AND user_id = %s",
            params,
        )
        db.commit()

        cur.execute(
            """
            SELECT t.id, t.user_id, t.name, t.xp, t.completed, t.due_date, t.created_at,
                   CASE WHEN st.id IS NOT NULL THEN 1 ELSE 0 END AS is_scheduled
            FROM tasks t
            LEFT JOIN scheduled_tasks st ON st.task_id = t.id AND st.user_id = t.user_id
            WHERE t.id = %s
            """,
            (task_id,),
        )
        row = cur.fetchone()
        cur.close(); db.close()
        return jsonify(_task_row_to_dict(row))
    except MySQLError:
        return jsonify({"error": "Failed to update task"}), 500


@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
@login_required
def delete_task(task_id):
    uid = session["user_id"]
    try:
        db  = get_db()
        cur = db.cursor()
        cur.execute("SELECT id FROM tasks WHERE id = %s AND user_id = %s", (task_id, uid))
        if not cur.fetchone():
            cur.close(); db.close()
            return jsonify({"error": "Task not found"}), 404

        # Also remove from schedule (FK should cascade, but be explicit)
        cur.execute(
            "DELETE FROM scheduled_tasks WHERE task_id = %s AND user_id = %s",
            (task_id, uid),
        )
        _recompact_user_schedule(cur, uid)
        cur.execute("DELETE FROM tasks WHERE id = %s AND user_id = %s", (task_id, uid))
        db.commit()
        cur.close(); db.close()
        return jsonify({"message": "Task deleted"})
    except MySQLError:
        return jsonify({"error": "Failed to delete task"}), 500


@app.route("/api/tasks/<int:task_id>/complete", methods=["POST"])
@login_required
def complete_task(task_id):
    """Mark a task complete, award XP, return updated player state."""
    uid = session["user_id"]
    try:
        db  = get_db()
        cur = db.cursor()
        db.start_transaction()

        cur.execute(
            "SELECT xp, completed FROM tasks WHERE id = %s AND user_id = %s",
            (task_id, uid),
        )
        row = cur.fetchone()
        if not row:
            db.rollback(); cur.close(); db.close()
            return jsonify({"error": "Task not found"}), 404
        xp, completed = row
        if completed:
            db.rollback(); cur.close(); db.close()
            return jsonify({"error": "Task is already completed"}), 409

        # Mark complete
        cur.execute(
            "UPDATE tasks SET completed = 1 WHERE id = %s AND user_id = %s",
            (task_id, uid),
        )

        # Remove from schedule if present
        cur.execute(
            "DELETE FROM scheduled_tasks WHERE task_id = %s AND user_id = %s",
            (task_id, uid),
        )
        _recompact_user_schedule(cur, uid)

        # Award XP and return old/new level for level-up detection
        cur.execute(
            "SELECT total_xp FROM player_progress WHERE user_id = %s", (uid,)
        )
        xp_row = cur.fetchone()
        old_xp = xp_row[0] if xp_row else 0
        old_level = compute_level(old_xp)
        new_xp = old_xp + xp
        new_level = compute_level(new_xp)

        cur.execute(
            "UPDATE player_progress SET total_xp = %s WHERE user_id = %s",
            (new_xp, uid),
        )

        db.commit()

        # Fetch updated task
        cur.execute(
            "SELECT id, user_id, name, xp, completed, due_date, created_at FROM tasks WHERE id = %s",
            (task_id,),
        )
        task_row = cur.fetchone()
        cur.close(); db.close()

        return jsonify({
            "task":      _task_row_to_dict(task_row, is_scheduled=False),
            "player":    player_data(new_xp),
            "xpEarned":  xp,
            "leveledUp": new_level > old_level,
            "newLevel":  new_level if new_level > old_level else None,
        })
    except MySQLError:
        return jsonify({"error": "Failed to complete task"}), 500


@app.route("/api/tasks/<int:task_id>/uncomplete", methods=["POST"])
@login_required
def uncomplete_task(task_id):
    """Undo a task completion — deduct XP, restore pending state."""
    uid = session["user_id"]
    try:
        db  = get_db()
        cur = db.cursor()
        db.start_transaction()

        cur.execute(
            "SELECT xp, completed FROM tasks WHERE id = %s AND user_id = %s",
            (task_id, uid),
        )
        row = cur.fetchone()
        if not row:
            db.rollback(); cur.close(); db.close()
            return jsonify({"error": "Task not found"}), 404
        xp, completed = row
        if not completed:
            db.rollback(); cur.close(); db.close()
            return jsonify({"error": "Task is not completed"}), 409

        cur.execute(
            "UPDATE tasks SET completed = 0 WHERE id = %s AND user_id = %s",
            (task_id, uid),
        )

        cur.execute(
            "SELECT total_xp FROM player_progress WHERE user_id = %s", (uid,)
        )
        xp_row = cur.fetchone()
        old_xp = xp_row[0] if xp_row else 0
        new_xp = max(0, old_xp - xp)

        cur.execute(
            "UPDATE player_progress SET total_xp = %s WHERE user_id = %s",
            (new_xp, uid),
        )
        db.commit()

        cur.execute(
            "SELECT id, user_id, name, xp, completed, due_date, created_at FROM tasks WHERE id = %s",
            (task_id,),
        )
        task_row = cur.fetchone()
        cur.close(); db.close()

        return jsonify({
            "task":     _task_row_to_dict(task_row, is_scheduled=False),
            "player":   player_data(new_xp),
            "xpDeducted": xp,
        })
    except MySQLError:
        return jsonify({"error": "Failed to undo completion"}), 500


# ---------------------------------------------------------------------------
# Schedule routes  (mirrors DatabaseManager queue methods)
# ---------------------------------------------------------------------------

@app.route("/api/schedule", methods=["GET"])
@login_required
def get_schedule():
    """Return tasks in FIFO queue order."""
    uid = session["user_id"]
    try:
        db  = get_db()
        cur = db.cursor()
        cur.execute(
            """
            SELECT t.id, t.user_id, t.name, t.xp, t.completed, t.due_date, t.created_at,
                   st.queue_order
            FROM scheduled_tasks st
            JOIN tasks t ON t.id = st.task_id
            WHERE st.user_id = %s
            ORDER BY st.queue_order ASC
            """,
            (uid,),
        )
        rows = cur.fetchall()
        cur.close(); db.close()

        result = []
        for r in rows:
            d = _task_row_to_dict(r[:7], is_scheduled=True)
            d["taskId"] = r[0]
            d["queuePosition"] = r[7]
            result.append(d)
        return jsonify(result)
    except MySQLError:
        return jsonify({"error": "Failed to load schedule"}), 500


@app.route("/api/schedule", methods=["POST"])
@login_required
def add_to_schedule():
    """Add a task to the end of the schedule (enqueue)."""
    uid  = session["user_id"]
    data = request.get_json(silent=True) or {}
    task_id = data.get("taskId")
    if not isinstance(task_id, int):
        return jsonify({"error": "taskId (integer) is required"}), 400

    try:
        db  = get_db()
        cur = db.cursor()

        # Verify ownership and not completed
        cur.execute(
            "SELECT id, completed FROM tasks WHERE id = %s AND user_id = %s",
            (task_id, uid),
        )
        row = cur.fetchone()
        if not row:
            cur.close(); db.close()
            return jsonify({"error": "Task not found"}), 404
        if row[1]:
            cur.close(); db.close()
            return jsonify({"error": "Completed tasks cannot be scheduled"}), 409

        # Duplicate check
        cur.execute(
            "SELECT id FROM scheduled_tasks WHERE user_id = %s AND task_id = %s",
            (uid, task_id),
        )
        if cur.fetchone():
            cur.close(); db.close()
            return jsonify({"error": "Task is already in the schedule"}), 409

        # Ensure existing schedule is compact before appending
        _recompact_user_schedule(cur, uid)

        # Next queue order
        cur.execute(
            "SELECT COALESCE(MAX(queue_order), 0) + 1 FROM scheduled_tasks WHERE user_id = %s",
            (uid,),
        )
        next_order = cur.fetchone()[0]

        cur.execute(
            "INSERT INTO scheduled_tasks (user_id, task_id, queue_order) VALUES (%s, %s, %s)",
            (uid, task_id, next_order),
        )
        db.commit()
        cur.close(); db.close()
        return jsonify({
            "message": "Task added to schedule",
            "taskId": task_id,
            "isScheduled": True,
        }), 201
    except MySQLError:
        return jsonify({"error": "Failed to add to schedule"}), 500


@app.route("/api/schedule/<int:task_id>", methods=["DELETE"])
@login_required
def remove_from_schedule(task_id):
    """Remove a specific task from the schedule and re-compact queue_order."""
    uid = session["user_id"]
    try:
        db  = get_db()
        cur = db.cursor()
        db.start_transaction()

        cur.execute(
            "SELECT id, queue_order FROM scheduled_tasks WHERE user_id = %s AND task_id = %s",
            (uid, task_id),
        )
        row = cur.fetchone()
        if not row:
            db.rollback(); cur.close(); db.close()
            return jsonify({"error": "Task is not in the schedule"}), 404

        schedule_id, removed_order = row
        cur.execute(
            "DELETE FROM scheduled_tasks WHERE id = %s AND user_id = %s",
            (schedule_id, uid),
        )
        _recompact_user_schedule(cur, uid)
        db.commit()
        cur.close(); db.close()
        return jsonify({
            "message": "Removed from schedule",
            "taskId": task_id,
            "isScheduled": False,
        })
    except MySQLError:
        return jsonify({"error": "Failed to remove from schedule"}), 500


@app.route("/api/schedule/next/process", methods=["POST"])
@login_required
def process_next():
    """Complete the front task in the queue — dequeue + mark complete + award XP."""
    uid = session["user_id"]
    try:
        db  = get_db()
        cur = db.cursor()
        db.start_transaction()

        # Get front of queue
        cur.execute(
            "SELECT st.id, st.task_id FROM scheduled_tasks st "
            "WHERE st.user_id = %s ORDER BY st.queue_order ASC LIMIT 1",
            (uid,),
        )
        row = cur.fetchone()
        if not row:
            db.rollback(); cur.close(); db.close()
            return jsonify({"error": "Schedule is empty"}), 404

        sched_id, task_id = row

        cur.execute("SELECT xp, completed FROM tasks WHERE id = %s AND user_id = %s", (task_id, uid))
        t = cur.fetchone()
        if not t or t[1]:
            # Already completed — just remove from schedule
            cur.execute("DELETE FROM scheduled_tasks WHERE id = %s", (sched_id,))
            _recompact_user_schedule(cur, uid)
            db.commit(); cur.close(); db.close()
            return jsonify({"error": "Task is already completed"}), 409

        xp = t[0]

        # Mark complete
        cur.execute("UPDATE tasks SET completed = 1 WHERE id = %s AND user_id = %s", (task_id, uid))

        # Remove from schedule
        cur.execute("DELETE FROM scheduled_tasks WHERE id = %s AND user_id = %s", (sched_id, uid))

        # Re-compact remaining schedule to 1..N
        _recompact_user_schedule(cur, uid)

        # Award XP
        cur.execute("SELECT total_xp FROM player_progress WHERE user_id = %s", (uid,))
        xp_row = cur.fetchone()
        old_xp = xp_row[0] if xp_row else 0
        old_level = compute_level(old_xp)
        new_xp = old_xp + xp
        new_level = compute_level(new_xp)
        cur.execute("UPDATE player_progress SET total_xp = %s WHERE user_id = %s", (new_xp, uid))

        db.commit()

        cur.execute(
            "SELECT id, user_id, name, xp, completed, due_date, created_at FROM tasks WHERE id = %s",
            (task_id,),
        )
        task_row = cur.fetchone()
        cur.close(); db.close()

        return jsonify({
            "task":      _task_row_to_dict(task_row, is_scheduled=False),
            "player":    player_data(new_xp),
            "xpEarned":  xp,
            "leveledUp": new_level > old_level,
            "newLevel":  new_level if new_level > old_level else None,
        })
    except MySQLError:
        return jsonify({"error": "Failed to process next task"}), 500


@app.route("/api/schedule/next/skip", methods=["POST"])
@login_required
def skip_next():
    """Move the front task to the rear of the schedule (skip)."""
    uid = session["user_id"]
    try:
        db  = get_db()
        cur = db.cursor()
        db.start_transaction()

        _recompact_user_schedule(cur, uid)

        # Fetch all scheduled tasks ordered by queue_order ASC
        cur.execute(
            "SELECT st.id, st.task_id FROM scheduled_tasks st "
            "WHERE st.user_id = %s ORDER BY st.queue_order ASC",
            (uid,),
        )
        rows = cur.fetchall()
        if not rows:
            db.rollback(); cur.close(); db.close()
            return jsonify({"error": "Schedule is empty"}), 404

        front_id, task_id = rows[0]

        if len(rows) > 1:
            cur.execute(
                "UPDATE scheduled_tasks SET queue_order = 0 WHERE id = %s AND user_id = %s",
                (front_id, uid),
            )
            for new_order, (sid, _) in enumerate(rows[1:], 1):
                cur.execute(
                    "UPDATE scheduled_tasks SET queue_order = %s WHERE id = %s AND user_id = %s",
                    (new_order, sid, uid),
                )
            cur.execute(
                "UPDATE scheduled_tasks SET queue_order = %s WHERE id = %s AND user_id = %s",
                (len(rows), front_id, uid),
            )
        else:
            cur.execute(
                "UPDATE scheduled_tasks SET queue_order = 1 WHERE id = %s AND user_id = %s",
                (front_id, uid),
            )

        db.commit()
        cur.close(); db.close()
        return jsonify({"message": "Task moved to end of schedule", "taskId": task_id})
    except MySQLError:
        return jsonify({"error": "Failed to skip task"}), 500


# ---------------------------------------------------------------------------
# Dashboard data (single call for the dashboard page)
# ---------------------------------------------------------------------------

@app.route("/api/dashboard", methods=["GET"])
@login_required
def dashboard():
    uid = session["user_id"]
    try:
        db  = get_db()
        cur = db.cursor()

        # Player
        cur.execute("SELECT total_xp FROM player_progress WHERE user_id = %s", (uid,))
        xp_row = cur.fetchone()
        total_xp = xp_row[0] if xp_row else 0

        # Tasks summary
        cur.execute(
            "SELECT COUNT(*), SUM(completed) FROM tasks WHERE user_id = %s", (uid,)
        )
        summary = cur.fetchone()
        total_tasks     = summary[0] or 0
        completed_tasks = int(summary[1] or 0)
        pending_tasks   = total_tasks - completed_tasks

        # Today + upcoming pending tasks
        cur.execute(
            """
            SELECT t.id, t.user_id, t.name, t.xp, t.completed, t.due_date, t.created_at,
                   CASE WHEN st.id IS NOT NULL THEN 1 ELSE 0 END AS is_scheduled
            FROM tasks t
            LEFT JOIN scheduled_tasks st ON st.task_id = t.id AND st.user_id = t.user_id
            WHERE t.user_id = %s AND t.completed = 0 AND t.due_date IS NOT NULL
            ORDER BY t.due_date ASC
            LIMIT 5
            """,
            (uid,),
        )
        upcoming = [_task_row_to_dict(r) for r in cur.fetchall()]

        # All scheduled task IDs for fast synchronization
        cur.execute(
            "SELECT task_id FROM scheduled_tasks WHERE user_id = %s ORDER BY queue_order ASC",
            (uid,),
        )
        scheduled_task_ids = [r[0] for r in cur.fetchall()]

        # Schedule preview (first 3)
        cur.execute(
            """
            SELECT t.id, t.user_id, t.name, t.xp, t.completed, t.due_date, t.created_at
            FROM scheduled_tasks st
            JOIN tasks t ON t.id = st.task_id
            WHERE st.user_id = %s
            ORDER BY st.queue_order ASC
            LIMIT 3
            """,
            (uid,),
        )
        schedule_preview = [_task_row_to_dict(r, is_scheduled=True) for r in cur.fetchall()]

        cur.close(); db.close()

        return jsonify({
            "player":           player_data(total_xp),
            "stats":            {"total": total_tasks, "completed": completed_tasks, "pending": pending_tasks},
            "upcoming":         upcoming,
            "schedulePreview":  schedule_preview,
            "scheduledTaskIds": scheduled_task_ids,
        })
    except MySQLError:
        return jsonify({"error": "Failed to load dashboard"}), 500


# ---------------------------------------------------------------------------
# Frontend page routes — serve the single HTML shell
# ---------------------------------------------------------------------------

@app.route("/")
@app.route("/dashboard")
@app.route("/tasks")
@app.route("/schedule")
def index():
    return render_template("index.html")


# ---------------------------------------------------------------------------
# CORS headers (allow front/back on same origin in dev; restrict in prod)
# ---------------------------------------------------------------------------

@app.after_request
def add_cors(response):
    origin = request.headers.get("Origin", "")
    if origin in ALLOWED_ORIGINS.split(","):
        response.headers["Access-Control-Allow-Origin"]      = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"]     = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"]     = "Content-Type"
    return response


@app.route("/api/<path:path>", methods=["OPTIONS"])
def options(path):
    return "", 204


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
