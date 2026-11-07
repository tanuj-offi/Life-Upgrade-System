# Life Upgrade System

A gamified task management and habit productivity system developed as a Semester 3 B.Tech Computer Science and Engineering (CSE) Project-Based Learning (PBL) project.

The system gamifies productivity by rewarding users with Experience Points (XP) upon completing tasks, featuring level progression across 20 ranks, task scheduling via a FIFO queue, action undo history via a LIFO stack, persistent relational storage with MySQL, and an interactive, real-time synchronized web application.

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

## Current Project Status (Phase 3)

The project has successfully reached **Phase 3**:
- **Phase 1 & 2:** Delivered the complete C++ core engine featuring custom data structures (singly linked list, queue, stack), terminal menu interface, and file persistence.
- **Phase 3:** Introduced a modern, multi-user web application powered by Python (Flask), HTML5, CSS3, and JavaScript, backed by a persistent MySQL relational database. The C++ application has been extended with a dedicated C++ MySQL database manager (`DatabaseManager`), allowing both the CLI and web application to interface with the same underlying database schema while leaving the original CLI functionality fully operational and backwards compatible.

---

## Key Features

- **Multi-User Authentication & Isolation:** Secure user registration, login, and session-based logout using salted SHA-256 password hashing. Every user's tasks, schedule queue, and player progress are strictly isolated by `user_id`.
- **Task Management (CRUD):** Create, view, edit, and delete tasks with custom names, optional deadlines (`YYYY-MM-DD`), and predefined difficulty tiers:
  - **Easy:** +10 XP
  - **Medium:** +25 XP
  - **Hard:** +50 XP
- **Task Completion & Reversible Undo:** Marking a task complete awards XP and updates character rank. Undoing a completed task safely deducts the earned XP, restores pending status, and returns the task to active lists.
- **Gamified Level Progression:** Real-time XP tracking across 20 distinct level tiers, complete with rank titles ranging from *Beginner* (Level 1) to *Life Upgrade Legend* (Level 20), an animated progression bar, and a celebratory level-up modal.
- **Queue-Based Task Scheduling:** Schedule tasks to prioritize your daily workflow. Tasks enter a First-In-First-Out (FIFO) queue with options to complete and earn XP ("Process Next"), skip to the end of the queue, or remove from the schedule.
- **Interactive Web Dashboard:** Central hub featuring a player progress card, real-time statistics (total, completed, pending), upcoming deadline tracking, and a schedule preview.
- **Real-Time UI Synchronization:** Instant client-side state synchronization without requiring page refreshes when completing tasks, undoing actions, adding to schedule, or removing from schedule.
- **Dual Persistence Architecture:**
  - **Relational Database:** MySQL multi-user tables for web and database-backed workflows.
  - **Flat Files:** Text-based persistence (`tasks.txt`, `schedule.txt`, `player.txt`) ensuring the C++ CLI runs self-contained without mandatory server dependencies.
- **Responsive Theme:** Sleek, accessible user interface adhering to a high-contrast *Midnight Black* (`#0a0a0a`), *Pure White*, and *Lime Green* (`#a3e635`) design system, featuring a responsive sidebar for desktop and an adaptive mobile drawer.

---

## Technology Stack

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **C++ Core Engine** | C++ (C++17), GCC / G++ | Custom data structures, memory management, CLI menu, MySQL C API integration |
| **Backend & API** | Python 3.8+, Flask 3.x, `mysql-connector-python` | RESTful JSON API, session authentication, business logic validation |
| **Database** | MySQL Server 8.x | Relational multi-user data storage, foreign key constraints, cascading cleanup |
| **Frontend UI** | HTML5, CSS3, JavaScript (ES6+ Fetch API) | Single-Page Application (SPA) shell, responsive layouts, real-time state synchronization |
| **Tooling & Dev** | Git, GitHub, Visual Studio Code, Batch Scripts | Version control, cross-platform builds, automated server startup |

