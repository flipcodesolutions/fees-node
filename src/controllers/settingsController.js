"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsController = void 0;
const settingsModel_1 = require("../models/settingsModel");
/**
 * SettingsController handles HTTP requests for reading and writing configuration parameters.
 */
exports.SettingsController = {
    /**
     * Fetch all configuration settings in the database.
     */
    async getSettings(req, res) {
        try {
            const settings = await settingsModel_1.SettingsModel.getAll();
            res.json(settings);
        }
        catch (error) {
            console.error('Get settings error:', error);
            res.status(500).json({ error: 'Failed to fetch settings configurations' });
        }
    },
    /**
     * Save/Update a batch of configuration keys.
     */
    async updateSettings(req, res) {
        try {
            const payload = req.body;
            if (!payload || typeof payload !== 'object') {
                return res.status(400).json({ error: 'Invalid settings payload' });
            }
            // Save key-value entries into settings table
            await settingsModel_1.SettingsModel.saveAll(payload);
            res.json({ message: 'Settings saved successfully' });
        }
        catch (error) {
            console.error('Update settings error:', error);
            res.status(500).json({ error: 'Failed to save settings configurations' });
        }
    },
    /**
     * Clear all WhatsApp-specific configurations.
     */
    async resetSettings(req, res) {
        try {
            const whatsappKeys = [
                'whatsapp_token',
                'whatsapp_phone_number_id',
                'whatsapp_business_account_id',
                'whatsapp_api_url',
                'whatsapp_template_name'
            ];
            // Delete WhatsApp-specific keys sequentially
            for (const key of whatsappKeys) {
                await settingsModel_1.SettingsModel.delete(key);
            }
            res.json({ message: 'WhatsApp configurations cleared successfully' });
        }
        catch (error) {
            console.error('Reset settings error:', error);
            res.status(500).json({ error: 'Failed to clear settings configurations' });
        }
    }
};
