#ifndef TASKLIST_H
#define TASKLIST_H

#include <string>
#include "Task.h"

class TaskList{
    private:
        struct Node{
            Task task;
            Node* next;
        };
        Node* head;
        void clear();
    public:
        TaskList();
        ~TaskList();

        // Prevent unintentional shallow copy / memory corruption
        TaskList(const TaskList&) = delete;
        TaskList& operator=(const TaskList&) = delete;

        void addTask(const Task& task);
        void displayTasks();
        void deleteTask(int id);
        void markTaskCompleted(int id);
        void editTask(int id, const std::string& newName, int newXP);
        bool getTask(int id, Task& task) const;
        bool containsTask(int id) const;
        void restoreTask(const Task& task);
        void saveToFile(const std::string& filename) const;
        void loadFromFile(const std::string& filename);
};

#endif 
