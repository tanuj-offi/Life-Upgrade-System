#include <iostream>
#include "Task.h"
#include "TaskList.h"
#include "TaskQueue.h"
#include "TaskStack.h"

using namespace std;

int main(){
    TaskList list;
    TaskQueue queue;
    Stack undoStack;
    int choice;

    do{
        cout<<"\n~~~~~ LIFE UPGRADE SYSTEM ~~~~~"<<endl;
        cout<<"1. Add Task"<<endl<<"2. Edit Task"<<endl<<"3. Display Task"<<endl;
        cout<<"4. Delete Task"<<endl<<"5. Complete Task"<<endl<<"6. Schedule Task"<<endl;
        cout<<"7. View Schedule"<<endl<<"8. Process Next Scheduled Task"<<endl;
        cout<<"9. Undo Last Action"<<endl<<"10. Exit"<<endl;
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

                if(list.containsTask(id)){
                    cout<<"Task ID already exists!"<<endl;
                    break;
                }
                
                Task task(id, name, xp);
                list.addTask(task);

                Action action{ADD_TASK, task};
                undoStack.push(action);

                cout<<"Task added successfully!"<<endl;
                break;
            }
            case 2:
            {
                int id, newXP;
                string newName;

                cout<<"Enter task ID to edit: "; cin>>id;

                Task oldTask(0, "", 0);

                if(!list.getTask(id, oldTask)){
                    cout<<"Task not found!"<<endl;
                    break;
                }

                cout<<"Enter new name: "; cin.ignore(); getline(cin, newName);
                cout<<"Enter new XP: "; cin>>newXP;  

                list.editTask(id, newName, newXP);

                Action action{EDIT_TASK, oldTask};
                undoStack.push(action);

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

                Task deletedTask(0, "", 0);

                if(!list.getTask(id, deletedTask)){
                    cout<<"Task not found!"<<endl;
                    break;
                }

                queue.remove(id);
                list.deleteTask(id);

                Action action{DELETE_TASK, deletedTask};
                undoStack.push(action);

                break;
            }
            case 5:
            {
                int id;
                cout<<"Enter task ID to mark as complete: "; cin>>id;

                Task oldTask(0, "", 0);

                if(!list.getTask(id, oldTask)){
                    cout<<"Task not found!"<<endl;
                    break;
                }

                if(oldTask.is_completed()){
                    cout<<"Task is already completed!"<<endl;
                    break;
                }

                list.markTaskCompleted(id);
                queue.remove(id);

                Action action{COMPLETE_TASK, oldTask};
                undoStack.push(action);

                break;
            }
            case 6:
            {
                int taskId;
                cout<<"Enter task ID to schedule: ";
                cin>>taskId;
                Task task(0,"",0);
                if(!list.getTask(taskId, task)){
                    cout<<"Task not found!"<<endl;
                    break;
                }
                if(task.is_completed()){
                    cout<<"Task is already completed!"<<endl;
                    break;
                }
                if(queue.contains(taskId)){
                    cout<<"Task is already scheduled!"<<endl;
                    break;
                }
                queue.enqueue(taskId);
                cout<<"Task Scheduled successfully!"<<endl;
                break;
            }
            case 7:
            {
                cout<<"Scheduled Task:"<<endl;
                queue.displayQueue();
                break;
            }
            case 8:
            {
                if(queue.isEmpty()){
                    cout<<"No schedules tasks!"<<endl;
                    break;
                }
                int taskId;
                queue.peek(taskId);
                Task task(0,"",0);
                if(!list.getTask(taskId, task)){
                    cout<<"Scheduled task no longer exists!"<<endl;
                    queue.remove(taskId);
                    break;
                }
                cout<<"Next Scheduled Task:"<<endl;
                cout<<"ID: "<<task.get_id()<<endl;
                cout<<"Name: "<<task.get_name()<<endl;
                cout<<"XP: "<<task.get_xp()<<endl;
                cout<<"Status: "<<(task.is_completed() ? "Completed":"Pending")<<endl;

                int choice;
                cout<<"\n1. Complete"<<endl;
                cout<<"2. Skip for now"<<endl;
                cout<<"3. Cancel"<<endl;
                cout<<"Enter your choice: "; cin>>choice;
                
                switch(choice){
                    case 1:
                    {
                        queue.dequeue(taskId);
                        list.markTaskCompleted(taskId);

                        Action action{COMPLETE_TASK, task};
                        undoStack.push(action);

                        cout<<"Task completed and removed from schedule!"<<endl;
                        break;
                    }
                    case 2:
                    {
                        queue.dequeue(taskId);
                        queue.enqueue(taskId);

                        cout<<"Task skipped and moved to the end of schedule!"<<endl;
                        break;
                    }
                    case 3:
                    {
                        cout<<"Task remains scheduled!"<<endl;
                        break;
                    }
                    default:
                        cout<<"Invalid choice!"<<endl;
                }
                break;
            }
            case 9:
            {
                Action action{ADD_TASK, Task(0, "", 0)};

                if(!undoStack.pop(action)){
                    cout<<"Nothing to undo!"<<endl;
                    break;
                }

                switch(action.type){
                    case ADD_TASK:
                    {
                        queue.remove(action.task.get_id());
                        list.deleteTask(action.task.get_id());
                        cout<<"Last Add action undone!"<<endl;
                        break;
                    }
                    case DELETE_TASK:
                    {
                        list.restoreTask(action.task);
                        cout<<"Last Delete action undone!"<<endl;
                        break;
                    }
                    case EDIT_TASK:
                    {
                        list.restoreTask(action.task);
                        cout<<"Last Edit action undone!"<<endl;
                        break;
                    }
                    case COMPLETE_TASK:
                    {
                        list.restoreTask(action.task);
                        cout<<"Last Complete action undone!"<<endl;
                        break;
                    }
                }

                break;
            }
            case 10:
            {
                cout<<"Thank You!"<<endl;
                cout<<"Exiting...";
                break;
            }
            default:
                cout<<"Invalid Input! Try again..."<<endl;
        }
    } while(choice != 10);

    return 0; 
}