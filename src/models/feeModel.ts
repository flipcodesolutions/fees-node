import { getDatabase } from '../config/database';

export interface FeeSummary {
    id?: number;
    admission_id: number;
    total_amount: number;
    paid_amount: number;
    remaining_amount: number;
    status: string;
    next_payment_date?: string | null;
    updated_at?: string;
    student_name?: string;
    mobile?: string;
    payload_json?: string;
}

export interface FeePayment {
    id?: number;
    admission_id: number;
    amount: number;
    payment_date: string;
    remark: string;
    next_payment_date?: string | null;
    created_at?: string;
}

/**
 * Helper utility to determine and normalize status based on payment details.
 * - 'Deleted' status is preserved.
 * - Remaining amount <= 0 resolves to 'Complete'.
 * - Paid amount > 0 resolves to 'Half Complete'.
 * - Otherwise remains 'Pending'.
 */
const normalizeFeeStatus = (fee: any): FeeSummary => {
    const total_amount = Number(fee.total_amount || 0);
    const paid_amount = Number(fee.paid_amount || 0);
    const remaining_amount = Math.max(0, total_amount - paid_amount);
    if (fee.status === 'Deleted') {
        return { ...fee, total_amount, paid_amount, remaining_amount };
    }
    if (remaining_amount <= 0) {
        return { ...fee, total_amount, paid_amount, remaining_amount, status: 'Complete' };
    }
    if (paid_amount > 0) {
        return { ...fee, total_amount, paid_amount, remaining_amount, status: 'Half Complete' };
    }
    return { ...fee, total_amount, paid_amount, remaining_amount, status: 'Pending' };
};

/**
 * FeeModel manages operations for tracking overall student fees and individual transaction logs.
 */
