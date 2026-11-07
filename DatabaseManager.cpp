#include "DatabaseManager.h"
#include "db_config.h"
#include <iostream>
#include <sstream>
#include <iomanip>
#include <cstring>
#include <windows.h>
#include <wincrypt.h>

using namespace std;

// Internal helper: Compute SHA-256 using standard Windows CryptoAPI
static string computeSHA256(const string& input) {
    HCRYPTPROV hProv = 0;
    HCRYPTHASH hHash = 0;
    BYTE rgbHash[32];
    DWORD cbHash = 32;
    string result = "";

    if (CryptAcquireContext(&hProv, nullptr, nullptr, PROV_RSA_AES, CRYPT_VERIFYCONTEXT)) {
        if (CryptCreateHash(hProv, CALG_SHA_256, 0, 0, &hHash)) {
            if (CryptHashData(hHash, reinterpret_cast<const BYTE*>(input.c_str()), static_cast<DWORD>(input.length()), 0)) {
                if (CryptGetHashParam(hHash, HP_HASHVAL, rgbHash, &cbHash, 0)) {
                    ostringstream oss;
                    for (DWORD i = 0; i < cbHash; ++i) {
                        oss << hex << setw(2) << setfill('0') << static_cast<int>(rgbHash[i]);
                    }
                    result = oss.str();
                }
            }
            CryptDestroyHash(hHash);
        }
        CryptReleaseContext(hProv, 0);
    }
    return result;
}

// Internal helper: Generate cryptographically secure random salt (32 hex chars)
static string generateRandomSalt() {
    HCRYPTPROV hProv = 0;
    string salt = "";
    if (CryptAcquireContext(&hProv, nullptr, nullptr, PROV_RSA_AES, CRYPT_VERIFYCONTEXT)) {
        BYTE randomBytes[16];
        if (CryptGenRandom(hProv, 16, randomBytes)) {
            ostringstream oss;
            for (int i = 0; i < 16; ++i) {
                oss << hex << setw(2) << setfill('0') << static_cast<int>(randomBytes[i]);
            }
            salt = oss.str();
        }
        CryptReleaseContext(hProv, 0);
    }
    return salt;
}

DatabaseManager::DatabaseManager() {
    connection = nullptr;
    lastError = "";
}

DatabaseManager::~DatabaseManager() {
    disconnect();
}

void DatabaseManager::setLastError(const string& error) const {
    lastError = error;
}

string DatabaseManager::getLastError() const {
    return lastError;
}

bool DatabaseManager::connect() {
    connection = mysql_init(nullptr);

    if (connection == nullptr) {
        setLastError("MySQL initialization failed.");
        cerr << lastError << endl;
        return false;
    }

    // Set CLIENT_FOUND_ROWS flag so UPDATE statements return matched rows count
    MYSQL* result = mysql_real_connect(
        connection,
        DB_HOST,
        DB_USER,
        DB_PASS,
        DB_NAME,
        DB_PORT,
        nullptr,
        CLIENT_FOUND_ROWS
    );

    if (result == nullptr) {
        setLastError(string("Database connection failed: ") + mysql_error(connection));
        cerr << lastError << endl;
        mysql_close(connection);
        connection = nullptr;
        return false;
    }

    setLastError("");
    return true;
}

void DatabaseManager::disconnect() {
    if (connection != nullptr) {
        mysql_close(connection);
        connection = nullptr;
    }
}

bool DatabaseManager::isConnected() const {
    return connection != nullptr;
}

MYSQL* DatabaseManager::getConnection() const {
    return connection;
}

string DatabaseManager::hashPassword(const string& password) {
    string salt = generateRandomSalt();
    string hash = computeSHA256(password + salt);
    return salt + "$" + hash;
}

bool DatabaseManager::verifyPassword(const string& password, const string& storedHash) {
    size_t delimiterPos = storedHash.find('$');
    if (delimiterPos == string::npos) {
        return false;
    }

    string salt = storedHash.substr(0, delimiterPos);
    string expectedHash = storedHash.substr(delimiterPos + 1);
    string computedHash = computeSHA256(password + salt);

    return computedHash == expectedHash;
}

