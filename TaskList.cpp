#include "TaskList.h"
#include <iostream>


TaskList::TaskList(){
    head = nullptr;
}

void TaskList::addTask(Task task){
    Node* newNode = new Node{task, nullptr};

    if (head == nullptr){
        head = newNode;
    }
    else{
        Node* temp = head;
        while(temp->next != nullptr){
            temp = temp->next;
        }
        temp->next = newNode; 
    }
}

void TaskList::displayTasks(){
    Node* temp = head;
    while(temp != nullptr){
        cout<<temp->task.get_id()<<" "<<temp->task.get_name()<<" "<<temp->task.get_xp()<<" ";
        cout<<(temp->task.is_completed() ? "Completed" : "Pending")<<endl;
        temp = temp->next;
    }
}

void TaskList::deleteTask(int id){
    Node* current = head;
    Node* prev = nullptr;
    while(current != nullptr){
        if (current->task.get_id() == id){
            if(prev == nullptr){
                head = current->next;
            }
            else{
                prev->next = current->next;
            }
            delete current;
            cout<<"Task Deleted!"<<endl;
            return;
        }
        prev = current;
        current = current->next;
    }
    cout<<"Task not found!"<<endl;
}

void TaskList::markTaskCompleted(int id){
    Node* current = head;
    while(current != nullptr){
        if(current->task.get_id() == id){
            current->task.markCompleted();
            cout<<"Task Completed!"<<endl;
            return;
        }
        current = current->next;
    }
    cout<<"Task not found!"<<endl;
}

void TaskList::editTask(int id, string newName, int newXP){
    Node* current = head;
    while(current != nullptr){
        if(current->task.get_id() == id){
            current->task.set_name(newName);
            current->task.set_xp(newXP);
            cout<<"Task Updated!"<<endl;
            return;
        }
        current = current->next;
    }
    cout<<"Task not found!"<<endl;
}