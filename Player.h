#ifndef PLAYER_H
#define PLAYER_H

#include <string>

class Player{
    private:
        int totalXP;
    public:
        Player();
        void addXP(int xp);
        void removeXP(int xp);
        int getTotalXP() const;
        int getLevel() const;
        std::string getLevelTitle(int level) const;
        int getLevelMinXP(int level) const;
        int getProgressPercentage() const;
        int getXPToNextLevel() const;
        void displayStatus() const;
        void saveToFile(const std::string& filename) const;
        void loadFromFile(const std::string& filename);
};

#endif