---

## Data Structures in the C++ Application

The C++ core implements custom, pointer-based data structures without relying on third-party containers, illustrating direct memory management and object-oriented principles:

1. **Singly Linked List (`TaskList`)**
   - **Internal Representation:** Dynamic chain of heap-allocated `Node` structures (`Node* head`), where each node encapsulates a `Task` object and a `next` pointer.
   - **Usage:** Stores and manages the active task catalog.
   - **Operations:** Insertion at the tail ($O(n)$), search by ID ($O(n)$), deletion by ID ($O(n)$), and state updates.
   - **In-Place Selection Sort:** When displaying tasks (`TaskList::displayTasks`), the linked list performs an in-place Selection Sort to display tasks in ascending ID order without allocating secondary arrays.
   - **Memory Safety:** Custom destructor traverses and deallocates every node. Copy constructor and assignment operator are explicitly deleted (`= delete`) to avoid shallow copies and double-free vulnerabilities.

2. **FIFO Queue (`TaskQueue`)**
   - **Internal Representation:** Linked list with two boundary pointers (`Node* front` and `Node* rear`).
   - **Usage:** Drives the task scheduling pipeline in chronological order.
   - **Operations:** $O(1)$ `enqueue` at the rear, $O(1)$ `dequeue` and `peek` from the front, alongside arbitrary removal ($O(n)$) when a scheduled task is deleted or completed early.

3. **LIFO Stack (`Stack` in `TaskStack.h`)**
   - **Internal Representation:** Linked list with a top-of-stack pointer (`Node* top`).
   - **Usage:** Tracks historical operations for undo capability.
   - **Operations:** $O(1)$ `push` and `pop` of an `Action` struct containing:
     - `ActionType` (`ADD_TASK`, `DELETE_TASK`, `EDIT_TASK`, `COMPLETE_TASK`)
     - `Task` snapshot
     - `wasScheduled` boolean flag
   - **Reversibility:** Reverting a completed task restores its pending status, deducts the awarded XP from the `Player`, and re-enqueues the task ID if it was previously scheduled.

4. **Player Gamification Model (`Player`)**
   - Manages player progression through a pre-calculated 20-tier lookup array (`LEVEL_XP` and `LEVEL_TITLES`).
   - Calculates progress percentage and remaining XP to next level, safeguarding against integer overflow.

---

## Project Architecture

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

Both the C++ application (via `DatabaseManager`) and the Flask web service connect to the **same** MySQL database (`life_upgrade_db`):
- Both use identical salted SHA-256 password hashes (`salt:sha256(salt + password)`).
- Both enforce the same XP rules (Easy = 10, Medium = 25, Hard = 50) and 20-level hierarchy.
- Foreign key constraints ensure tasks and player progress cascade cleanly upon user deletion.

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
├── .gitignore             # Version control exclusion rules
└── web/                   # Phase 3 Web Application
    ├── app.py             # Flask API server & route controllers
    ├── start_server.bat   # Windows one-click web server startup script
    ├── static/            # Static assets
    │   ├── app.js         # Frontend SPA controller & real-time sync
    │   └── style.css      # Custom Midnight Black + Lime styling
    └── templates/         # HTML templates
        └── index.html     # Single-page application HTML shell
