#ifndef STACK_H
#define STACK_H

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
};

class Stack{
private:
    struct Node{
        Action action;
        Node* next;
    };

    Node* top;

public:
    Stack();

    void push(Action action);
    bool pop(Action &action);
    bool isEmpty();
};

#endif