# Life Upgrade System

A gamified task management and habit productivity platform developed as a Semester 3 B.Tech Computer Science and Engineering (CSE) Project-Based Learning (PBL) project.

The system transforms routine daily tasks into an engaging progression system. Users earn Experience Points (XP) upon completing tasks, level up across 20 distinct rank tiers, schedule daily workloads via a First-In-First-Out (FIFO) queue, revert operations using a Last-In-First-Out (LIFO) undo stack, securely persist multi-user data in a MySQL relational database, and interact with a modern, responsive web dashboard.

---

## Team & Academic Information

| Name | Enrollment No. | Section |
| :--- | :--- | :--- |
| **Bilawal Ansari** | 2027723 | J |
| **Kartikey Vashisht** | 2028739 | ML3 |
| **Tanuj Sharma** | 2028217 | B |

- **Academic Context:** Semester 3 B.Tech CSE — Project-Based Learning (PBL)
- **Course Focus:** Data Structures and Algorithms & Full-Stack Application Design
- **Mentor:** Ms. Nishtha Bhatt

---

## Project Status & Evolution (Phase 3 Complete)

The project has achieved all milestones through **Phase 3**:

- **Phase 1 & 2 (Core C++ Engine):** Implemented custom, heap-allocated pointer-based data structures (Singly Linked List, Queue, Stack) with direct memory management, an interactive terminal CLI menu, and flat text-file persistence (`tasks.txt`, `schedule.txt`, `player.txt`).
- **Phase 3 (Full-Stack Multi-User Web System):** Expanded the architecture into a multi-user web application:
  - Developed a Flask REST API backend integrated with a persistent MySQL relational database (`life_upgrade_db`).
  - Created a C++ database adapter (`DatabaseManager.h` / `DatabaseManager.cpp`) utilizing the MySQL C API, allowing both the C++ CLI and the web application to interface with the exact same database tables.
  - Implemented secure user authentication with salted SHA-256 password hashing and complete cross-user data isolation.
  - Delivered a Single-Page Application (SPA) frontend with real-time state synchronization, celebratory level-up animations, circular progress meters, task sorting, and queue scheduling.
  - Resolved sequential queue order compaction across task processing, skipping, deletion, and undo operations.

---

## Key Features

- **Multi-User Authentication & Isolation:** Secure registration, login, and session-based access. Every user's tasks, schedule queue, and player XP progress are strictly partitioned by `user_id`.
- **Task Management (CRUD):** Create, view, edit, and delete tasks with custom titles, optional due dates (`YYYY-MM-DD`), and predefined difficulty tiers:
  - **Easy:** +10 XP
  - **Medium:** +25 XP
  - **Hard:** +50 XP
- **Reversible Task Completion & Undo:** Completing a task awards XP and updates character level immediately. The instant "Undo" feature safely deducts the earned XP, restores pending status, and returns the task to active lists.
- **Sequential FIFO Task Scheduling:** Schedule tasks in chronological First-In-First-Out order. Process the next task to mark it complete and earn XP, skip tasks to the end of the queue, or remove tasks from the queue with automatic sequential recompacting (`1, 2, ..., N`).
- **Gamified Level Progression:** XP accumulation spans 20 rank titles from *Beginner* (Level 1) to *Life Upgrade Legend* (Level 20), featuring an animated level-up modal with particle effects.
- **Dynamic Web Dashboard:** Central command interface featuring an active rank overview card, live task counters (Total, Completed, Pending), a quick task creation trigger, upcoming deadline alerts, and a queue schedule preview.
- **Dedicated My Tasks Hub:** Comprehensive task catalog featuring a circular SVG progress meter, completion filter tabs (*All*, *Pending*, *Completed*), and client-side sorting (Default created order, Nearest deadline, Hardest first, Easiest first).
- **Achievements & Ranks Showcase:** Dedicated visual showcase displaying all 20 levels, required XP thresholds, unlocked/current badges, and progressive prestige styling for high-tier ranks.
- **Dual Persistence Architecture:**
  - **MySQL Database:** Centralized relational storage for multi-user web and database workflows.
  - **Flat Files:** Text-based storage ensuring the standalone C++ CLI remains fully functional offline without server dependencies.
