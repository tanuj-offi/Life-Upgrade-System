#include "Task.h"

Task::Task(int i, string n, int x){
    id = i;
    name = n;
    xp = x;
    completed = false;
}

int Task::get_id(){
    return id;
}

string Task::get_name(){
    return name;
}

int Task::get_xp(){
    return xp;
}

bool Task::is_completed(){
    return completed;
}

void Task::markCompleted(){
    completed = true;
}

void Task::set_name(string newName){
    name = newName;
}

void Task::set_xp(int newXP){
    xp = newXP;
}