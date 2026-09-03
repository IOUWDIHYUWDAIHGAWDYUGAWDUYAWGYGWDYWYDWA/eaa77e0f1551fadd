const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'vybot.sqlite'));
db.pragma('journal_mode = WAL');

// Tabloları Oluştur
db.exec(`
    CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id TEXT PRIMARY KEY,
        mod_log_channel TEXT DEFAULT NULL,
        welcome_channel TEXT DEFAULT NULL,
        welcome_message TEXT DEFAULT 'Sunucumuza hoş geldin {user}!',
        leave_channel TEXT DEFAULT NULL,
        autorole_id TEXT DEFAULT NULL,
        verify_role_id TEXT DEFAULT NULL,
        verify_channel_id TEXT DEFAULT NULL,
        anti_nuke INTEGER DEFAULT 1,
        anti_link INTEGER DEFAULT 1,
        anti_swear INTEGER DEFAULT 1,
        anti_spam INTEGER DEFAULT 1,
        level_system INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS user_levels (
        guild_id TEXT,
        user_id TEXT,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 0,
        last_xp_time INTEGER DEFAULT 0,
        PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS level_rewards (
        guild_id TEXT,
        level INTEGER,
        role_id TEXT,
        PRIMARY KEY (guild_id, level)
    );

    CREATE TABLE IF NOT EXISTS moderation_cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        user_id TEXT,
        moderator_id TEXT,
        type TEXT,
        reason TEXT,
        created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS user_economy (
        guild_id TEXT,
        user_id TEXT,
        wallet INTEGER DEFAULT 100,
        bank INTEGER DEFAULT 0,
        last_daily INTEGER DEFAULT 0,
        last_work INTEGER DEFAULT 0,
        PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        channel_id TEXT UNIQUE,
        user_id TEXT,
        status TEXT DEFAULT 'OPEN',
        created_at INTEGER,
        closed_at INTEGER DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS reaction_roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        message_id TEXT,
        role_id TEXT,
        label TEXT,
        emoji TEXT
    );

    CREATE TABLE IF NOT EXISTS giveaways (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        channel_id TEXT,
        message_id TEXT UNIQUE,
        prize TEXT,
        winners_count INTEGER DEFAULT 1,
        end_time INTEGER,
        host_id TEXT,
        ended INTEGER DEFAULT 0,
        entries TEXT DEFAULT '[]'
    );
`);

module.exports = db;
