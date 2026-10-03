"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settingsController_1 = require("../controllers/settingsController");
const router = (0, express_1.Router)();
// Retrieve configuration parameters
router.get('/', settingsController_1.SettingsController.getSettings);
// Save/Update configuration parameters
router.post('/', settingsController_1.SettingsController.updateSettings);
// Clear WhatsApp configurations
router.delete('/', settingsController_1.SettingsController.resetSettings);
exports.default = router;
