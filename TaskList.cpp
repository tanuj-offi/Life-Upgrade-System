#include "TaskList.h"
#include <iostream>
#include <fstream>


TaskList::TaskList(){
    head = nullptr;
}

TaskList::~TaskList(){
    Node* current = head;
    while(current != nullptr){
        Node* temp = current;
        current = current->next;
        delete temp;
    }
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
    if(head == nullptr){
        cout<<"No tasks available!"<<endl;
        return;
    }

    Node* current = head;

    while(current != nullptr){
        Node* smallest = current;
        Node* temp = current->next;

        while(temp != nullptr){
            if(temp->task.get_id() < smallest->task.get_id()){
                smallest = temp;
            }

            temp = temp->next;
        }

        if(smallest != current){
            Task tempTask = current->task;
            current->task = smallest->task;
            smallest->task = tempTask;
        }

        current = current->next;
    }

    current = head;

    while(current != nullptr){
        cout<<current->task.get_id()<<" "
            <<current->task.get_name()<<" "
            <<current->task.get_xp()<<" ";
        cout<<(current->task.is_completed() ? "Completed" : "Pending")<<endl;

        current = current->next;
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

bool TaskList::getTask(int id, Task& task){
    Node* current = head;
    while(current != nullptr){
        if(current->task.get_id() == id){
            task = current->task;
            return true;
        }
        current = current->next;
    }
    return false;
}

bool TaskList::containsTask(int id){
    Node* current = head;
    while(current != nullptr){
        if(current->task.get_id() == id){
            return true;
        }
        current = current->next;
    }
    return false;
}  


void TaskList::restoreTask(Task task){
    Node* current = head;
    while(current != nullptr){
        if(current->task.get_id() == task.get_id()){
            current->task = task;
            return;
        }
        current = current->next;
    }
    addTask(task);
}

void TaskList::saveToFile(string filename){
    ofstream outFile(filename);
    if(!outFile){
        return;
    }

    Node* current = head;
    while(current != nullptr){
        outFile << current->task.get_id() << " "
                << current->task.get_xp() << " "
                << current->task.is_completed() << " "
                << current->task.get_name() << endl;
        current = current->next;
    }
    outFile.close();
}

void TaskList::loadFromFile(string filename){
    ifstream inFile(filename);
    if(!inFile){
        return;
    }

    int id, xp;
    bool completed;
    string name;

    while(inFile >> id >> xp >> completed){
        inFile.ignore();
        getline(inFile, name);

        Task task(id, name, xp);
        if(completed){
            task.markCompleted();
        }
        addTask(task);
    }
    inFile.close();
}