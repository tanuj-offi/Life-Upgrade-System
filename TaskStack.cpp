#include "Stack.h"

Stack::Stack(){
    top = nullptr;
}

void Stack::push(Action action){
    Node* newNode = new Node{action, top};
    top = newNode;
}

bool Stack::pop(Action &action){
    if(top == nullptr){
        return false;
    }

    Node* temp = top;
    action = top->action;
    top = top->next;
    delete temp;

    return true;
}

bool Stack::isEmpty(){
    return top == nullptr;
}
