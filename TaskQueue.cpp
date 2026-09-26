#include "TaskQueue.h"
#include <iostream>
using namespace std;

TaskQueue::TaskQueue(){
    front = nullptr;
    rear = nullptr;
}

void TaskQueue::enqueue(int taskId){
    Node* newNode = new Node{taskId, nullptr};

    if(front == nullptr){
        front = newNode;
        rear = newNode;
    }
    else{
        rear->next = newNode;
        rear = newNode;
    }
}

bool TaskQueue::dequeue(int& removedTaskId){
    if(front == nullptr){
        cout<<"Queue is empty!"<<endl;
        return false;
    }
    removedTaskId = front->taskId;
    Node* temp = front;
    front = front->next;

    if(front == nullptr){
        rear = nullptr;
    }
    delete temp;
    return true;
}
 
bool TaskQueue::peek(int& taskId){
    if(front == nullptr){
        return false;
    }
    taskId = front->taskId;
    return true;
}

void TaskQueue::displayQueue(){
    if(front == nullptr){
        cout<<"Queue is empty!"<<endl;
        return;
    }
    Node* temp = front;

    while(temp != nullptr){
        cout<<"Task ID: "<<temp->taskId<<endl;
        temp = temp->next;
    }
}

bool TaskQueue::contains(int id){
    Node* temp = front;
    while(temp != nullptr){
        if(temp->taskId == id){
            return true;
        }
        temp = temp->next;
    }
    return false;
}

bool TaskQueue::remove(int id){
    Node* current = front;
    Node* previous = nullptr;

    while(current != nullptr){
        if(current->taskId == id){
            if(previous == nullptr){
                front = current->next;
            }
            else{
                previous->next = current->next;
            }
            if(current == rear){
                rear = previous;
            }
            delete current;
            return true;
        }
        previous = current;
        current = current->next;
    }
    return false;
} 

bool TaskQueue::isEmpty(){
    return front == nullptr;
}
