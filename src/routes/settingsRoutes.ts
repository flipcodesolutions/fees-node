import { Router } from 'express';
import { SettingsController } from '../controllers/settingsController';

const router = Router();

// Retrieve configuration parameters
router.get('/', SettingsController.getSettings);

// Save/Update configuration parameters
router.post('/', SettingsController.updateSettings);

// Clear WhatsApp configurations
router.delete('/', SettingsController.resetSettings);

export default router;