- **Midnight Black + Lime Green Design Identity:** Clean dark theme (`#0a0a0c`) with luminous lime accents (`#a3e635`), purposeful cyan, purple, gold, and warm fire highlights, custom SVG vector icons, and full accessibility support for reduced motion.

---

## Technology Stack

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **C++ Core Engine** | C++ (C++17), GCC / MinGW-w64 | Custom pointer-based data structures, manual memory management, CLI menu, MySQL C API integration |
| **Web Backend & API** | Python 3.8+, Flask 3.x, `mysql-connector-python` | RESTful JSON API endpoints, session authentication, request validation, business logic enforcement |
| **Relational Database** | MySQL Server 8.x | Normalized relational multi-user data storage, foreign key constraints, cascading deletions |
| **Frontend UI / UX** | HTML5, CSS3, Vanilla JavaScript (ES6+ Fetch API) | Single-Page Application (SPA) shell, responsive layouts, SVG vector graphics, real-time client state sync |
| **Build & Tooling** | Git, GitHub, PowerShell, Windows Batch Scripts | Version control, automated startup scripts, test suites |

---

## System Architecture

```
                      ┌────────────────────────────────────────┐
                      │              User Clients              │
                      └──────────────────┬─────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
                 ▼                                               ▼
     ┌───────────────────────┐                       ┌───────────────────────┐
     │      Web Browser      │                       │     Terminal / CLI    │
     │   (HTML / CSS / JS)   │                       │  (Interactive Menu)   │
     └───────────┬───────────┘                       └───────────┬───────────┘
                 │ HTTP / JSON                                   │ Direct C++
                 ▼                                               ▼
     ┌───────────────────────┐                       ┌───────────────────────┐
     │    Flask Web API      │                       │   C++ Data Structures │
     │     (web/app.py)      │                       │ (List, Queue, Stack)  │
     └───────────┬───────────┘                       └───────────┬───────────┘
                 │                                               │
                 │ mysql-connector-python        DatabaseManager │ MySQL C API /
                 │                               (C++ Database)  │ File Streams
                 ▼                                               ▼
     ┌───────────────────────────────────────────────────────────────────────┐
     │                         Shared Storage Layer                          │
     │                                                                       │
     │   MySQL Database (life_upgrade_db)         Text Files (CLI Fallback)  │
     │   ├── users                                ├── tasks.txt              │
     │   ├── tasks                                ├── schedule.txt           │
     │   ├── scheduled_tasks                      └── player.txt             │
     │   └── player_progress                                                 │
     └───────────────────────────────────────────────────────────────────────┘
```

Both the C++ application (via `DatabaseManager`) and the Flask web service interface with the **same** MySQL database schema:
- Both apply identical salted SHA-256 password hashing (`salt:sha256(salt + password)`).
- Both enforce the same difficulty XP tiers (Easy = 10, Medium = 25, Hard = 50) and 20-level hierarchy.
- Foreign key constraints ensure tasks, player progress, and queue entries automatically cascade upon user deletion.

---

## Data Structures in the C++ Application

The C++ core implements custom, pointer-based data structures without relying on third-party containers, illustrating direct memory management, pointer manipulation, and object-oriented principles:

### 1. Singly Linked List (`TaskList`)
- **Internal Representation:** Dynamic chain of heap-allocated `Node` structures (`Node* head`), where each node contains a `Task` object and a `next` pointer.
- **Usage:** Manages the active task catalog in memory.
- **Operations:**
  - Insertion at tail: $\mathcal{O}(n)$
  - Search by ID: $\mathcal{O}(n)$
  - Deletion by ID: $\mathcal{O}(n)$
  - In-Place Selection Sort (`TaskList::displayTasks`): Sorts tasks by ID in ascending order directly across the linked chain without allocating secondary arrays.
