const db = require('./db');

const getUserStmt = db.prepare('SELECT * FROM user_economy WHERE guild_id = ? AND user_id = ?');
const initUserStmt = db.prepare('INSERT OR IGNORE INTO user_economy (guild_id, user_id) VALUES (?, ?)');
const updateBalanceStmt = db.prepare(`
    UPDATE user_economy 
    SET wallet = wallet + ?, bank = bank + ? 
    WHERE guild_id = ? AND user_id = ?
`);
const setDailyStmt = db.prepare('UPDATE user_economy SET last_daily = ?, wallet = wallet + ? WHERE guild_id = ? AND user_id = ?');
const setWorkStmt = db.prepare('UPDATE user_economy SET last_work = ?, wallet = wallet + ? WHERE guild_id = ? AND user_id = ?');

module.exports = {
    getUser(guildId, userId) {
        initUserStmt.run(guildId, userId);
        return getUserStmt.get(guildId, userId);
    },

    addWallet(guildId, userId, amount) {
        initUserStmt.run(guildId, userId);
        updateBalanceStmt.run(amount, 0, guildId, userId);
        return getUserStmt.get(guildId, userId);
    },

    addBank(guildId, userId, amount) {
        initUserStmt.run(guildId, userId);
        updateBalanceStmt.run(0, amount, guildId, userId);
        return getUserStmt.get(guildId, userId);
    },

    claimDaily(guildId, userId, rewardAmount) {
        initUserStmt.run(guildId, userId);
        const user = getUserStmt.get(guildId, userId);
        const cooldown = 24 * 60 * 60 * 1000;
        const now = Date.now();

        if (now - user.last_daily < cooldown) {
            const remaining = cooldown - (now - user.last_daily);
            return { success: false, remainingMs: remaining };
        }

        setDailyStmt.run(now, rewardAmount, guildId, userId);
        return { success: true, reward: rewardAmount, newBalance: user.wallet + rewardAmount };
    },

    claimWork(guildId, userId, rewardAmount) {
        initUserStmt.run(guildId, userId);
        const user = getUserStmt.get(guildId, userId);
        const cooldown = 60 * 60 * 1000; // 1 saat
        const now = Date.now();

        if (now - user.last_work < cooldown) {
            const remaining = cooldown - (now - user.last_work);
            return { success: false, remainingMs: remaining };
        }

        setWorkStmt.run(now, rewardAmount, guildId, userId);
        return { success: true, reward: rewardAmount, newBalance: user.wallet + rewardAmount };
    }
};