bool DatabaseManager::registerUser(const string& username, const string& password, int* outUserId) {
    if (!isConnected()) {
        setLastError("Database is not connected.");
        return false;
    }

    if (username.empty() || password.empty()) {
        setLastError("Username and password cannot be empty.");
        return false;
    }

    if (username.length() > 50) {
        setLastError("Username cannot exceed 50 characters.");
        return false;
    }

    // Begin transaction for atomic user registration + initial player progress setup
    if (mysql_autocommit(connection, 0) != 0) {
        setLastError(string("Failed to begin transaction: ") + mysql_error(connection));
        return false;
    }

    // 1. Hash password with random salt
    string passwordHash = hashPassword(password);

    // 2. Insert into users table via prepared statement
    const char* userQuery = "INSERT INTO users (username, password_hash) VALUES (?, ?)";
    MYSQL_STMT* stmtUser = mysql_stmt_init(connection);
    if (!stmtUser) {
        setLastError("Failed to initialize MySQL statement.");
        mysql_rollback(connection);
        mysql_autocommit(connection, 1);
        return false;
    }

    if (mysql_stmt_prepare(stmtUser, userQuery, static_cast<unsigned long>(strlen(userQuery))) != 0) {
        setLastError(string("Failed to prepare user insert statement: ") + mysql_stmt_error(stmtUser));
        mysql_stmt_close(stmtUser);
        mysql_rollback(connection);
        mysql_autocommit(connection, 1);
        return false;
    }

    MYSQL_BIND userBind[2];
    memset(userBind, 0, sizeof(userBind));

    unsigned long uLen = static_cast<unsigned long>(username.length());
    userBind[0].buffer_type = MYSQL_TYPE_STRING;
    userBind[0].buffer = const_cast<char*>(username.c_str());
    userBind[0].buffer_length = uLen;
    userBind[0].length = &uLen;

    unsigned long pLen = static_cast<unsigned long>(passwordHash.length());
    userBind[1].buffer_type = MYSQL_TYPE_STRING;
    userBind[1].buffer = const_cast<char*>(passwordHash.c_str());
    userBind[1].buffer_length = pLen;
    userBind[1].length = &pLen;

    if (mysql_stmt_bind_param(stmtUser, userBind) != 0) {
        setLastError(string("Failed to bind user parameters: ") + mysql_stmt_error(stmtUser));
        mysql_stmt_close(stmtUser);
        mysql_rollback(connection);
        mysql_autocommit(connection, 1);
        return false;
    }

    if (mysql_stmt_execute(stmtUser) != 0) {
        unsigned int errCode = mysql_stmt_errno(stmtUser);
        if (errCode == 1062) { // ER_DUP_ENTRY
            setLastError("Username already exists.");
        } else {
            setLastError(string("Failed to execute user registration: ") + mysql_stmt_error(stmtUser));
        }
        mysql_stmt_close(stmtUser);
        mysql_rollback(connection);
        mysql_autocommit(connection, 1);
        return false;
    }

    my_ulonglong newUserId = mysql_stmt_insert_id(stmtUser);
    mysql_stmt_close(stmtUser);

    if (newUserId == 0) {
        setLastError("Failed to retrieve new user ID.");
        mysql_rollback(connection);
        mysql_autocommit(connection, 1);
        return false;
    }

    // 3. Insert initial player progress record (user_id, total_xp = 0)
    const char* progressQuery = "INSERT INTO player_progress (user_id, total_xp) VALUES (?, 0)";
    MYSQL_STMT* stmtProgress = mysql_stmt_init(connection);
    if (!stmtProgress) {
        setLastError("Failed to initialize player progress statement.");
        mysql_rollback(connection);
        mysql_autocommit(connection, 1);
        return false;
    }

    if (mysql_stmt_prepare(stmtProgress, progressQuery, static_cast<unsigned long>(strlen(progressQuery))) != 0) {
        setLastError(string("Failed to prepare player progress statement: ") + mysql_stmt_error(stmtProgress));
        mysql_stmt_close(stmtProgress);
        mysql_rollback(connection);
        mysql_autocommit(connection, 1);
        return false;
    }

    MYSQL_BIND progressBind[1];
    memset(progressBind, 0, sizeof(progressBind));

    int uid = static_cast<int>(newUserId);
    progressBind[0].buffer_type = MYSQL_TYPE_LONG;
    progressBind[0].buffer = &uid;

    if (mysql_stmt_bind_param(stmtProgress, progressBind) != 0) {
        setLastError(string("Failed to bind player progress parameter: ") + mysql_stmt_error(stmtProgress));
        mysql_stmt_close(stmtProgress);
        mysql_rollback(connection);
        mysql_autocommit(connection, 1);
        return false;
    }

    if (mysql_stmt_execute(stmtProgress) != 0) {
        setLastError(string("Failed to initialize player progress: ") + mysql_stmt_error(stmtProgress));
        mysql_stmt_close(stmtProgress);
        mysql_rollback(connection);
        mysql_autocommit(connection, 1);
        return false;
    }

    mysql_stmt_close(stmtProgress);

    // 4. Commit transaction
    if (mysql_commit(connection) != 0) {
        setLastError(string("Transaction commit failed: ") + mysql_error(connection));
        mysql_rollback(connection);
        mysql_autocommit(connection, 1);
        return false;
    }

    mysql_autocommit(connection, 1);

    if (outUserId != nullptr) {
        *outUserId = uid;
    }

    setLastError("");
    return true;
}