- **Memory Safety:** Custom destructor traverses and deallocates every node to prevent memory leaks. The copy constructor and assignment operator are explicitly deleted (`= delete`) to prevent shallow copy and double-free vulnerabilities.

### 2. FIFO Queue (`TaskQueue`)
- **Internal Representation:** Singly linked chain bounded by two pointers: `Node* front` and `Node* rear`.
- **Usage:** Drives the sequential task scheduling pipeline.
- **Operations:**
  - `enqueue`: $\mathcal{O}(1)$ push to the rear.
  - `dequeue`: $\mathcal{O}(1)$ pop from the front.
  - `peek`: $\mathcal{O}(1)$ inspection of the next task.
  - Arbitrary Removal: $\mathcal{O}(n)$ traversal to remove an entry if a scheduled task is deleted or completed ahead of queue processing.

### 3. LIFO Stack (`Stack` in `TaskStack.h`)
- **Internal Representation:** Dynamic linked chain with a top pointer (`Node* top`).
- **Usage:** Records historical user operations to enable single-level and multi-level undo.
- **Operations:**
  - $\mathcal{O}(1)$ `push` and `pop` of an `Action` struct containing:
    - `ActionType` (`ADD_TASK`, `DELETE_TASK`, `EDIT_TASK`, `COMPLETE_TASK`)
    - `Task` snapshot
    - `wasScheduled` boolean flag
- **Reversibility:** Undoing a completed task restores its pending status, deducts the awarded XP from the player, and re-enqueues the task ID if it was originally scheduled.

### 4. Player Progression Model (`Player`)
- Encapsulates player level, total XP, and rank progression.
- Operates via a pre-calculated 20-tier lookup table (`LEVEL_XP` and `LEVEL_TITLES`), calculating progress percentages toward the next rank without risking integer overflow.

---

## Gamification & Level Hierarchy

The progression system rewards consistent daily execution. Tasks award XP based on difficulty:

| Difficulty Tier | XP Awarded | Intended Scope |
| :--- | :--- | :--- |
| **Easy** | **10 XP** | Quick, low-friction habits (e.g., drink water, read 5 pages, organize desk) |
| **Medium** | **25 XP** | Focused core tasks (e.g., complete lecture notes, 30-min workout, code debugging) |
| **Hard** | **50 XP** | High-effort milestones (e.g., write assignment report, build project module, exam prep) |

### Complete 20-Rank Progression Table

| Level | Rank Title | Required XP | Primary Icon | Prestige Accent Tier |
| :---: | :--- | :---: | :---: | :--- |
| **1** | Beginner | 0 XP | 🌱 | Standard |
| **2** | Starter | 100 XP | ⚡ | Standard |
| **3** | Learner | 225 XP | 📖 | Standard |
| **4** | Builder | 375 XP | 🔨 | Standard |
| **5** | Achiever | 550 XP | 🎯 | Standard |
| **6** | Focused | 750 XP | 🔍 | Standard |
| **7** | Consistent | 975 XP | 🔄 | Standard |
| **8** | Dedicated | 1,225 XP | 🛡️ | Standard |
| **9** | Skilled | 1,500 XP | ⚔️ | Standard |
| **10** | Pro | 1,800 XP | ⭐ | Standard |
| **11** | Advanced | 2,125 XP | 💫 | Standard |
| **12** | Expert | 2,475 XP | 🔮 | Standard |
| **13** | Specialist | 2,850 XP | 🎖️ | Standard |
| **14** | Champion | 3,250 XP | 🏆 | Standard |
| **15** | Elite | 3,675 XP | 💎 | Standard |
| **16** | Master | 4,125 XP | ⚜️ | Standard |
| **17** | **Grandmaster** | **4,600 XP** | 🔱 | **Royal Purple Prestige** |
| **18** | **Legend** | **5,100 XP** | 🔥 | **Warm Fire / Orange Prestige** |
| **19** | **Icon** | **5,625 XP** | 💠 | **Electric Cyan Prestige** |
| **20** | **Life Upgrade Legend** | **6,175 XP** | 👑 | **Supreme Gold Prestige** |

