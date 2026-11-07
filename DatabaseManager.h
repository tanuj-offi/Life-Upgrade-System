#ifndef DATABASEMANAGER_H
#define DATABASEMANAGER_H

#include <mysql.h>
#include <string>
#include <vector>
#include "Task.h"
#include "Player.h"
#include "TaskQueue.h"

class DatabaseManager {
private:
    MYSQL* connection;
    mutable std::string lastError;

    void setLastError(const std::string& error) const;

public:
    DatabaseManager();
    ~DatabaseManager();

    bool connect();
    void disconnect();
    bool isConnected() const;
    MYSQL* getConnection() const;

    std::string getLastError() const;

    // Password security using standard salted SHA-256
    static std::string hashPassword(const std::string& password);
    static bool verifyPassword(const std::string& password, const std::string& storedHash);

    // User registration & player progress initialization
    bool registerUser(const std::string& username, const std::string& password, int* outUserId = nullptr);
    bool userExists(const std::string& username);

    // User-specific task operations
    bool createTask(int userId, const Task& task, int* outTaskId = nullptr);
    bool createTask(int userId, const std::string& name, int xp, const std::string& dueDate = "", bool completed = false, int* outTaskId = nullptr);
    bool getUserTasks(int userId, std::vector<Task>& outTasks);
    bool updateTask(int userId, int taskId, const std::string& newName, int newXP, const std::string& newDueDate = "");
    bool updateTask(int userId, const Task& task);
    bool deleteTask(int userId, int taskId);
    bool setTaskCompleted(int userId, int taskId, bool completed);

    // Player XP operations
    bool getPlayerXP(int userId, int& outXP);
    bool updatePlayerXP(int userId, int newXP);
    bool getPlayer(int userId, Player& outPlayer);
    bool savePlayer(int userId, const Player& player);

    // User-specific task queue operations
    bool addToSchedule(int userId, int taskId);
    bool getUserQueue(int userId, TaskQueue& outQueue);
    bool processNextScheduledTask(int userId, int& outTaskId);
    bool skipNextScheduledTask(int userId, int& outTaskId);
    bool removeFromSchedule(int userId, int taskId);

    // Supporting verification methods
    int getPlayerProgressCount(int userId);
};

#endif
