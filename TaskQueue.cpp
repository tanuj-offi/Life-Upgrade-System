#include "TaskQueue.h"
#include <iostream>
using namespace std;

TaskQueue::TaskQueue(){
    front = nullptr;
    rear = nullptr;
}

void TaskQueue::enqueue(Task task){
    Node* newNode = new Node{task, nullptr};

    if(front == nullptr){
        front = newNode;
        rear = newNode;
    }
    else{
        rear->next = newNode;
        rear = newNode;
    }
}

void TaskQueue::dequeue(){
    if(front == nullptr){
        cout<<"Queue is empty!"<<endl;
        return;
    }
    Node* temp = front;
    front = front->next;

    if(front == nullptr){
        rear = nullptr;
    }
    delete temp;
}

void TaskQueue::displayQueue(){
    if(front == nullptr){
        cout<<"Queue is empty!"<<endl;
        return;
    }
    Node* temp = front;

    while(temp != nullptr){
        cout<<temp->task.get_id()<<" "<<temp->task.get_name()<<" ";
        cout<<temp->task.get_xp()<<endl;
        temp = temp->next;
    }
}

bool TaskQueue::isEmpty(){
    return front == nullptr;
}