bool DatabaseManager::userExists(const string& username) {
    if (!isConnected()) {
        return false;
    }

    const char* query = "SELECT id FROM users WHERE username = ?";
    MYSQL_STMT* stmt = mysql_stmt_init(connection);
    if (!stmt) return false;

    if (mysql_stmt_prepare(stmt, query, static_cast<unsigned long>(strlen(query))) != 0) {
        mysql_stmt_close(stmt);
        return false;
    }

    MYSQL_BIND bind[1];
    memset(bind, 0, sizeof(bind));

    unsigned long uLen = static_cast<unsigned long>(username.length());
    bind[0].buffer_type = MYSQL_TYPE_STRING;
    bind[0].buffer = const_cast<char*>(username.c_str());
    bind[0].buffer_length = uLen;
    bind[0].length = &uLen;

    if (mysql_stmt_bind_param(stmt, bind) != 0 || mysql_stmt_execute(stmt) != 0) {
        mysql_stmt_close(stmt);
        return false;
    }

    mysql_stmt_store_result(stmt);
    bool exists = (mysql_stmt_num_rows(stmt) > 0);
    mysql_stmt_close(stmt);

    return exists;
}

// -------------------------------------------------------------
// User-Specific Task CRUD Operations
// -------------------------------------------------------------

bool DatabaseManager::createTask(int userId, const Task& task, int* outTaskId) {
    return createTask(userId, task.get_name(), task.get_xp(), task.get_due_date(), task.is_completed(), outTaskId);
}

bool DatabaseManager::createTask(int userId, const string& name, int xp, const string& dueDate, bool completed, int* outTaskId) {
    if (!isConnected()) {
        setLastError("Database is not connected.");
        return false;
    }

    if (userId <= 0) {
        setLastError("Invalid user ID.");
        return false;
    }

    if (name.empty()) {
        setLastError("Task name cannot be empty.");
        return false;
    }

    const char* query = "INSERT INTO tasks (user_id, name, xp, completed, due_date) VALUES (?, ?, ?, ?, ?)";
    MYSQL_STMT* stmt = mysql_stmt_init(connection);
    if (!stmt) {
        setLastError("Failed to initialize MySQL statement.");
        return false;
    }

    if (mysql_stmt_prepare(stmt, query, static_cast<unsigned long>(strlen(query))) != 0) {
        setLastError(string("Failed to prepare task insert statement: ") + mysql_stmt_error(stmt));
        mysql_stmt_close(stmt);
        return false;
    }

    MYSQL_BIND bind[5];
    memset(bind, 0, sizeof(bind));

    // Param 0: user_id
    bind[0].buffer_type = MYSQL_TYPE_LONG;
    bind[0].buffer = &userId;

    // Param 1: name
    unsigned long nameLen = static_cast<unsigned long>(name.length());
    bind[1].buffer_type = MYSQL_TYPE_STRING;
    bind[1].buffer = const_cast<char*>(name.c_str());
    bind[1].buffer_length = nameLen;
    bind[1].length = &nameLen;

    // Param 2: xp
    bind[2].buffer_type = MYSQL_TYPE_LONG;
    bind[2].buffer = &xp;

    // Param 3: completed
    char completedChar = completed ? 1 : 0;
    bind[3].buffer_type = MYSQL_TYPE_TINY;
    bind[3].buffer = &completedChar;

    // Param 4: due_date (NULL if empty, or string YYYY-MM-DD)
    bool isDateNull = dueDate.empty();
    unsigned long dateLen = static_cast<unsigned long>(dueDate.length());
    if (isDateNull) {
        bind[4].buffer_type = MYSQL_TYPE_NULL;
        bind[4].is_null = &isDateNull;
    } else {
        bind[4].buffer_type = MYSQL_TYPE_STRING;
        bind[4].buffer = const_cast<char*>(dueDate.c_str());
        bind[4].buffer_length = dateLen;
        bind[4].length = &dateLen;
        bind[4].is_null = &isDateNull;
    }

    if (mysql_stmt_bind_param(stmt, bind) != 0 || mysql_stmt_execute(stmt) != 0) {
        setLastError(string("Failed to create task: ") + mysql_stmt_error(stmt));
        mysql_stmt_close(stmt);
        return false;
    }

    my_ulonglong newTaskId = mysql_stmt_insert_id(stmt);
    mysql_stmt_close(stmt);

    if (outTaskId != nullptr) {
        *outTaskId = static_cast<int>(newTaskId);
    }

    setLastError("");
    return true;
}

