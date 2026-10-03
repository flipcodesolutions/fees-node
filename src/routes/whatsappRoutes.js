"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const whatsappController_1 = require("../controllers/whatsappController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Webhook routes (no protection as they are called by Meta)
router.get('/webhook', whatsappController_1.WhatsAppController.verifyWebhook);
router.post('/webhook', whatsappController_1.WhatsAppController.handleWebhook);
// Protected routes for testing/utility
router.post('/test-template', authMiddleware_1.protect, whatsappController_1.WhatsAppController.testTemplate);
router.post('/send-reminder', authMiddleware_1.protect, whatsappController_1.WhatsAppController.sendReminder);
router.post('/send-receipt', authMiddleware_1.protect, whatsappController_1.WhatsAppController.sendSpecificReceipt);
exports.default = router;
