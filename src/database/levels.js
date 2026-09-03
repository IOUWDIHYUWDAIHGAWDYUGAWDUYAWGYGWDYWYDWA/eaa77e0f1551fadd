const db = require('./db');

const getUserStmt = db.prepare('SELECT * FROM user_levels WHERE guild_id = ? AND user_id = ?');
const initUserStmt = db.prepare('INSERT OR IGNORE INTO user_levels (guild_id, user_id) VALUES (?, ?)');
const updateXpStmt = db.prepare(`
    UPDATE user_levels 
    SET xp = ?, level = ?, last_xp_time = ? 
    WHERE guild_id = ? AND user_id = ?
`);

const leaderboardStmt = db.prepare(`
    SELECT user_id, xp, level,
           RANK() OVER (ORDER BY level DESC, xp DESC) as rank
    FROM user_levels 
    WHERE guild_id = ? 
    ORDER BY level DESC, xp DESC 
    LIMIT ?
`);

const userRankStmt = db.prepare(`
    WITH ranked_users AS (
        SELECT user_id, xp, level,
               RANK() OVER (ORDER BY level DESC, xp DESC) as rank
        FROM user_levels
        WHERE guild_id = ?
    )
    SELECT * FROM ranked_users WHERE user_id = ?
`);

const getRewardsStmt = db.prepare('SELECT * FROM level_rewards WHERE guild_id = ? ORDER BY level ASC');
const addRewardStmt = db.prepare(`
    INSERT INTO level_rewards (guild_id, level, role_id) 
    VALUES (?, ?, ?)
    ON CONFLICT(guild_id, level) DO UPDATE SET role_id = excluded.role_id
`);
const removeRewardStmt = db.prepare('DELETE FROM level_rewards WHERE guild_id = ? AND level = ?');

function xpForNextLevel(currentLevel) {
    return 5 * Math.pow(currentLevel, 2) + 50 * currentLevel + 100;
}

module.exports = {
    xpForNextLevel,

    getUser(guildId, userId) {
        initUserStmt.run(guildId, userId);
        return getUserStmt.get(guildId, userId);
    },

    getUserRank(guildId, userId) {
        initUserStmt.run(guildId, userId);
        const rankData = userRankStmt.get(guildId, userId);
        if (!rankData) {
            return { user_id: userId, xp: 0, level: 0, rank: 'N/A' };
        }
        return rankData;
    },

    addXp(guildId, userId, amount) {
        initUserStmt.run(guildId, userId);
        const user = getUserStmt.get(guildId, userId);
        let newXp = user.xp + amount;
        let newLevel = user.level;
        let leveledUp = false;

        let requiredXp = xpForNextLevel(newLevel);
        while (newXp >= requiredXp) {
            newXp -= requiredXp;
            newLevel++;
            leveledUp = true;
            requiredXp = xpForNextLevel(newLevel);
        }

        const now = Date.now();
        updateXpStmt.run(newXp, newLevel, now, guildId, userId);

        return {
            leveledUp,
            oldLevel: user.level,
            newLevel,
            currentXp: newXp,
            requiredXp
        };
    },

    getLeaderboard(guildId, limit = 10) {
        return leaderboardStmt.all(guildId, limit);
    },

    getRewards(guildId) {
        return getRewardsStmt.all(guildId);
    },

    setReward(guildId, level, roleId) {
        addRewardStmt.run(guildId, level, roleId);
    },

    removeReward(guildId, level) {
        removeRewardStmt.run(guildId, level);
    }
};