bool DatabaseManager::getUserTasks(int userId, vector<Task>& outTasks) {
    outTasks.clear();

    if (!isConnected()) {
        setLastError("Database is not connected.");
        return false;
    }

    if (userId <= 0) {
        setLastError("Invalid user ID.");
        return false;
    }

    const char* query = "SELECT id, name, xp, completed, due_date FROM tasks WHERE user_id = ? ORDER BY id ASC";
    MYSQL_STMT* stmt = mysql_stmt_init(connection);
    if (!stmt) {
        setLastError("Failed to initialize MySQL statement.");
        return false;
    }

    if (mysql_stmt_prepare(stmt, query, static_cast<unsigned long>(strlen(query))) != 0) {
        setLastError(string("Failed to prepare task select statement: ") + mysql_stmt_error(stmt));
        mysql_stmt_close(stmt);
        return false;
    }

    MYSQL_BIND paramBind[1];
    memset(paramBind, 0, sizeof(paramBind));
    paramBind[0].buffer_type = MYSQL_TYPE_LONG;
    paramBind[0].buffer = &userId;

    if (mysql_stmt_bind_param(stmt, paramBind) != 0 || mysql_stmt_execute(stmt) != 0) {
        setLastError(string("Failed to execute task select statement: ") + mysql_stmt_error(stmt));
        mysql_stmt_close(stmt);
        return false;
    }

    int rId = 0, rXp = 0;
    char rCompleted = 0;
    char rName[256] = {0};
    unsigned long rNameLen = 0;
    char rDate[32] = {0};
    unsigned long rDateLen = 0;
    bool rDateNull = false;

    MYSQL_BIND resBind[5];
    memset(resBind, 0, sizeof(resBind));

    resBind[0].buffer_type = MYSQL_TYPE_LONG;
    resBind[0].buffer = &rId;

    resBind[1].buffer_type = MYSQL_TYPE_STRING;
    resBind[1].buffer = rName;
    resBind[1].buffer_length = sizeof(rName) - 1;
    resBind[1].length = &rNameLen;

    resBind[2].buffer_type = MYSQL_TYPE_LONG;
    resBind[2].buffer = &rXp;

    resBind[3].buffer_type = MYSQL_TYPE_TINY;
    resBind[3].buffer = &rCompleted;

    resBind[4].buffer_type = MYSQL_TYPE_STRING;
    resBind[4].buffer = rDate;
    resBind[4].buffer_length = sizeof(rDate) - 1;
    resBind[4].length = &rDateLen;
    resBind[4].is_null = &rDateNull;

    if (mysql_stmt_bind_result(stmt, resBind) != 0 || mysql_stmt_store_result(stmt) != 0) {
        setLastError(string("Failed to bind/store task query results: ") + mysql_stmt_error(stmt));
        mysql_stmt_close(stmt);
        return false;
    }

    while (mysql_stmt_fetch(stmt) == 0) {
        rName[rNameLen] = '\0';
        string parsedDueDate = "";
        if (!rDateNull && rDateLen > 0) {
            rDate[rDateLen] = '\0';
            parsedDueDate = string(rDate);
        }

        Task task(rId, string(rName), rXp, parsedDueDate);
        if (rCompleted) {
            task.markCompleted();
        }
        outTasks.push_back(task);
    }

    mysql_stmt_close(stmt);
    setLastError("");
    return true;
}

