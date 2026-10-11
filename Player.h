#ifndef PLAYER_H
#define PLAYER_H

#include <string>
using namespace std;

class Player{
    private:
        int totalXP;
    public:
        Player();
        void addXP(int xp);
        void removeXP(int xp);
        int getTotalXP();
        int getLevel();
        string getLevelTitle(int level);
        int getLevelMinXP(int level);
        int getProgressPercentage();
        int getXPToNextLevel();
        void displayStatus();
        void saveToFile(string filename);
        void loadFromFile(string filename);
};

#endif

