#include <iostream>
#include "Task.h"
#include "TaskList.h"
using namespace std;

int main(){
    TaskList list;
    int choice;

    do{
        cout<<"\n~~~~~ LIFE UPGRADE SYSTEM ~~~~~"<<endl;
        cout<<"1. Add Task"<<endl<<"2. Edit Task"<<endl<<"3. Display Task"<<endl;
        cout<<"4. Delete Task"<<endl<<"5. Complete Task"<<endl<<"6. Exit"<<endl;
        cout<<"Enter your choice: ";
        cin>>choice;

        switch(choice){
            case 1:
            {
                int id, xp;
                string name;
                
                cout<<"Enter task ID: "; cin>>id;
                cout<<"Enter task name: "; cin.ignore(); getline(cin, name);
                cout<<"Enter task XP: "; cin>>xp;
                
                Task task(id, name, xp);
                list.addTask(task);

                cout<<"Task added successfully!"<<endl;
                break;
            }
            case 2:
            {
                int id, newXP;
                string newName;

                cout<<"Enter task ID to edit: "; cin>>id;
                cout<<"Enter new name: "; cin.ignore(); getline(cin, newName);
                cout<<"Enter new XP: "; cin>>newXP; 

                list.editTask(id, newName, newXP);
                break;
            }
            case 3:
            {
                cout<<"Tasks: "<<endl;
                list.displayTasks();
                break;
            }
            case 4:
            {
                int id;
                cout<<"Enter task ID to delete: "; cin>>id;

                list.deleteTask(id);
                break;
            }
            case 5:
            {
                int id;
                cout<<"Enter task ID to mark as complete: "; cin>>id;

                list.markTaskCompleted(id);
                break;
            }
            case 6:
            {
                cout<<"Thank You!"<<endl;
                cout<<"Exiting...";
                break;
            }
            default:
                cout<<"Invalid Input! Try again..."<<endl;
        }
    } while(choice != 6);

    return 0;
}