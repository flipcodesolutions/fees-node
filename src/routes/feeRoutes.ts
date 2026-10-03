import { Router } from 'express';
import { FeeController } from '../controllers/feeController';

const router = Router();

router.get('/', FeeController.getAllFees);
router.get('/all-payments', FeeController.getAllPayments);
router.get('/:admissionId/payments', FeeController.getFeePayments);
router.post('/pay', FeeController.addPayment);
router.put('/payment/:paymentId', FeeController.updatePayment);
router.delete('/payment/:paymentId', FeeController.deletePayment);
router.put('/:admissionId/status', FeeController.updateFeeStatus);
router.put('/:admissionId/next-payment-date', FeeController.updateNextPaymentDate);
router.delete('/:admissionId', FeeController.deleteFeeSummary);

export default router;