bool DatabaseManager::updateTask(int userId, const Task& task) {
    return updateTask(userId, task.get_id(), task.get_name(), task.get_xp(), task.get_due_date());
}

bool DatabaseManager::updateTask(int userId, int taskId, const string& newName, int newXP, const string& newDueDate) {
    if (!isConnected()) {
        setLastError("Database is not connected.");
        return false;
    }

    if (userId <= 0 || taskId <= 0) {
        setLastError("Invalid user ID or task ID.");
        return false;
    }

    if (newName.empty()) {
        setLastError("Task name cannot be empty.");
        return false;
    }

    const char* query = "UPDATE tasks SET name = ?, xp = ?, due_date = ? WHERE id = ? AND user_id = ?";
    MYSQL_STMT* stmt = mysql_stmt_init(connection);
    if (!stmt) {
        setLastError("Failed to initialize MySQL statement.");
        return false;
    }

    if (mysql_stmt_prepare(stmt, query, static_cast<unsigned long>(strlen(query))) != 0) {
        setLastError(string("Failed to prepare task update statement: ") + mysql_stmt_error(stmt));
        mysql_stmt_close(stmt);
        return false;
    }

    MYSQL_BIND bind[5];
    memset(bind, 0, sizeof(bind));

    // Param 0: name
    unsigned long nameLen = static_cast<unsigned long>(newName.length());
    bind[0].buffer_type = MYSQL_TYPE_STRING;
    bind[0].buffer = const_cast<char*>(newName.c_str());
    bind[0].buffer_length = nameLen;
    bind[0].length = &nameLen;

    // Param 1: xp
    bind[1].buffer_type = MYSQL_TYPE_LONG;
    bind[1].buffer = &newXP;

    // Param 2: due_date
    bool isDateNull = newDueDate.empty();
    unsigned long dateLen = static_cast<unsigned long>(newDueDate.length());
    if (isDateNull) {
        bind[2].buffer_type = MYSQL_TYPE_NULL;
        bind[2].is_null = &isDateNull;
    } else {
        bind[2].buffer_type = MYSQL_TYPE_STRING;
        bind[2].buffer = const_cast<char*>(newDueDate.c_str());
        bind[2].buffer_length = dateLen;
        bind[2].length = &dateLen;
        bind[2].is_null = &isDateNull;
    }

    // Param 3: task id
    bind[3].buffer_type = MYSQL_TYPE_LONG;
    bind[3].buffer = &taskId;

    // Param 4: user id (enforces ownership isolation)
    bind[4].buffer_type = MYSQL_TYPE_LONG;
    bind[4].buffer = &userId;

    if (mysql_stmt_bind_param(stmt, bind) != 0 || mysql_stmt_execute(stmt) != 0) {
        setLastError(string("Failed to execute task update: ") + mysql_stmt_error(stmt));
        mysql_stmt_close(stmt);
        return false;
    }

    my_ulonglong matchedRows = mysql_stmt_affected_rows(stmt);
    mysql_stmt_close(stmt);

    if (matchedRows == 0) {
        setLastError("Task not found or access denied.");
        return false;
    }

    setLastError("");
    return true;
}