```

---

## Installation & Setup Instructions

### 1. Prerequisites

- **C++ Compiler:** GCC / G++ with C++17 support (e.g. MinGW-w64 on Windows, `build-essential` on Linux)
- **Python:** Version 3.8 or higher
- **MySQL Server:** Version 8.x running locally on port 3306
- **Git:** For cloning and version control

---

### 2. MySQL Database Setup

1. Log into your local MySQL instance:
   ```bash
   mysql -u root -p
   ```

2. Create the project database:
   ```sql
   CREATE DATABASE IF NOT EXISTS life_upgrade_db;
   USE life_upgrade_db;
   ```

3. Initialize the database schema:
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

To keep sensitive credentials secure and out of version control, credentials are maintained locally:

1. Create a `db_config.h` file in the root repository directory (this file is excluded by `.gitignore`):
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

2. **Automatic Detection:** The Python web server (`web/app.py`) automatically parses `db_config.h` if present, ensuring both the C++ and Python layers share the exact same configuration without duplicating passwords in tracked source files.
3. **Environment Override (Optional):** You can also override credentials via environment variables:
   - `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`, `DB_PORT`

---

### 4. Build and Run the C++ CLI Application

To compile the standalone C++ CLI:

```bash
# From the project root
g++ -std=c++17 -Wall -Wextra main.cpp Task.cpp TaskList.cpp TaskQueue.cpp TaskStack.cpp Player.cpp -o LifeUpgradeSystem
```

Run the compiled executable:

**Windows (PowerShell / Command Prompt):**
```powershell
.\LifeUpgradeSystem.exe
```

**Linux / macOS:**
```bash
./LifeUpgradeSystem
```

---

### 5. Install Python Dependencies for the Web Application

Install the required Python packages:

```bash
pip install flask mysql-connector-python
```

---

## How to Run the Web Application

### Method 1: Windows One-Click Script (Recommended)
Double-click `web\start_server.bat` or execute it from the terminal:
```cmd
web\start_server.bat
```

### Method 2: Manual Terminal Execution
```bash
cd web
python app.py
```

Once running, open your web browser and navigate to:
```
http://127.0.0.1:5000
```

---

## Usage Overview & User Flow

```
   [Register / Login]
           │
           ▼
   [Create New Task] ──────► Select Difficulty: Easy (10 XP), Medium (25 XP), Hard (50 XP)
           │                 Optional Due Date (YYYY-MM-DD)
           ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                     Task Action Options                     │
   ├──────────────────────────────┬──────────────────────────────┤
   │                              │                              │
   ▼                              ▼                              ▼
[Add to Schedule]          [Mark Complete]                  [Edit / Delete]
Ordered into FIFO Queue    Awards XP to Character           Update metadata or
Process Next / Skip        Moves to Completed Section       permanently delete
           │                              │
           │                              ▼
           │                     [Undo Completion]
           │                     Reverts completion status
           │                     Deducts awarded XP
           ▼                              │
┌─────────────────────────────────────────┴──────────────────────┐
│                    Progression & Level Up                      │
│  Accumulate total XP to progress across 20 tiers from Beginner  │
│  to Life Upgrade Legend with animated rank celebrations.       │
└────────────────────────────────────────────────────────────────┘
```

1. **Sign In:** Create a new user account or log into an existing account.
2. **Dashboard Overview:** Review your current level, total XP, progress bar toward your next title, summary statistics, and urgent tasks.
3. **Manage Tasks:** Head to **My Tasks** to create tasks. Filter views by *All*, *Pending*, or *Completed*. In the *All* view, tasks are neatly partitioned into active and completed groupings.
4. **Complete & Undo:** Check off tasks to earn XP and celebrate level-ups. If completed by mistake, clicking **Undo** immediately deducts the XP and restores the task.
5. **Work with the Schedule:** Click **Add to Schedule** on any pending task to enqueue it. Visit the **Schedule** page to process the top task in work order or skip it for later.

---

## Planned Future Enhancements

The following ideas are proposed for subsequent academic project phases:
- **Priority Queue Scheduling:** Automatically reorder scheduled tasks based on deadline urgency rather than insertion order alone.
- **Productivity Streaks & Multipliers:** Streak multipliers rewarding consecutive days of completed tasks.
- **Report & Analytics Export:** Export weekly productivity metrics and task history to CSV or PDF summaries.
- **Interactive Calendar View:** Month and week calendar views displaying scheduled and deadline tasks.

---

## License

This project was developed for educational and academic assessment purposes as part of the B.Tech CSE Curriculum.
