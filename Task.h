#ifndef TASK_H
#define TASK_H

#include <string>
using namespace std;

class Task{
    private:
        int id;
        string name;
        int xp;
        bool completed;
    public:
        Task(int i, string n, int x);
        int get_id();
        string get_name();
        int get_xp();
        bool is_completed();
        void markCompleted();
        void set_name(string newName);
        void set_xp(int newXP);
};

#endif