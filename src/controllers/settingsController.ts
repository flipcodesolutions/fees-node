import { Request, Response } from 'express';
import { SettingsModel } from '../models/settingsModel';

/**
 * SettingsController handles HTTP requests for reading and writing configuration parameters.
 */
export const SettingsController = {
    /**
     * Fetch all configuration settings in the database.
     */
    async getSettings(req: Request, res: Response) {
        try {
            const settings = await SettingsModel.getAll();
            res.json(settings);
        } catch (error) {
            console.error('Get settings error:', error);
            res.status(500).json({ error: 'Failed to fetch settings configurations' });
        }
    },

    /**
     * Save/Update a batch of configuration keys.
     */
    async updateSettings(req: Request, res: Response) {
        try {
            const payload = req.body;
            if (!payload || typeof payload !== 'object') {
                return res.status(400).json({ error: 'Invalid settings payload' });
            }

            // Save key-value entries into settings table
            await SettingsModel.saveAll(payload);
            res.json({ message: 'Settings saved successfully' });
        } catch (error) {
            console.error('Update settings error:', error);
            res.status(500).json({ error: 'Failed to save settings configurations' });
        }
    },

    /**
     * Clear all WhatsApp-specific configurations.
     */
    async resetSettings(req: Request, res: Response) {
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
                await SettingsModel.delete(key);
            }

            res.json({ message: 'WhatsApp configurations cleared successfully' });
        } catch (error) {
            console.error('Reset settings error:', error);
            res.status(500).json({ error: 'Failed to clear settings configurations' });
        }
    }
};
