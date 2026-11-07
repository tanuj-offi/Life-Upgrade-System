# Life Upgrade System

## 1. Project Title and Brief Description

**Life Upgrade System** is a C++ console-based task management and gamified productivity system developed as a Semester 3 BTech CSE Project-Based Learning (PBL) project.

The system gamifies daily task tracking by rewarding the user with Experience Points (XP) upon completing tasks, featuring real-time level progression, rank titles, undo capability via stack, task scheduling via queue, and persistent file storage.

## 2. Problem Statement / Objective

Managing daily tasks manually makes it challenging to maintain consistency and track productivity over time. The objective of this project is to provide an interactive, gamified task management system where completing tasks directly contributes to character growth through XP and levels.

The system demonstrates practical implementation of core Data Structures (Singly Linked List, FIFO Queue, LIFO Stack) combined with Object-Oriented Programming (OOP) principles, clean memory management, and file persistence.

## 3. Team Members

| Name | Enrollment No. | Section |
| :--- | :--- | :--- |
| Bilawal Ansari | 2027723 | J |
| Kartikey Vashisht | 2028739 | ML3 |
| Tanuj Sharma | 2028217 | B |

**Mentor:** Ms. Nishtha Bhatt

## 4. Technologies / Tools Used

- **Language:** C++ (C++17)
- **Data Structures & Concepts:**
  - Singly Linked List (Dynamic Task Management)
  - Queue (FIFO Task Scheduling)
  - Stack (LIFO Undo Management)
  - Object-Oriented Programming (OOP, Encapsulation, Const-correctness)
  - Safe Memory Management (Destructors, Rule of Three protection)
  - File Streams (Persistence across sessions)
- **IDE:** Visual Studio Code
- **Compiler:** GCC / G++
- **Version Control:** Git and GitHub

## 5. Project Setup / Installation

### Requirements

- C++ compiler with C++17 support (`g++`)
- Visual Studio Code or any terminal/IDE
- Git

### Build Instructions

1. Clone or download the repository.
2. Open terminal in the project directory:

```bash
cd Life-Upgrade-System
```

3. Compile all source files:

```bash
g++ -std=c++17 -Wall -Wextra main.cpp Task.cpp TaskList.cpp TaskQueue.cpp TaskStack.cpp Player.cpp -o LifeUpgradeSystem
```

4. Run the executable:

**Windows:**
```powershell
.\LifeUpgradeSystem.exe
```

**Linux / macOS:**
```bash
./LifeUpgradeSystem
```

## 6. Features & System Modules

### 1. Task Management (`Task` & `TaskList`)
- **Add Task:** Create tasks with unique IDs, names, and predefined difficulty levels:
  - Easy: +10 XP
  - Medium: +25 XP
  - Hard: +50 XP
- **Edit Task:** Update name and difficulty/XP of pending tasks.
- **Display Tasks:** View tasks sorted by ID with difficulty, XP, and completion status.
- **Delete Task:** Remove tasks while automatically cleaning up scheduled queues.
- **Mark Complete:** Mark tasks done and credit XP to the player.

### 2. Task Scheduling Queue (`TaskQueue`)
- **FIFO Queue:** Schedule pending tasks to execute in chronological order.
- **Interactive Processor (Menu Option 9):**
  - Complete the next scheduled task and receive XP.
  - Skip and move the task to the back of the queue.
  - Cancel/leave it in place.
- **Unschedule:** Remove scheduled tasks directly by ID.

### 3. Undo Stack (`TaskStack`)
- **LIFO Stack Action History:** Tracks operations including `ADD_TASK`, `DELETE_TASK`, `EDIT_TASK`, and `COMPLETE_TASK`.
- **Full State Reversion:** Undoing a completed task deducts rewarded XP, reverts task completion status, and restores queue scheduling status.

### 4. Player Gamification & Level Progression (`Player`)
- **XP Progression:** Dynamic XP accumulation up to 20 levels.
- **Rank Titles:** Unlocks titles from *Beginner* (Level 1) up to *Life Upgrade Legend* (Level 20).
- **Status Dashboard:** Visual ASCII progress bar, percentage to next level, and XP needed.
- **Safe Overflow Protection:** Guards against integer overflow on high XP values.

