import { getDatabase } from '../config/database';

/**
 * SettingsModel handles CRUD operations for the general settings key-value table.
 * Isolates SQL calls from the rest of the application components.
 */
export const SettingsModel = {
    /**
     * Retrieve a configuration value by key.
     * @param key Config key name.
     */
    async get(key: string): Promise<string | undefined> {
        const db = await getDatabase();
        const row = await db.get('SELECT value FROM settings WHERE `key` = ?', [key]);
        return row?.value;
    },

    /**
     * Set/Replace a configuration value.
     * @param key Config key.
     * @param value Config value.
     */
    async set(key: string, value: string): Promise<any> {
        const db = await getDatabase();
        return db.run(
            'REPLACE INTO settings (`key`, value) VALUES (?, ?)',
            [key, value]
        );
    },

    /**
     * Remove a configuration key-value pair.
     * @param key Config key.
     */
    async delete(key: string): Promise<any> {
        const db = await getDatabase();
        return db.run('DELETE FROM settings WHERE `key` = ?', [key]);
    },

    /**
     * Retrieve all configurations as a key-value record object.
     */
    async getAll(): Promise<Record<string, string>> {
        const db = await getDatabase();
        const rows = await db.all('SELECT `key`, value FROM settings');
        const settings: Record<string, string> = {};
        for (const row of rows) {
            settings[row.key] = row.value;
        }
        return settings;
    },

    /**
     * Save multiple configurations at once.
     * @param settings Object containing key-value config pairs.
     */
    async saveAll(settings: Record<string, string>): Promise<void> {
        const db = await getDatabase();
        // Using a transaction to ensure all values write reliably together
        await db.run('BEGIN TRANSACTION');
        try {
            for (const [key, value] of Object.entries(settings)) {
                await db.run(
                    'REPLACE INTO settings (`key`, value) VALUES (?, ?)',
                    [key, value]
                );
            }
            await db.run('COMMIT');
        } catch (error) {
            await db.run('ROLLBACK');
            throw error;
        }
    }
};
