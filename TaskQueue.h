#ifndef TASKQUEUE_H
#define TASKQUEUE_H

#include <string>

class TaskQueue{
    private:
        struct Node{
            int taskId;
            Node* next;
        };
        Node* front;
        Node* rear;
        void clear();
    public:
        TaskQueue();
        ~TaskQueue();

        // Prevent unintentional shallow copy / memory corruption
        TaskQueue(const TaskQueue&) = delete;
        TaskQueue& operator=(const TaskQueue&) = delete;

        void enqueue(int taskId);
        bool dequeue(int& removedTaskId);
        bool peek(int& taskId) const;
        void displayQueue() const;
        bool contains(int id) const;
        bool remove(int id);
        bool isEmpty() const;
        void saveToFile(const std::string& filename) const;
        void loadFromFile(const std::string& filename);
};

#endif
