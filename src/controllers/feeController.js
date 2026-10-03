"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeeController = void 0;
const feeModel_1 = require("../models/feeModel");
/**
 * FeeController exposes endpoint interfaces for managing fees tracker and payments.
 */
exports.FeeController = {
    /**
     * Get all general fee summaries registered.
     */
    async getAllFees(req, res) {
        try {
            const fees = await feeModel_1.FeeModel.findAll();
            res.json(fees);
        }
        catch (error) {
            console.error('Fetch fees summary error:', error);
            res.status(500).json({ error: 'Failed to fetch fees' });
        }
    },
    /**
     * Retrieve global transaction log of payments.
     */
    async getAllPayments(req, res) {
        try {
            const payments = await feeModel_1.FeeModel.getAllPayments();
            res.json(payments);
        }
        catch (error) {
            console.error('Fetch all payments error:', error);
            res.status(500).json({ error: 'Failed to fetch all payments' });
        }
    },
    /**
     * Delete a recorded payment from the database and adjust fee summaries.
     */
    async deletePayment(req, res) {
        try {
            const { paymentId } = req.params;
            const success = await feeModel_1.FeeModel.deletePayment(Number(paymentId));
            if (!success) {
                return res.status(404).json({ error: 'Payment not found' });
            }
            res.json({ message: 'Payment deleted successfully' });
        }
        catch (error) {
            console.error('Delete payment error:', error);
            res.status(500).json({ error: 'Failed to delete payment' });
        }
    },
    /**
     * Edit values of a registered fee transaction.
     */
    async updatePayment(req, res) {
        try {
            const { paymentId } = req.params;
            const { amount, remark, created_at } = req.body;
            if (!amount) {
                return res.status(400).json({ error: 'Amount is required' });
            }
            const success = await feeModel_1.FeeModel.updatePayment(Number(paymentId), Number(amount), remark || '', created_at);
            if (!success) {
                return res.status(404).json({ error: 'Payment not found' });
            }
            res.json({ message: 'Payment updated successfully' });
        }
        catch (error) {
            console.error('Update payment error:', error);
            res.status(500).json({ error: 'Failed to update payment' });
        }
    },
    /**
     * Retrieve transaction history lists filter-matched by admissionId.
     */
    async getFeePayments(req, res) {
        try {
            const { admissionId } = req.params;
            const payments = await feeModel_1.FeeModel.getPaymentsByAdmissionId(Number(admissionId));
            res.json(payments);
        }
        catch (error) {
            console.error('Fetch specific payments error:', error);
            res.status(500).json({ error: 'Failed to fetch payments' });
        }
    },
    /**
     * Create a payment record and update corresponding fee balance details.
     */
    async addPayment(req, res) {
        try {
            const { admission_id, amount, remark, created_at, next_payment_date } = req.body;
            if (!admission_id || !amount) {
                return res.status(400).json({ error: 'Admission ID and amount are required' });
            }
            const paymentId = await feeModel_1.FeeModel.addPayment(Number(admission_id), Number(amount), remark || '', created_at, next_payment_date);
            res.status(201).json({ message: 'Payment added successfully', paymentId });
        }
        catch (error) {
            console.error('Add payment error:', error);
            res.status(500).json({ error: 'Failed to add payment' });
        }
    },
    /**
     * Force-update overall payment status.
     */
    async updateFeeStatus(req, res) {
        try {
            const { admissionId } = req.params;
            const { status } = req.body;
            if (!status) {
                return res.status(400).json({ error: 'Status is required' });
            }
            await feeModel_1.FeeModel.updateStatus(Number(admissionId), status);
            res.json({ message: 'Fee status updated successfully' });
        }
        catch (error) {
            console.error('Update fee status error:', error);
            res.status(500).json({ error: 'Failed to update fee status' });
        }
    },
    /**
     * Reschedule the next reminder callback date for pending balance sheets.
     */
    async updateNextPaymentDate(req, res) {
        try {
            const { admissionId } = req.params;
            const { next_payment_date } = req.body;
            await feeModel_1.FeeModel.updateNextPaymentDate(Number(admissionId), next_payment_date || null);
            res.json({ message: 'Next payment date updated successfully' });
        }
        catch (error) {
            console.error('Update next payment date error:', error);
            res.status(500).json({ error: 'Failed to update next payment date' });
        }
    },
    /**
     * Erases general fee balance metadata tracking associated with this admission record.
     */
    async deleteFeeSummary(req, res) {
        try {
            const { admissionId } = req.params;
            await feeModel_1.FeeModel.deleteByAdmissionId(Number(admissionId));
            res.json({ message: 'Fee summary deleted successfully' });
        }
        catch (error) {
            console.error('Delete fee summary error:', error);
            res.status(500).json({ error: 'Failed to delete fee summary' });
        }
    }
};