*Note: In accordance with the UI specifications, every rank card displays strictly one unique primary icon with no stacked duplicate symbols.*

---

## Task Scheduling & Queue Sequencing Fix

The task scheduling pipeline enables users to plan a structured daily execution sequence.

### Scheduling Workflow
1. **Add to Schedule:** Any pending task can be added to the user's queue. The task is assigned the next available sequential position (`queue_order = max_order + 1`).
2. **Process Next Task:** Processes the task currently at the front (`queue_order = 1`). This marks the task completed in the database, awards its XP to the player, removes it from `scheduled_tasks`, and shifts all remaining queued tasks forward.
3. **Skip Next Task:** Moves the front task to the very end of the queue, rotating subsequent items forward while preserving strict contiguous sequencing (`1, 2, ..., N`).
4. **Remove from Schedule:** Removes a specific task from the queue at any position and immediately renumbers the remaining tasks to eliminate gaps.

### Queue Sequencing Fix (Phase 3 Resolution)
- **Problem Identified:** Previously, skipping the front task placed it at `max_order + 1`, which could create sequence gaps when intermediate items were deleted or completed out of order. Subsequent attempts to process the next item could fail with server errors due to unexpected order offsets.
- **Solution Implemented:**
  - Added an atomic sequential compaction algorithm: whenever a task is processed, skipped, removed from the schedule, completed directly, or deleted from the task catalog, all remaining scheduled tasks for that user are sequentially renumbered to `1, 2, 3, ...`.
  - Empty queue queries now gracefully return a `404 Not Found` response with descriptive feedback instead of throwing unhandled exceptions.
  - Verified through automated integration test suites (`scratch/test_queue_fix.py`).

---

## Web Interface & UI/UX Design

The web interface is designed with a modern neon-accented gamification aesthetic:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚡ LIFE UPGRADE SYSTEM                                   [Lv.3 · 285 XP]   │
├──────────────┬──────────────────────────────────────────────────────────────┤
│  🧭 Dashboard│  ⚡ Level 3 • Learner                      285 XP            │
│  ✅ My Tasks │  ┌────────────────────────────────────────────────────────┐  │
│  📋 Schedule │  │ [██████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░] 48%      │  │
│  🏆 Achieve- │  │ 48% progress · 90 XP to Level 4 (Builder)              │  │
│     ments    │  └────────────────────────────────────────────────────────┘  │
│              │                                                              │
│              │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│              │  │ TOTAL TASKS  │  │  COMPLETED   │  │   PENDING    │        │
│              │  │      12      │  │      7       │  │      5       │        │
│              │  └──────────────┘  └──────────────┘  └──────────────┘        │
│              │                                                              │
│              │  ⏰ Upcoming Deadlines              📋 Schedule Preview      │
│  ─────────── │  • Complete Report (Hard)           1. Math Assignment       │
│  👤 player   │  • Exercise Session (Easy)          2. Read Book             │
│  🚪 Sign Out │                                                              │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

### Highlights of the Phase 3 Visual Overhaul
- **Futuristic Login Screen:** Features soft floating neon orbs with gentle easing animations, twinkling background stars, the custom SVG brand logo, and the official platform tagline:
  > **"Upgrade your habits. Level up your life."**
