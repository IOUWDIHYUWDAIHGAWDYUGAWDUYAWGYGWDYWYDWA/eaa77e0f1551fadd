const db = require('./db');

const createGiveawayStmt = db.prepare(`
    INSERT INTO giveaways (guild_id, channel_id, message_id, prize, winners_count, end_time, host_id, ended, entries)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, '[]')
`);

const getGiveawayStmt = db.prepare('SELECT * FROM giveaways WHERE message_id = ?');
const getActiveGiveawaysStmt = db.prepare('SELECT * FROM giveaways WHERE ended = 0');
const updateEntriesStmt = db.prepare('UPDATE giveaways SET entries = ? WHERE message_id = ?');
const endGiveawayStmt = db.prepare('UPDATE giveaways SET ended = 1 WHERE message_id = ?');

module.exports = {
    createGiveaway(guildId, channelId, messageId, prize, winnersCount, endTime, hostId) {
        createGiveawayStmt.run(guildId, channelId, messageId, prize, winnersCount, endTime, hostId);
        return getGiveawayStmt.get(messageId);
    },

    getGiveaway(messageId) {
        const item = getGiveawayStmt.get(messageId);
        if (item) {
            item.entries = JSON.parse(item.entries || '[]');
        }
        return item;
    },

    getActiveGiveaways() {
        const items = getActiveGiveawaysStmt.all();
        return items.map(item => {
            item.entries = JSON.parse(item.entries || '[]');
            return item;
        });
    },

    toggleEntry(messageId, userId) {
        const item = this.getGiveaway(messageId);
        if (!item || item.ended) return null;

        const entries = item.entries;
        const index = entries.indexOf(userId);
        let joined = false;

        if (index > -1) {
            entries.splice(index, 1);
            joined = false;
        } else {
            entries.push(userId);
            joined = true;
        }

        updateEntriesStmt.run(JSON.stringify(entries), messageId);
        return { joined, count: entries.length };
    },

    endGiveaway(messageId) {
        endGiveawayStmt.run(messageId);
    }
};
