import { Router } from 'express';
import { WhatsAppController } from '../controllers/whatsappController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Webhook routes (no protection as they are called by Meta)
router.get('/webhook', WhatsAppController.verifyWebhook);
router.post('/webhook', WhatsAppController.handleWebhook);

// Protected routes for testing/utility
router.post('/test-template', protect, WhatsAppController.testTemplate);
router.post('/send-reminder', protect, WhatsAppController.sendReminder);
router.post('/send-receipt', protect, WhatsAppController.sendSpecificReceipt);

export default router;