- **Dashboard Progress Card:** Modeled after the prestigious Achievements hero banner, featuring a thin lime-green border (`rgba(163, 230, 53, 0.35)`), a uniform subtle dark-green background tint, a soft ambient green glow, and a smooth, unclipped lime progress bar with no bright end blobs.
- **Three Side-by-Side Statistics Cards:** Three equal-width cards displaying **Total Tasks**, **Completed** (with live completion percentage), and **Pending** metrics side-by-side on desktop, adapting into a clean column on mobile screens.
- **Quick-Add Task Trigger:** A prominent "Add New Task" action button on the dashboard header allows rapid task creation without navigating away.
- **Motivational Productivity Quotes:** A curated collection of 16 famous quotes (Marcus Aurelius, James Clear, Aristotle, Seneca, Steve Jobs, etc.) dynamically rotates a fresh quote on every page reload.
- **My Tasks Circular Meter & Sorting:**
  - An SVG circular progress meter displaying completion percentage, current level, total earned XP, and the exact XP remaining toward the next title.
  - A client-side sort dropdown: *Default (Creation Order)*, *Nearest Deadline*, *Hardest First (50 XP → 10 XP)*, and *Easiest First (10 XP → 50 XP)*. Tasks with deadlines are prioritized chronologically, while tasks without deadlines follow gracefully.
- **Achievements Prestige Cards:** Higher tiers (Levels 17–20) feature custom prestige borders, soft ambient glowing auras, and individual accent colors:
  - **Level 17 (Grandmaster):** Royal Purple (`🔱` Trident)
  - **Level 18 (Legend):** Warm Fire Orange (`🔥` Flame)
  - **Level 19 (Icon):** Electric Cyan (`💠` Beacon)
  - **Level 20 (Life Upgrade Legend):** Majestic Gold (`👑` Crown)
- **Sidebar & Responsive Navigation:** Clean vector SVG icons for all navigation tabs, live user profile avatar with rank details, and a responsive mobile drawer menu.
- **Motion Accessibility:** Automatically respects `prefers-reduced-motion: reduce` settings, disabling ambient oscillations for sensitive users.

---

## Directory Structure

```text
Life-Upgrade-System/
├── DatabaseManager.h      # C++ MySQL database manager header
├── DatabaseManager.cpp    # C++ MySQL database manager implementation
├── Task.h                 # Task entity header (with optional due date)
├── Task.cpp               # Task entity implementation
├── TaskList.h             # Singly linked list header for task catalog
├── TaskList.cpp           # Singly linked list implementation & selection sort
├── TaskQueue.h            # FIFO queue header for task scheduling
├── TaskQueue.cpp          # FIFO queue implementation
├── TaskStack.h            # LIFO stack header for undo history
├── TaskStack.cpp          # LIFO stack implementation
├── Player.h               # Player progression & level system header
├── Player.cpp             # Player XP logic & 20-tier level hierarchy
├── main.cpp               # C++ CLI interactive menu entry point
├── README.md              # Project documentation
├── .gitignore             # Git exclusion rules (build files, credentials)
└── web/                   # Phase 3 Web Application
    ├── app.py             # Flask API server & route controllers
    ├── start_server.bat   # Windows one-click web server startup script
    ├── static/            # Frontend assets
    │   ├── app.js         # Single-page application logic & state sync
    │   └── style.css      # Midnight Black + Lime Green design system
    └── templates/         # HTML templates
        └── index.html     # Single-page application HTML shell
```

---

## Installation & Setup Instructions

### 1. Prerequisites

- **C++ Compiler:** GCC / G++ with C++17 support (MinGW-w64 on Windows, `build-essential` on Linux)
- **Python:** Python 3.8 or higher
- **MySQL Server:** MySQL Server 8.x running locally on default port 3306
- **Git:** For repository cloning and version control

---

### 2. MySQL Database Setup

1. Open your terminal or MySQL command-line client and log in:
   ```bash
   mysql -u root -p
   ```

2. Create the database:
   ```sql
   CREATE DATABASE IF NOT EXISTS life_upgrade_db;
   USE life_upgrade_db;
   ```

