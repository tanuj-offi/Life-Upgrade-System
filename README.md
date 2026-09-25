# Life Upgrade System

## 1. Project Title and Brief Description

**Life Upgrade System** is a C++ console-based task management system
developed as a Semester 3 BTech CSE Project-Based Learning (PBL)
project.

The project is designed around managing daily tasks in a simple
game-like way. The current version focuses on basic task management
using Object-Oriented Programming and a singly linked list.

## 2. Problem Statement / Objective

Managing daily tasks manually can make it difficult to keep track of
completed and pending work. The objective of this project is to develop
a simple task management system where users can add, edit, display,
delete, and complete tasks.

The project also provides a base for adding Data Structures such as
Stack and Queue and features such as undo, scheduling, file storage, and
XP/level progression in later phases.

## 3. Team Members

  Name                Enrollment No.   Section
  ------------------- ---------------- ---------
  Bilawal Ansari      2027723          J
  Kartikey Vashisht   2028739          ML3
  Tanuj Sharma        2028217          B
  Hardik Bagwari      2028423          DS2

**Mentor:** Ms. Nishtha Bhatt

## 4. Technologies / Tools Used

-   **Language:** C++
-   **Concepts:** Object-Oriented Programming, Singly Linked List,
    Pointers, Dynamic Memory Allocation
-   **IDE:** Visual Studio Code
-   **Compiler:** GCC / G++
-   **Version Control:** Git and GitHub

## 5. Project Setup / Installation

### Requirements

-   C++ compiler (GCC/G++)
-   Visual Studio Code or any C++ compatible IDE
-   Git (optional, if cloning from GitHub)

### Steps

1.  Clone or download the repository.
2.  Open the project folder in Visual Studio Code.
3.  Compile all `.cpp` files together:

``` bash
g++ main.cpp Task.cpp TaskList.cpp -o LifeUpgradeSystem
```

4.  Run the program:

**Windows:**

``` bash
LifeUpgradeSystem.exe
```

**Linux/macOS:**

``` bash
./LifeUpgradeSystem
```

## 6. Major Features / Modules

### Currently Implemented

-   Add a task
-   Edit a task
-   Display tasks
-   Delete a task
-   Mark a task as completed
-   Store task ID, name, XP, and completion status
-   Manage tasks using a singly linked list

### Planned for Later Phases

-   Stack-based undo
-   Queue-based task scheduling
-   Multiple-user system
-   File saving and loading
-   XP and level progression
-   Further integration and testing
-   Web interface in the later project phase

## 7. Current Project Status / Progress

**Current Status: Phase 1 -- Basic Implementation**

The basic C++ task management system has been implemented using classes,
objects, encapsulation, constructors, pointers, dynamic memory
allocation, and a singly linked list.

The current program is console-based and supports a single task list
during program execution.

The remaining features listed above will be developed and integrated in
the upcoming phases.

## Project Structure

``` text
Life Upgrade System/
├── Task.h
├── Task.cpp
├── TaskList.h
├── TaskList.cpp
├── main.cpp
├── README.md
└── .gitignore
```

## Contribution

All team members will contribute to the project through the GitHub
repository. The repository will be updated regularly with meaningful
commits reflecting the actual development work.