export const FeeModel = {
    /**
     * Retrieve all fee summaries with student details.
     * paid_amount and remaining_amount are dynamically calculated from fee_payments.
     */
    async findAll(): Promise<FeeSummary[]> {
        const db = await getDatabase();
        const rows = await db.all(`
            SELECT 
                f.id,
                f.admission_id,
                f.total_amount,
                COALESCE(p.paid_amount, 0) AS paid_amount,
                GREATEST(0, CAST(f.total_amount AS DECIMAL(12,2)) - COALESCE(p.paid_amount, 0)) AS remaining_amount,
                f.status,
                f.next_payment_date,
                f.updated_at,
                a.student_name,
                a.mobile,
                a.inquiry_for,
                a.payload_json 
            FROM fees f
            JOIN admissions a ON f.admission_id = a.id
            LEFT JOIN (
                SELECT admission_id, SUM(amount) AS paid_amount
                FROM fee_payments
                GROUP BY admission_id
            ) p ON f.admission_id = p.admission_id
            ORDER BY f.updated_at DESC
        `);
        return rows.map(normalizeFeeStatus);
    },

    /**
     * Fetch a specific fee summary by admission ID.
     */
    async findByAdmissionId(admissionId: number): Promise<FeeSummary | undefined> {
        const db = await getDatabase();
        const row = await db.get(`
            SELECT 
                f.id,
                f.admission_id,
                f.total_amount,
                COALESCE(p.paid_amount, 0) AS paid_amount,
                GREATEST(0, CAST(f.total_amount AS DECIMAL(12,2)) - COALESCE(p.paid_amount, 0)) AS remaining_amount,
                f.status,
                f.next_payment_date,
                f.updated_at
            FROM fees f
            LEFT JOIN (
                SELECT admission_id, SUM(amount) AS paid_amount
                FROM fee_payments
                WHERE admission_id = ?
                GROUP BY admission_id
            ) p ON f.admission_id = p.admission_id
            WHERE f.admission_id = ?
        `, [admissionId, admissionId]);
        return row ? normalizeFeeStatus(row) : undefined;
    },

    /**
     * Fetch all payment transactions logged for a specific admission.
     */
    async getPaymentsByAdmissionId(admissionId: number): Promise<FeePayment[]> {
        const db = await getDatabase();
        return db.all('SELECT * FROM fee_payments WHERE admission_id = ? ORDER BY created_at DESC', [admissionId]);
    },

    /**
     * Retrieve all payment history records recorded across the entire system.
     */
    async getAllPayments(): Promise<any[]> {
        const db = await getDatabase();
        const rows = await db.all(`
            SELECT p.*, 
                   COALESCE(p.next_payment_date, f.next_payment_date) AS next_payment_date,
                   f.total_amount,
                   COALESCE(tot.paid_amount, 0) AS paid_amount,
                   GREATEST(0, CAST(f.total_amount AS DECIMAL(12,2)) - COALESCE(tot.paid_amount, 0)) AS remaining_amount,
                   f.status, 
                   a.student_name, a.mobile, a.inquiry_for, a.payload_json
            FROM fee_payments p
            JOIN fees f ON p.admission_id = f.admission_id
            JOIN admissions a ON p.admission_id = a.id
            LEFT JOIN (
                SELECT admission_id, SUM(amount) AS paid_amount
                FROM fee_payments
                GROUP BY admission_id
            ) tot ON f.admission_id = tot.admission_id
            WHERE f.status != 'Deleted'
            ORDER BY p.id DESC
        `);
        return rows.map(normalizeFeeStatus);
    },

    /**
     * Delete an individual payment record.
     * @param paymentId The payment record ID.
     */
    async deletePayment(paymentId: number): Promise<boolean> {
        const db = await getDatabase();
        const payment = await db.get('SELECT * FROM fee_payments WHERE id = ?', [paymentId]);
        if (!payment) return false;

        // Delete transaction from ledger
        await db.run('DELETE FROM fee_payments WHERE id = ?', [paymentId]);

        // Touch updated_at on fees summary
        await db.run('UPDATE fees SET updated_at = CURRENT_TIMESTAMP WHERE admission_id = ?', [payment.admission_id]);
        return true;
    },

    /**
     * Update an individual payment transaction.
     * @param paymentId Unique payment ID.
     * @param amount New transaction amount.
     * @param remark Log details.
     * @param createdAt Custom timestamp if specified.
     */
    async updatePayment(paymentId: number, amount: number, remark: string, createdAt?: string): Promise<boolean> {
        const db = await getDatabase();
        const existingPayment = await db.get('SELECT * FROM fee_payments WHERE id = ?', [paymentId]);
        if (!existingPayment) return false;

        // Update payment ledger log
        if (createdAt) {
            await db.run(
                `UPDATE fee_payments 
                 SET amount = ?, remark = ?, created_at = ?, payment_date = ? 
                 WHERE id = ?`,
                [amount, remark, createdAt, createdAt, paymentId]
            );
        } else {
            await db.run('UPDATE fee_payments SET amount = ?, remark = ? WHERE id = ?', [amount, remark, paymentId]);
        }

        // Touch updated_at on fees summary
        await db.run('UPDATE fees SET updated_at = CURRENT_TIMESTAMP WHERE admission_id = ?', [existingPayment.admission_id]);
        return true;
    },

    /**
     * Manually override fee payment status.
     */
    async updateStatus(admissionId: number, status: string): Promise<any> {
        const db = await getDatabase();
        await db.run(
            'UPDATE fees SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE admission_id = ?',
            [status, admissionId]
        );
    },

    /**
     * Set next scheduled reminder payment date.
     */
    async updateNextPaymentDate(admissionId: number, nextDate: string | null): Promise<any> {
        const db = await getDatabase();
        await db.run(
            'UPDATE fees SET next_payment_date = ?, updated_at = CURRENT_TIMESTAMP WHERE admission_id = ?',
            [nextDate, admissionId]
        );
    },

    /**
     * Create or update the fee summary ledger when course selection is altered.
     * @param admissionId Unique student ID.
     * @param totalAmount Calculated course cost.
     */
    async upsertFeeSummary(admissionId: number, totalAmount: number): Promise<any> {
        const db = await getDatabase();
        const existing = await db.get('SELECT * FROM fees WHERE admission_id = ?', [admissionId]);

        if (existing) {
            return db.run(
                `UPDATE fees 
                 SET total_amount = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE admission_id = ?`,
                [totalAmount, admissionId]
            );
        } else {
            return db.run(
                'INSERT INTO fees (admission_id, total_amount, status) VALUES (?, ?, ?)',
                [admissionId, totalAmount, 'Pending']
            );
        }
    },

    /**
     * Record a new fee payment.
     * Inserts transaction into fee_payments and updates next_payment_date on fees.
     */
    async addPayment(admissionId: number, amount: number, remark: string, createdAt?: string, nextPaymentDate?: string): Promise<number> {
        const db = await getDatabase();
        let result;
        if (createdAt) {
            result = await db.run(
                'INSERT INTO fee_payments (admission_id, amount, remark, created_at, payment_date, next_payment_date) VALUES (?, ?, ?, ?, ?, ?)',
                [admissionId, amount, remark, createdAt, createdAt, nextPaymentDate || null]
            );
        } else {
            result = await db.run(
                'INSERT INTO fee_payments (admission_id, amount, remark, next_payment_date) VALUES (?, ?, ?, ?)',
                [admissionId, amount, remark, nextPaymentDate || null]
            );
        }

        const paymentId = result.lastID;

        // Fetch current summary and apply adjustments to next_payment_date
        const fee = await this.findByAdmissionId(admissionId);
        const nextDate = (fee && fee.remaining_amount <= 0) ? null : (nextPaymentDate || null);
        await db.run(
            `UPDATE fees 
             SET next_payment_date = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE admission_id = ?`,
            [nextDate, admissionId]
        );

        return paymentId as number;
    },

    /**
     * Deletes fee tracking and transactions associated with an admission.
     */
    async deleteByAdmissionId(admissionId: number): Promise<any> {
        const db = await getDatabase();
        await db.run('DELETE FROM fee_payments WHERE admission_id = ?', [admissionId]);
        return db.run('DELETE FROM fees WHERE admission_id = ?', [admissionId]);
    },

    /**
     * Fetch individual payment details by unique key.
     */
    async getPaymentById(id: number): Promise<FeePayment | undefined> {
        const db = await getDatabase();
        return db.get('SELECT * FROM fee_payments WHERE id = ?', [id]);
    }
};