bool DatabaseManager::deleteTask(int userId, int taskId) {
    if (!isConnected()) {
        setLastError("Database is not connected.");
        return false;
    }

    if (userId <= 0 || taskId <= 0) {
        setLastError("Invalid user ID or task ID.");
        return false;
    }

    const char* query = "DELETE FROM tasks WHERE id = ? AND user_id = ?";
    MYSQL_STMT* stmt = mysql_stmt_init(connection);
    if (!stmt) {
        setLastError("Failed to initialize MySQL statement.");
        return false;
    }

    if (mysql_stmt_prepare(stmt, query, static_cast<unsigned long>(strlen(query))) != 0) {
        setLastError(string("Failed to prepare task delete statement: ") + mysql_stmt_error(stmt));
        mysql_stmt_close(stmt);
        return false;
    }

    MYSQL_BIND bind[2];
    memset(bind, 0, sizeof(bind));

    bind[0].buffer_type = MYSQL_TYPE_LONG;
    bind[0].buffer = &taskId;

    bind[1].buffer_type = MYSQL_TYPE_LONG;
    bind[1].buffer = &userId;

    if (mysql_stmt_bind_param(stmt, bind) != 0 || mysql_stmt_execute(stmt) != 0) {
        setLastError(string("Failed to execute task delete: ") + mysql_stmt_error(stmt));
        mysql_stmt_close(stmt);
        return false;
    }

    my_ulonglong deletedRows = mysql_stmt_affected_rows(stmt);
    mysql_stmt_close(stmt);

    if (deletedRows == 0) {
        setLastError("Task not found or access denied.");
        return false;
    }

    setLastError("");
    return true;
}

bool DatabaseManager::setTaskCompleted(int userId, int taskId, bool completed) {
    if (!isConnected()) {
        setLastError("Database is not connected.");
        return false;
    }

    if (userId <= 0 || taskId <= 0) {
        setLastError("Invalid user ID or task ID.");
        return false;
    }

    const char* query = "UPDATE tasks SET completed = ? WHERE id = ? AND user_id = ?";
    MYSQL_STMT* stmt = mysql_stmt_init(connection);
    if (!stmt) {
        setLastError("Failed to initialize MySQL statement.");
        return false;
    }

    if (mysql_stmt_prepare(stmt, query, static_cast<unsigned long>(strlen(query))) != 0) {
        setLastError(string("Failed to prepare task completion update statement: ") + mysql_stmt_error(stmt));
        mysql_stmt_close(stmt);
        return false;
    }

    MYSQL_BIND bind[3];
    memset(bind, 0, sizeof(bind));

    char completedChar = completed ? 1 : 0;
    bind[0].buffer_type = MYSQL_TYPE_TINY;
    bind[0].buffer = &completedChar;

    bind[1].buffer_type = MYSQL_TYPE_LONG;
    bind[1].buffer = &taskId;

    bind[2].buffer_type = MYSQL_TYPE_LONG;
    bind[2].buffer = &userId;

    if (mysql_stmt_bind_param(stmt, bind) != 0 || mysql_stmt_execute(stmt) != 0) {
        setLastError(string("Failed to execute task completion update: ") + mysql_stmt_error(stmt));
        mysql_stmt_close(stmt);
        return false;
    }

    my_ulonglong matchedRows = mysql_stmt_affected_rows(stmt);
    mysql_stmt_close(stmt);

    if (matchedRows == 0) {
        setLastError("Task not found or access denied.");
        return false;
    }

    setLastError("");
    return true;
}

// -------------------------------------------------------------
// Player XP Operations
// -------------------------------------------------------------

bool DatabaseManager::getPlayerXP(int userId, int& outXP) {
    if (!isConnected()) {
        setLastError("Database is not connected.");
        return false;
    }

    const char* query = "SELECT total_xp FROM player_progress WHERE user_id = ?";
    MYSQL_STMT* stmt = mysql_stmt_init(connection);
    if (!stmt) {
        setLastError("Failed to initialize MySQL statement.");
        return false;
    }

    if (mysql_stmt_prepare(stmt, query, static_cast<unsigned long>(strlen(query))) != 0) {
        setLastError(string("Failed to prepare player XP statement: ") + mysql_stmt_error(stmt));
        mysql_stmt_close(stmt);
        return false;
    }

    MYSQL_BIND bind[1];
    memset(bind, 0, sizeof(bind));
    bind[0].buffer_type = MYSQL_TYPE_LONG;
    bind[0].buffer = &userId;

    if (mysql_stmt_bind_param(stmt, bind) != 0 || mysql_stmt_execute(stmt) != 0) {
        setLastError(string("Failed to execute player XP statement: ") + mysql_stmt_error(stmt));
        mysql_stmt_close(stmt);
        return false;
    }

    int xp = 0;
    MYSQL_BIND resBind[1];
    memset(resBind, 0, sizeof(resBind));
    resBind[0].buffer_type = MYSQL_TYPE_LONG;
    resBind[0].buffer = &xp;

    if (mysql_stmt_bind_result(stmt, resBind) != 0 || mysql_stmt_store_result(stmt) != 0) {
        setLastError(string("Failed to bind/store player XP result: ") + mysql_stmt_error(stmt));
        mysql_stmt_close(stmt);
        return false;
    }

    bool found = (mysql_stmt_fetch(stmt) == 0);
    mysql_stmt_close(stmt);

    if (found) {
        outXP = xp;
        setLastError("");
        return true;
    }

    setLastError("Player progress not found.");
    return false;
}

