#ifndef TASKQUEUE_H
#define TASKQUEUE_H

#include "Task.h"
class TaskQueue{
    private:
        struct Node{
            Task task;
            Node* next;
        };
        Node* front;
        Node* rear;
    public:
        TaskQueue();
        void enqueue(Task task);
        void dequeue();
        void displayQueue();
        bool isEmpty();
};

#endif