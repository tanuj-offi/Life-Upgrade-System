#ifndef TASKSTACK_H
#define TASKSTACK_H

#include "Task.h"

enum ActionType {
    ADD_TASK,
    DELETE_TASK,
    EDIT_TASK,
    COMPLETE_TASK
};

struct Action {
    ActionType type;
    Task task;
    bool wasScheduled;
};

class Stack {
private:
    struct Node {
        Action action;
        Node* next;
    };

    Node* top;
    void clear();

public:
    Stack();
    ~Stack();

    // Prevent unintentional shallow copy / memory corruption
    Stack(const Stack&) = delete;
    Stack& operator=(const Stack&) = delete;

    void push(const Action& action);
    bool pop(Action& action);
    bool isEmpty() const;
};

#endif
