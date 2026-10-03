"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsModel = void 0;
const database_1 = require("../config/database");
/**
 * SettingsModel handles CRUD operations for the general settings key-value table.
 * Isolates SQL calls from the rest of the application components.
 */
exports.SettingsModel = {
    /**
     * Retrieve a configuration value by key.
     * @param key Config key name.
     */
    async get(key) {
        const db = await (0, database_1.getDatabase)();
        const row = await db.get('SELECT value FROM settings WHERE key = ?', [key]);
        return row?.value;
    },
    /**
     * Set/Replace a configuration value.
     * @param key Config key.
     * @param value Config value.
     */
    async set(key, value) {
        const db = await (0, database_1.getDatabase)();
        return db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
    },
    /**
     * Remove a configuration key-value pair.
     * @param key Config key.
     */
    async delete(key) {
        const db = await (0, database_1.getDatabase)();
        return db.run('DELETE FROM settings WHERE key = ?', [key]);
    },
    /**
     * Retrieve all configurations as a key-value record object.
     */
    async getAll() {
        const db = await (0, database_1.getDatabase)();
        const rows = await db.all('SELECT key, value FROM settings');
        const settings = {};
        for (const row of rows) {
            settings[row.key] = row.value;
        }
        return settings;
    },
    /**
     * Save multiple configurations at once.
     * @param settings Object containing key-value config pairs.
     */
    async saveAll(settings) {
        const db = await (0, database_1.getDatabase)();
        // Using a transaction to ensure all values write reliably together
        await db.run('BEGIN TRANSACTION');
        try {
            for (const [key, value] of Object.entries(settings)) {
                await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
            }
            await db.run('COMMIT');
        }
        catch (error) {
            await db.run('ROLLBACK');
            throw error;
        }
    }
};
