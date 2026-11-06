#include "Task.h"
using namespace std;

Task::Task(int i, const string& n, int x, const string& d){
    id = i;
    name = n;
    xp = x;
    completed = false;
    due_date = d;
}

int Task::get_id() const {
    return id;
}

string Task::get_name() const {
    return name;
}

int Task::get_xp() const {
    return xp;
}

string Task::get_difficulty() const {
    if(xp <= 10) return "Easy";
    if(xp <= 25) return "Medium";
    return "Hard";
}

bool Task::is_completed() const {
    return completed;
}

void Task::markCompleted(){
    completed = true;
}

void Task::unmarkCompleted(){
    completed = false;
}

void Task::set_name(const string& newName){
    name = newName;
}

void Task::set_xp(int newXP){
    xp = newXP;
}

string Task::get_due_date() const {
    return due_date;
}

void Task::set_due_date(const string& newDueDate){
    due_date = newDueDate;
}

bool Task::has_due_date() const {
    return !due_date.empty();
}
