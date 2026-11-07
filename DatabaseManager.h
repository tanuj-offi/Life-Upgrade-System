#ifndef DATABASEMANAGER_H
#define DATABASEMANAGER_H

#include <mysql.h>
#include <string>

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

    // Supporting verification methods
    bool userExists(const std::string& username);
    bool getPlayerXP(int userId, int& outXP);
    int getPlayerProgressCount(int userId);
};

#endif