### 5. Persistent Storage
- Automatically saves and restores data across sessions:
  - `tasks.txt`: Task catalog, completion states, and XP values.
  - `schedule.txt`: Current order of scheduled task IDs.
  - `player.txt`: Current player total XP.

### 6. Robust Error & Input Handling
- Built-in stream sanitation preventing infinite loops or crashes from non-numeric input.
- Safeguards preventing duplicate IDs or editing already-completed tasks.

## 7. Project Structure

```text
Life-Upgrade-System/
+-- Task.h            # Task entity class header
+-- Task.cpp          # Task implementation
+-- TaskList.h        # Linked list header for task management
+-- TaskList.cpp      # Linked list implementation & selection sort display
+-- TaskQueue.h       # Queue header for task scheduling
+-- TaskQueue.cpp     # Linked list-based FIFO queue implementation
+-- TaskStack.h       # Stack header for undo operations
+-- TaskStack.cpp     # Linked list-based LIFO stack implementation
+-- Player.h          # Player progression and level system header
+-- Player.cpp        # Player XP calculation and level dashboard
+-- main.cpp          # CLI menu interface and controller loop
+-- tasks.txt         # Saved task database
+-- schedule.txt      # Saved task schedule queue
+-- player.txt        # Saved player XP file
+-- README.md         # Project documentation
+-- .gitignore        # Git ignore rules
```

## 8. Phase 3 — Web Application (Multi-User)

Phase 3 adds a fully functional web frontend and MySQL-backed multi-user system on top of the existing C++ CLI project. The original CLI remains unchanged.

### Architecture

```
Browser (HTML/CSS/JS)
        │  HTTP (JSON)
        ▼
 Flask (Python 3) — web/app.py
        │  mysql-connector-python
        ▼
  MySQL — life_upgrade_db
  (users, tasks, scheduled_tasks, player_progress)
```

The same data-structure logic (Linked List, Queue, Stack) now runs server-side in Python, mirroring the C++ classes. The existing C++ CLI and its file-based persistence remain fully independent.

### Database Schema

| Table | Key columns |
|---|---|
| `users` | `id`, `username`, `password_hash` |
| `tasks` | `id`, `user_id`, `name`, `xp`, `due_date`, `completed` |
| `scheduled_tasks` | `id`, `user_id`, `task_id`, `queue_order` |
| `player_progress` | `user_id`, `total_xp` |

### Web Setup Requirements

- Python 3.8+
- Flask 3.x: `pip install flask`
- MySQL connector: `pip install mysql-connector-python`
- MySQL Server 8.x with `life_upgrade_db` database created
- Database credentials in `web/app.py` or via environment variables:
  - `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`

### Running the Web Server

```powershell
cd web
python app.py
```

Then open **http://127.0.0.1:5000** in your browser.

Alternatively, double-click **`web\start_server.bat`** on Windows.

### Web Features

- **Register / Login / Logout** — session-based authentication with salted SHA-256 passwords
- **Dashboard** — player card (XP, level, title, progress bar), upcoming tasks, schedule preview
- **My Tasks** — create, edit, delete, complete, undo completion; filter by All / Pending / Completed
- **Schedule** — add tasks to a FIFO queue, process (complete + earn XP) or skip the next task, remove from queue
- **XP & Level System** — 20 levels from Beginner to Life Upgrade Legend; level-up overlay animation
- **Responsive** — desktop sidebar + mobile hamburger menu; Midnight Black + Lime Green theme

### DatabaseManager (C++)

`DatabaseManager.h` / `DatabaseManager.cpp` provide the C++ MySQL integration layer used for database-layer tests. These are not used by the web server (which uses Python directly) but are part of the codebase for reference and future C++ API work.

Credentials are stored in `db_config.h` (excluded from version control via `.gitignore`).

## 9. Planned Future Enhancements

- Priority queue scheduling based on task urgency/deadline.
- Daily streaks and bonus reward multipliers.
- Exporting task reports.

## 10. Contribution

All team members contribute through the GitHub repository with regular commits following modular development practices.