bool DatabaseManager::updatePlayerXP(int userId, int newXP) {
    if (!isConnected()) {
        setLastError("Database is not connected.");
        return false;
    }

    if (userId <= 0) {
        setLastError("Invalid user ID.");
        return false;
    }

    if (newXP < 0) {
        setLastError("XP value cannot be negative.");
        return false;
    }

    const char* query = "UPDATE player_progress SET total_xp = ? WHERE user_id = ?";
    MYSQL_STMT* stmt = mysql_stmt_init(connection);
    if (!stmt) {
        setLastError("Failed to initialize MySQL statement.");
        return false;
    }

    if (mysql_stmt_prepare(stmt, query, static_cast<unsigned long>(strlen(query))) != 0) {
        setLastError(string("Failed to prepare player XP update statement: ") + mysql_stmt_error(stmt));
        mysql_stmt_close(stmt);
        return false;
    }

    MYSQL_BIND bind[2];
    memset(bind, 0, sizeof(bind));

    bind[0].buffer_type = MYSQL_TYPE_LONG;
    bind[0].buffer = &newXP;

    bind[1].buffer_type = MYSQL_TYPE_LONG;
    bind[1].buffer = &userId;

    if (mysql_stmt_bind_param(stmt, bind) != 0 || mysql_stmt_execute(stmt) != 0) {
        setLastError(string("Failed to execute player XP update: ") + mysql_stmt_error(stmt));
        mysql_stmt_close(stmt);
        return false;
    }

    my_ulonglong matchedRows = mysql_stmt_affected_rows(stmt);
    mysql_stmt_close(stmt);

    if (matchedRows == 0) {
        setLastError("Player progress not found or access denied.");
        return false;
    }

    setLastError("");
    return true;
}

bool DatabaseManager::getPlayer(int userId, Player& outPlayer) {
    int xp = 0;
    if (!getPlayerXP(userId, xp)) {
        return false;
    }

    outPlayer = Player();
    outPlayer.addXP(xp);
    return true;
}

bool DatabaseManager::savePlayer(int userId, const Player& player) {
    return updatePlayerXP(userId, player.getTotalXP());
}

int DatabaseManager::getPlayerProgressCount(int userId) {
    if (!isConnected()) {
        return 0;
    }

    const char* query = "SELECT COUNT(*) FROM player_progress WHERE user_id = ?";
    MYSQL_STMT* stmt = mysql_stmt_init(connection);
    if (!stmt) return 0;

    if (mysql_stmt_prepare(stmt, query, static_cast<unsigned long>(strlen(query))) != 0) {
        mysql_stmt_close(stmt);
        return 0;
    }

    MYSQL_BIND bind[1];
    memset(bind, 0, sizeof(bind));
    bind[0].buffer_type = MYSQL_TYPE_LONG;
    bind[0].buffer = &userId;

    if (mysql_stmt_bind_param(stmt, bind) != 0 || mysql_stmt_execute(stmt) != 0) {
        mysql_stmt_close(stmt);
        return 0;
    }

    int count = 0;
    MYSQL_BIND resBind[1];
    memset(resBind, 0, sizeof(resBind));
    resBind[0].buffer_type = MYSQL_TYPE_LONG;
    resBind[0].buffer = &count;

    if (mysql_stmt_bind_result(stmt, resBind) != 0 || mysql_stmt_store_result(stmt) != 0) {
        mysql_stmt_close(stmt);
        return 0;
    }

    if (mysql_stmt_fetch(stmt) == 0) {
        mysql_stmt_close(stmt);
        return count;
    }

    mysql_stmt_close(stmt);
    return 0;
}
