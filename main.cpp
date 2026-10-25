#include <iostream>
#include <limits>
#include <string>
#include "Task.h"
#include "TaskList.h"
#include "TaskQueue.h"
#include "TaskStack.h"
#include "Player.h"

using namespace std;

// Robust helper to safely read an integer without infinite loops on bad input
bool readInt(int& value, const string& prompt) {
    while (true) {
        cout << prompt;
        if (cin >> value) {
            return true;
        }
        if (cin.eof()) {
            return false;
        }
        cin.clear();
        cin.ignore(numeric_limits<streamsize>::max(), '\n');
        cout << "Invalid input! Please enter a valid number.\n";
    }
}

int chooseDifficultyXP(){
    int diffChoice;
    cout<<"Select Task Difficulty:"<<endl;
    cout<<"1. Easy (10 XP)"<<endl;
    cout<<"2. Medium (25 XP)"<<endl;
    cout<<"3. Hard (50 XP)"<<endl;
    
    if(!readInt(diffChoice, "Enter difficulty (1-3): ")){
        return -1;
    }

    if(diffChoice == 1) return 10;
    if(diffChoice == 2) return 25;
    if(diffChoice == 3) return 50;

    return -1;
}

int main(){
    TaskList list;
    TaskQueue queue;
    Stack undoStack;
    Player player;
    int choice = 0;

    list.loadFromFile("tasks.txt");
    queue.loadFromFile("schedule.txt");
    player.loadFromFile("player.txt");

    do{
        cout<<"\n~~~~~ LIFE UPGRADE SYSTEM ~~~~~"<<endl;
        player.displayStatus();
        cout<<"-------------------------------"<<endl;
        cout<<"1. Add Task"<<endl<<"2. Edit Task"<<endl<<"3. Display Task"<<endl;
        cout<<"4. Delete Task"<<endl<<"5. Complete Task"<<endl<<"6. Schedule Task"<<endl;
        cout<<"7. Unschedule Task"<<endl<<"8. View Schedule"<<endl<<"9. Process Next Scheduled Task"<<endl;
        cout<<"10. Undo Last Action"<<endl<<"11. Exit"<<endl;
        
        if(!readInt(choice, "Enter your choice: ")){
            break;
        }

        switch(choice){
            case 1:
            {
                int id, xp;
                string name;
                
                readInt(id, "Enter task ID: ");
                if(list.containsTask(id)){
                    cout<<"Task ID already exists!"<<endl;
                    break;
                }

                cin.ignore(numeric_limits<streamsize>::max(), '\n');
                cout<<"Enter task name: "; 
                getline(cin, name);
                
                xp = chooseDifficultyXP();
                if(xp == -1){
                    cout<<"Invalid difficulty choice!"<<endl;
                    break;
                }
                
                Task task(id, name, xp);
                list.addTask(task);

                Action action{ADD_TASK, task, false};
                undoStack.push(action);

                cout<<"Task added successfully! (+"<<xp<<" XP on completion)"<<endl;
                break;
            }
            case 2:
            {
                int id, newXP;
                string newName;

                readInt(id, "Enter task ID to edit: ");

                Task oldTask(0, "", 0);

                if(!list.getTask(id, oldTask)){
                    cout<<"Task not found!"<<endl;
                    break;
                }

                if(oldTask.is_completed()){
                    cout<<"Completed task cannot be edited!"<<endl;
                    break;
                }

                cin.ignore(numeric_limits<streamsize>::max(), '\n');
                cout<<"Enter new name: "; 
                getline(cin, newName);

                newXP = chooseDifficultyXP();
                if(newXP == -1){
                    cout<<"Invalid difficulty choice!"<<endl;
                    break;
                }

                list.editTask(id, newName, newXP);

                Action action{EDIT_TASK, oldTask, queue.contains(id)};
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
                readInt(id, "Enter task ID to delete: ");

                Task deletedTask(0, "", 0);

                if(!list.getTask(id, deletedTask)){
                    cout<<"Task not found!"<<endl;
                    break;
                }

                bool wasScheduled = queue.contains(id);
                queue.remove(id);
                list.deleteTask(id);

                Action action{DELETE_TASK, deletedTask, wasScheduled};
                undoStack.push(action);

                break;
            }
            case 5:
            {
                int id;
                readInt(id, "Enter task ID to mark as complete: ");

                Task oldTask(0, "", 0);

                if(!list.getTask(id, oldTask)){
                    cout<<"Task not found!"<<endl;
                    break;
                }

                if(oldTask.is_completed()){
                    cout<<"Task is already completed!"<<endl;
                    break;
                }

                bool wasScheduled = queue.contains(id);
                list.markTaskCompleted(id);
                queue.remove(id);
                player.addXP(oldTask.get_xp());

                Action action{COMPLETE_TASK, oldTask, wasScheduled};
                undoStack.push(action);

                break;
            }
            case 6:
            {
                int taskId;
                readInt(taskId, "Enter task ID to schedule: ");
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
                int taskId;
                readInt(taskId, "Enter Task ID to unschedule: ");
                if(queue.remove(taskId)){
                    cout<<"Task unscheduled!"<<endl;
                }
                else{
                    cout<<"Task is not scheduled!"<<endl;
                }
                break;
            }
            case 8:
            {
                cout<<"Scheduled Task:"<<endl;
                queue.displayQueue();
                break;
            }
            case 9:
            {
                if(queue.isEmpty()){
                    cout<<"No scheduled tasks!"<<endl;
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
                if(task.is_completed()){
                    cout<<"This task is already completed. "
                    <<"Removing it from the schedule; no XP awarded."
                    <<endl;
                    queue.remove(taskId);
                    break;
                }
                cout<<"Next Scheduled Task:"<<endl;
                cout<<"ID: "<<task.get_id()<<endl;
                cout<<"Name: "<<task.get_name()<<endl;
                cout<<"Difficulty: "<<task.get_difficulty()<<" ("<<task.get_xp()<<" XP)"<<endl;
                cout<<"Status: "<<(task.is_completed() ? "Completed":"Pending")<<endl;

                int actionChoice;
                cout<<"\n1. Complete"<<endl;
                cout<<"2. Skip for now"<<endl;
                cout<<"3. Cancel"<<endl;
                readInt(actionChoice, "Enter your choice: ");
                
                switch(actionChoice){
                    case 1:
                    {
                        queue.dequeue(taskId);
                        list.markTaskCompleted(taskId);
                        player.addXP(task.get_xp());

                        Action action{COMPLETE_TASK, task, true};
                        undoStack.push(action);

                        cout<<"Removed from schedule!"<<endl;
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
            case 10:
            {
                Action action{ADD_TASK, Task(0, "", 0), false};

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
                        if(action.wasScheduled){
                            queue.enqueue(action.task.get_id());
                        }
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
                        player.removeXP(action.task.get_xp());
                        if(action.wasScheduled){
                            queue.enqueue(action.task.get_id());
                        }
                        cout<<"Last Complete action undone!"<<endl;
                        break;
                    }
                }

                break;
            }
            case 11:
            {
                cout<<"Thank You!"<<endl;
                cout<<"Exiting...";
                break;
            }
            default:
                cout<<"Invalid Input! Try again..."<<endl;
        }

        list.saveToFile("tasks.txt");
        queue.saveToFile("schedule.txt");
        player.saveToFile("player.txt");

    } while(choice != 11);

    return 0; 
}
