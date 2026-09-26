#ifndef TASKLIST_H
#define TASKLIST_H

#include "Task.h"

class TaskList{
    private:
        struct Node{
            Task task;
            Node* next;
        };
        Node* head;
    public:
        TaskList();
        ~TaskList();
        void addTask(Task task);
        void displayTasks();
        void deleteTask(int id);
        void markTaskCompleted(int id);
        void editTask(int id, string newName, int newXP);
        bool getTask(int id, Task& task);
        bool containsTask(int id);
};

#endif 