3. Execute the schema definition:
   ```sql
   CREATE TABLE IF NOT EXISTS users (
       id INT AUTO_INCREMENT PRIMARY KEY,
       username VARCHAR(50) NOT NULL UNIQUE,
       password_hash VARCHAR(255) NOT NULL,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   CREATE TABLE IF NOT EXISTS player_progress (
       user_id INT PRIMARY KEY,
       total_xp INT NOT NULL DEFAULT 0,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
   );

   CREATE TABLE IF NOT EXISTS tasks (
       id INT AUTO_INCREMENT PRIMARY KEY,
       user_id INT NOT NULL,
       name VARCHAR(255) NOT NULL,
       xp INT NOT NULL DEFAULT 10,
       completed TINYINT(1) NOT NULL DEFAULT 0,
       due_date DATE NULL,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
       CONSTRAINT chk_task_xp CHECK (xp IN (10, 25, 50))
   );

   CREATE TABLE IF NOT EXISTS scheduled_tasks (
       id INT AUTO_INCREMENT PRIMARY KEY,
       user_id INT NOT NULL,
       task_id INT NOT NULL,
       queue_order INT NOT NULL,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
       FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
       UNIQUE KEY uq_user_task (user_id, task_id)
   );
   ```

---

### 3. Database Credentials Configuration

To protect secrets from accidental Git commits, credentials are kept in a local configuration header:

1. Create a `db_config.h` file in the root project folder (automatically ignored by `.gitignore`):
   ```c
   #ifndef DB_CONFIG_H
   #define DB_CONFIG_H

   #define DB_HOST "localhost"
   #define DB_USER "root"
   #define DB_PASS "YourMySQLPassword"
   #define DB_NAME "life_upgrade_db"
   #define DB_PORT 3306

   #endif
   ```

2. **Automatic Server Detection:** The Python web server (`web/app.py`) automatically parses `db_config.h` if present, ensuring both the C++ and Python services share identical credentials without duplicating secrets in source code.

3. **Optional Environment Variables:** Credentials can also be supplied or overridden via environment variables:
   - `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`, `DB_PORT`

---

### 4. Install Python Dependencies

Install the required packages using `pip`:

```bash
pip install flask mysql-connector-python
```

---

## How to Run the Applications

### Running the Phase 3 Web Application

#### Option A: Windows One-Click Batch Script (Recommended)
Double-click `web\start_server.bat` or run it from Command Prompt / PowerShell:
```cmd
web\start_server.bat
```

#### Option B: Manual Terminal Execution
```bash
cd web
python app.py
```

Once started, open any modern web browser and navigate to:
```
http://127.0.0.1:5000
```

---

### Running the Standalone C++ CLI Application

Compile the C++ CLI using G++ with C++17:

```bash
# From the project root
g++ -std=c++17 -Wall -Wextra main.cpp Task.cpp TaskList.cpp TaskQueue.cpp TaskStack.cpp Player.cpp -o LifeUpgradeSystem
```

Execute the binary:

- **Windows (PowerShell / Command Prompt):**
  ```powershell
  .\LifeUpgradeSystem.exe
  ```
- **Linux / macOS:**
  ```bash
  ./LifeUpgradeSystem
  ```

---

## Planned Future Enhancements

The following roadmap items are proposed for subsequent academic development:
- **Priority Queue Scheduling:** Automatically reorder scheduled tasks using min-heaps based on impending deadline urgency alongside insertion time.
- **Productivity Streaks & XP Multipliers:** Daily login and task completion streaks that award bonus XP multipliers for sustained consistency.
- **Productivity Reports & Analytics:** Generate weekly completion graphs and export historical productivity records to PDF or CSV.
- **Calendar Visualization:** Month and week grid views displaying scheduled tasks and upcoming deadlines.

---

## License & Academic Disclaimer

This project was developed for educational and academic assessment purposes as part of the **Semester 3 B.Tech Computer Science and Engineering (CSE)** curriculum for **Project-Based Learning (PBL)**.
