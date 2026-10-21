#include "Player.h"
#include <limits>
#include <iostream>
#include <fstream>
using namespace std;

static const int MAX_LEVEL = 20;

static const int LEVEL_XP[MAX_LEVEL] = {
    0,      // Level 1
    100,    // Level 2
    225,    // Level 3
    375,    // Level 4
    550,    // Level 5
    750,    // Level 6
    975,    // Level 7
    1225,   // Level 8
    1500,   // Level 9
    1800,   // Level 10
    2125,   // Level 11
    2475,   // Level 12
    2850,   // Level 13
    3250,   // Level 14
    3675,   // Level 15
    4125,   // Level 16
    4600,   // Level 17
    5100,   // Level 18
    5625,   // Level 19
    6175    // Level 20
};

static const string LEVEL_TITLES[MAX_LEVEL] = {
    "Beginner",             // Level 1
    "Starter",              // Level 2
    "Learner",              // Level 3
    "Builder",              // Level 4
    "Achiever",             // Level 5
    "Focused",              // Level 6
    "Consistent",           // Level 7
    "Dedicated",            // Level 8
    "Skilled",              // Level 9
    "Pro",                  // Level 10
    "Advanced",             // Level 11
    "Expert",               // Level 12
    "Specialist",           // Level 13
    "Champion",             // Level 14
    "Elite",                // Level 15
    "Master",               // Level 16
    "Grandmaster",          // Level 17
    "Legend",               // Level 18
    "Icon",                 // Level 19
    "Life Upgrade Legend"   // Level 20
};

Player::Player(){
    totalXP = 0;
}

void Player::addXP(int xp){
    if(xp <= 0){
        return;
    }
    if(xp > numeric_limits<int>::max() - totalXP){
        cout<<"XP total would exceed the supported limit. "<<"No XP added."<<endl;
        return;
    }
    int oldLevel = getLevel();
    totalXP += xp;
    int newLevel = getLevel();

    cout << "+" << xp << " XP earned! (Total XP: " << totalXP << ")" << endl;
    if(newLevel > oldLevel){
        cout << "*** LEVEL UP! You are now Level " << newLevel
             << " - " << getLevelTitle(newLevel) << "! ***" << endl;
    }
}

void Player::removeXP(int xp){
    if(xp <= 0){
        return;
    }
    int oldLevel = getLevel();
    totalXP -= xp;
    if(totalXP < 0){
        totalXP = 0;
    }
    int newLevel = getLevel();
    cout << "-" << xp << " XP removed! (Total XP: " << totalXP << ")" << endl;
    if(newLevel < oldLevel){
        cout << "Level dropped to Level " << newLevel
             << " - " << getLevelTitle(newLevel) << "." << endl;
    }
}

int Player::getTotalXP(){
    return totalXP;
}

int Player::getLevel(){
    int currentLevel = 1;
    for(int i = 0; i < MAX_LEVEL; i++){
        if(totalXP >= LEVEL_XP[i]){
            currentLevel = i + 1;
        }
        else{
            break;
        }
    }
    return currentLevel;
}

string Player::getLevelTitle(int level){
    if(level < 1){
        level = 1;
    }
    if(level > MAX_LEVEL){
        level = MAX_LEVEL;
    }
    return LEVEL_TITLES[level - 1];
}

int Player::getLevelMinXP(int level){
    if(level < 1){
        level = 1;
    }
    if(level > MAX_LEVEL){
        level = MAX_LEVEL;
    }
    return LEVEL_XP[level - 1];
}

int Player::getProgressPercentage(){
    int level = getLevel();
    if(level >= MAX_LEVEL){
        return 100;
    }
    int currentMin = getLevelMinXP(level);
    int nextMin = getLevelMinXP(level + 1);
    int span = nextMin - currentMin;
    if(span <= 0){
        return 100;
    }
    return ((totalXP - currentMin) * 100) / span;
}

int Player::getXPToNextLevel(){
    int level = getLevel();
    if(level >= MAX_LEVEL){
        return 0;
    }
    return getLevelMinXP(level + 1) - totalXP;
}

void Player::displayStatus(){
    int level = getLevel();
    int progress = getProgressPercentage();
    int barWidth = 20;
    int filled = (progress * barWidth) / 100;

    cout << "Level " << level << " - " << getLevelTitle(level)
         << " | " << totalXP << " total XP" << endl;

    cout << "[";
    for(int i = 0; i < barWidth; i++){
        if(i < filled) cout << "#";
        else cout << "-";
    }
    cout << "] " << progress << "%";

    if(level < MAX_LEVEL){
        cout << " | Next: Level " << (level + 1) << " (" << getLevelTitle(level + 1) << ") ("
             << getXPToNextLevel() << " XP needed)" << endl;
    }
    else{
        cout << " | MAX LEVEL REACHED!" << endl;
    }
}

void Player::saveToFile(string filename){
    ofstream outFile(filename);
    if(!outFile){
        return;
    }
    outFile << totalXP << endl;
    outFile.close();
}

void Player::loadFromFile(string filename){
    ifstream inFile(filename);
    if(!inFile){
        return;
    }
    int savedXP;
    if(inFile >> savedXP){
        if(savedXP >= 0){
            totalXP = savedXP;
        }
    }
    inFile.close();
}

