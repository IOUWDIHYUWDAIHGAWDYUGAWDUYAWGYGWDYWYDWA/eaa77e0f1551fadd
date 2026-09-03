const db = require('./db');

const getSettingsStmt = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?');
const initSettingsStmt = db.prepare(`
    INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)
`);

const updateSettingsStmt = db.prepare(`
    UPDATE guild_settings SET
        mod_log_channel = COALESCE(@mod_log_channel, mod_log_channel),
        welcome_channel = COALESCE(@welcome_channel, welcome_channel),
        welcome_message = COALESCE(@welcome_message, welcome_message),
        leave_channel = COALESCE(@leave_channel, leave_channel),
        autorole_id = COALESCE(@autorole_id, autorole_id),
        verify_role_id = COALESCE(@verify_role_id, verify_role_id),
        verify_channel_id = COALESCE(@verify_channel_id, verify_channel_id),
        anti_nuke = COALESCE(@anti_nuke, anti_nuke),
        anti_link = COALESCE(@anti_link, anti_link),
        anti_swear = COALESCE(@anti_swear, anti_swear),
        anti_spam = COALESCE(@anti_spam, anti_spam),
        level_system = COALESCE(@level_system, level_system)
    WHERE guild_id = @guild_id
`);

module.exports = {
    getSettings(guildId) {
        initSettingsStmt.run(guildId);
        return getSettingsStmt.get(guildId);
    },

    updateSettings(guildId, settings) {
        initSettingsStmt.run(guildId);
        const current = getSettingsStmt.get(guildId);
        const merged = {
            guild_id: guildId,
            mod_log_channel: settings.mod_log_channel !== undefined ? settings.mod_log_channel : current.mod_log_channel,
            welcome_channel: settings.welcome_channel !== undefined ? settings.welcome_channel : current.welcome_channel,
            welcome_message: settings.welcome_message !== undefined ? settings.welcome_message : current.welcome_message,
            leave_channel: settings.leave_channel !== undefined ? settings.leave_channel : current.leave_channel,
            autorole_id: settings.autorole_id !== undefined ? settings.autorole_id : current.autorole_id,
            verify_role_id: settings.verify_role_id !== undefined ? settings.verify_role_id : current.verify_role_id,
            verify_channel_id: settings.verify_channel_id !== undefined ? settings.verify_channel_id : current.verify_channel_id,
            anti_nuke: settings.anti_nuke !== undefined ? settings.anti_nuke : current.anti_nuke,
            anti_link: settings.anti_link !== undefined ? settings.anti_link : current.anti_link,
            anti_swear: settings.anti_swear !== undefined ? settings.anti_swear : current.anti_swear,
            anti_spam: settings.anti_spam !== undefined ? settings.anti_spam : current.anti_spam,
            level_system: settings.level_system !== undefined ? settings.level_system : current.level_system
        };
        updateSettingsStmt.run(merged);
        return merged;
    }
};
