#ifndef TASKQUEUE_H
#define TASKQUEUE_H

class TaskQueue{
    private:
        struct Node{
            int taskId;
            Node* next;
        };
        Node* front;
        Node* rear;
    public:
        TaskQueue();
        ~TaskQueue();
        void enqueue(int taskId);
        bool dequeue(int& removedTaskId);
        bool peek(int& taskId);
        void displayQueue();
        bool contains(int id);
        bool remove(int id);
        bool isEmpty();
};

#endif