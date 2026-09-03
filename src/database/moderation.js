const db = require('./db');

const addCaseStmt = db.prepare(`
    INSERT INTO moderation_cases (guild_id, user_id, moderator_id, type, reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
`);

const getUserCasesStmt = db.prepare(`
    SELECT * FROM moderation_cases 
    WHERE guild_id = ? AND user_id = ? 
    ORDER BY created_at DESC
`);

const deleteCaseStmt = db.prepare('DELETE FROM moderation_cases WHERE id = ? AND guild_id = ?');
const clearUserCasesStmt = db.prepare('DELETE FROM moderation_cases WHERE guild_id = ? AND user_id = ?');
const countUserWarnsStmt = db.prepare(`
    SELECT COUNT(*) as count FROM moderation_cases 
    WHERE guild_id = ? AND user_id = ? AND type = 'WARN'
`);

module.exports = {
    addCase(guildId, userId, moderatorId, type, reason) {
        const info = addCaseStmt.run(guildId, userId, moderatorId, type, reason, Date.now());
        return info.lastInsertRowid;
    },

    getUserCases(guildId, userId) {
        return getUserCasesStmt.all(guildId, userId);
    },

    getWarnCount(guildId, userId) {
        const res = countUserWarnsStmt.get(guildId, userId);
        return res ? res.count : 0;
    },

    deleteCase(caseId, guildId) {
        const res = deleteCaseStmt.run(caseId, guildId);
        return res.changes > 0;
    },

    clearUserCases(guildId, userId) {
        const res = clearUserCasesStmt.run(guildId, userId);
        return res.changes > 0;
    }
};
