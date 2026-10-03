"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeeModel = void 0;
const database_1 = require("../config/database");
/**
 * Helper utility to determine and normalize status based on payment details.
 * - 'Deleted' status is preserved.
 * - Remaining amount <= 0 resolves to 'Complete'.
 * - Paid amount > 0 resolves to 'Half Complete'.
 * - Otherwise remains 'Pending'.
 */
const normalizeFeeStatus = (fee) => {
    if (fee.status === 'Deleted')
        return fee;
    if (fee.remaining_amount <= 0) {
        return { ...fee, status: 'Complete' };
    }
    if (fee.paid_amount > 0) {
        return { ...fee, status: 'Half Complete' };
    }
    return { ...fee, status: 'Pending' };
};
/**
 * FeeModel manages operations for tracking overall student fees and individual transaction logs.
 */
exports.FeeModel = {
    /**
     * Retrieve all fee summaries with student details.
     */
    async findAll() {
        const db = await (0, database_1.getDatabase)();
        const rows = await db.all(`
            SELECT f.*, a.student_name, a.mobile, a.inquiry_for, a.payload_json 
            FROM fees f
            JOIN admissions a ON f.admission_id = a.id
            ORDER BY f.updated_at DESC
        `);
        return rows.map(normalizeFeeStatus);
    },
    /**
     * Fetch a specific fee summary by admission ID.
     */
    async findByAdmissionId(admissionId) {
        const db = await (0, database_1.getDatabase)();
        return db.get('SELECT * FROM fees WHERE admission_id = ?', [admissionId]);
    },
    /**
     * Fetch all payment transactions logged for a specific admission.
     */
    async getPaymentsByAdmissionId(admissionId) {
        const db = await (0, database_1.getDatabase)();
        return db.all('SELECT * FROM fee_payments WHERE admission_id = ? ORDER BY created_at DESC', [admissionId]);
    },
    /**
     * Retrieve all payment history records recorded across the entire system.
     */
    async getAllPayments() {
        const db = await (0, database_1.getDatabase)();
        return db.all(`
            SELECT p.*, 
                   COALESCE(p.next_payment_date, f.next_payment_date) AS next_payment_date,
                   f.total_amount, f.paid_amount, f.remaining_amount, f.status, 
                   a.student_name, a.mobile, a.inquiry_for, a.payload_json
            FROM fee_payments p
            JOIN fees f ON p.admission_id = f.admission_id
            JOIN admissions a ON p.admission_id = a.id
            WHERE f.status != 'Deleted'
            ORDER BY p.id DESC
        `);
    },
    /**
     * Delete an individual payment record.
     * Recalculates total paid/remaining amounts on the corresponding fee summary.
     * @param paymentId The payment record ID.
     */
    async deletePayment(paymentId) {
        const db = await (0, database_1.getDatabase)();
        const payment = await db.get('SELECT * FROM fee_payments WHERE id = ?', [paymentId]);
        if (!payment)
            return false;
        // Delete transaction from ledger
        await db.run('DELETE FROM fee_payments WHERE id = ?', [paymentId]);
        // Recalculate and update the overall fee summary by subtracting deleted amount
        const fee = await this.findByAdmissionId(payment.admission_id);
        if (fee) {
            const newPaidAmount = fee.paid_amount - payment.amount;
            const newRemaining = fee.total_amount - newPaidAmount;
            let status = 'Pending';
            if (newPaidAmount > 0) {
                status = newRemaining <= 0 ? 'Complete' : 'Half Complete';
            }
            await db.run(`UPDATE fees 
                 SET paid_amount = ?, remaining_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE admission_id = ?`, [newPaidAmount, newRemaining, status, payment.admission_id]);
        }
        return true;
    },
    /**
     * Update an individual payment transaction.
     * Computes the numeric difference (delta) and updates the fee summary table.
     * @param paymentId Unique payment ID.
     * @param amount New transaction amount.
     * @param remark Log details.
     * @param createdAt Custom timestamp if specified.
     */
    async updatePayment(paymentId, amount, remark, createdAt) {
        const db = await (0, database_1.getDatabase)();
        const existingPayment = await db.get('SELECT * FROM fee_payments WHERE id = ?', [paymentId]);
        if (!existingPayment)
            return false;
        const oldAmount = existingPayment.amount;
        // Update payment ledger log
        if (createdAt) {
            await db.run(`UPDATE fee_payments 
                 SET amount = ?, remark = ?, created_at = ?, payment_date = ? 
                 WHERE id = ?`, [amount, remark, createdAt, createdAt, paymentId]);
        }
        else {
            await db.run('UPDATE fee_payments SET amount = ?, remark = ? WHERE id = ?', [amount, remark, paymentId]);
        }
        // Update fee summary adjustments using the delta difference (new amount minus old amount)
        const fee = await this.findByAdmissionId(existingPayment.admission_id);
        if (fee) {
            const difference = amount - oldAmount;
            const newPaidAmount = fee.paid_amount + difference;
            const newRemaining = fee.total_amount - newPaidAmount;
            let status = 'Pending';
            if (newPaidAmount > 0) {
                status = newRemaining <= 0 ? 'Complete' : 'Half Complete';
            }
            await db.run(`UPDATE fees 
                 SET paid_amount = ?, remaining_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE admission_id = ?`, [newPaidAmount, newRemaining, status, existingPayment.admission_id]);
        }
        return true;
    },
    /**
     * Manually override fee payment status.
     */
    async updateStatus(admissionId, status) {
        const db = await (0, database_1.getDatabase)();
        await db.run('UPDATE fees SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE admission_id = ?', [status, admissionId]);
    },
    /**
     * Set next scheduled reminder payment date.
     */
    async updateNextPaymentDate(admissionId, nextDate) {
        const db = await (0, database_1.getDatabase)();
        await db.run('UPDATE fees SET next_payment_date = ?, updated_at = CURRENT_TIMESTAMP WHERE admission_id = ?', [nextDate, admissionId]);
    },
    /**
     * Create or update the fee summary ledger when course selection is altered.
     * @param admissionId Unique student ID.
     * @param totalAmount Calculated course cost.
     */
    async upsertFeeSummary(admissionId, totalAmount) {
        const db = await (0, database_1.getDatabase)();
        const existing = await this.findByAdmissionId(admissionId);
        if (existing) {
            const remaining = totalAmount - existing.paid_amount;
            let status = 'Pending';
            if (existing.paid_amount > 0) {
                status = remaining <= 0 ? 'Complete' : 'Half Complete';
            }
            return db.run(`UPDATE fees 
                 SET total_amount = ?, remaining_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE admission_id = ?`, [totalAmount, remaining, status, admissionId]);
        }
        else {
            return db.run('INSERT INTO fees (admission_id, total_amount, paid_amount, remaining_amount, status) VALUES (?, ?, ?, ?, ?)', [admissionId, totalAmount, 0, totalAmount, 'Pending']);
        }
    },
    /**
     * Record a new fee payment.
     * Increments the overall paid fees count and modifies remaining balance status automatically.
     */
    async addPayment(admissionId, amount, remark, createdAt, nextPaymentDate) {
        const db = await (0, database_1.getDatabase)();
        let result;
        if (createdAt) {
            result = await db.run('INSERT INTO fee_payments (admission_id, amount, remark, created_at, payment_date, next_payment_date) VALUES (?, ?, ?, ?, ?, ?)', [admissionId, amount, remark, createdAt, createdAt, nextPaymentDate || null]);
        }
        else {
            result = await db.run('INSERT INTO fee_payments (admission_id, amount, remark, next_payment_date) VALUES (?, ?, ?, ?)', [admissionId, amount, remark, nextPaymentDate || null]);
        }
        const paymentId = result.lastID;
        // Fetch current summary and apply adjustments
        const fee = await this.findByAdmissionId(admissionId);
        if (fee) {
            const newPaidAmount = fee.paid_amount + amount;
            const newRemaining = fee.total_amount - newPaidAmount;
            let status = 'Pending';
            if (newPaidAmount > 0) {
                status = newRemaining <= 0 ? 'Complete' : 'Half Complete';
            }
            // If fully paid, delete any upcoming next payment dates
            const nextDate = newRemaining <= 0 ? null : (nextPaymentDate || null);
            await db.run(`UPDATE fees 
                 SET paid_amount = ?, remaining_amount = ?, status = ?, next_payment_date = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE admission_id = ?`, [newPaidAmount, newRemaining, status, nextDate, admissionId]);
        }
        return paymentId;
    },
    /**
     * Deletes fee tracking and transactions associated with an admission.
     */
    async deleteByAdmissionId(admissionId) {
        const db = await (0, database_1.getDatabase)();
        await db.run('DELETE FROM fee_payments WHERE admission_id = ?', [admissionId]);
        return db.run('DELETE FROM fees WHERE admission_id = ?', [admissionId]);
    },
    /**
     * Fetch individual payment details by unique key.
     */
    async getPaymentById(id) {
        const db = await (0, database_1.getDatabase)();
        return db.get('SELECT * FROM fee_payments WHERE id = ?', [id]);
    }
};
