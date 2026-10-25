#ifndef TASK_H
#define TASK_H

#include <string>

class Task{
    private:
        int id;
        std::string name;
        int xp;
        bool completed;
    public:
        Task(int i, const std::string& n, int x);
        int get_id() const;
        std::string get_name() const;
        int get_xp() const;
        std::string get_difficulty() const;
        bool is_completed() const;
        void markCompleted();
        void unmarkCompleted();
        void set_name(const std::string& newName);
        void set_xp(int newXP);
};

#endif
