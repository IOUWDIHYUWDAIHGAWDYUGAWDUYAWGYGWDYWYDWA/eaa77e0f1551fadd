const db = require('./db');

const createTicketStmt = db.prepare(`
    INSERT INTO tickets (guild_id, channel_id, user_id, status, created_at)
    VALUES (?, ?, ?, 'OPEN', ?)
`);

const getTicketStmt = db.prepare('SELECT * FROM tickets WHERE channel_id = ?');
const getUserOpenTicketStmt = db.prepare("SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? AND status = 'OPEN'");
const closeTicketStmt = db.prepare("UPDATE tickets SET status = 'CLOSED', closed_at = ? WHERE channel_id = ?");

module.exports = {
    createTicket(guildId, channelId, userId) {
        createTicketStmt.run(guildId, channelId, userId, Date.now());
        return getTicketStmt.get(channelId);
    },

    getTicket(channelId) {
        return getTicketStmt.get(channelId);
    },

    getUserOpenTicket(guildId, userId) {
        return getUserOpenTicketStmt.get(guildId, userId);
    },

    closeTicket(channelId) {
        closeTicketStmt.run(Date.now(), channelId);
    }
};
