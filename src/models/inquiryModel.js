"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InquiryModel = void 0;
const database_1 = require("../config/database");
/**
 * InquiryModel encapsulates database logic for managing visitor/student inquiries.
 */
exports.InquiryModel = {
    /**
     * Fetch all inquiries ordered by latest created first.
     */
    async findAll() {
        const db = await (0, database_1.getDatabase)();
        return db.all('SELECT * FROM inquiries ORDER BY created_at DESC');
    },
    /**
     * Create a new inquiry entry in the database.
     * @param data The inquiry record to insert.
     */
    async create(data) {
        const db = await (0, database_1.getDatabase)();
        return db.run(`INSERT INTO inquiries (name, mobile, reference_name, inquiry_for, remark, status)
             VALUES (?, ?, ?, ?, ?, ?)`, [
            data.name,
            data.mobile,
            data.reference_name,
            data.inquiry_for,
            data.remark,
            data.status || 'Pending'
        ]);
    },
    /**
     * Update an existing inquiry record.
     * @param id Unique identifier of the inquiry.
     * @param data The updated inquiry values.
     */
    async update(id, data) {
        const db = await (0, database_1.getDatabase)();
        return db.run(`UPDATE inquiries 
             SET name = ?, mobile = ?, reference_name = ?, inquiry_for = ?, remark = ?, status = ?
             WHERE id = ?`, [
            data.name,
            data.mobile,
            data.reference_name,
            data.inquiry_for,
            data.remark,
            data.status,
            id
        ]);
    },
    /**
     * Delete an inquiry record by its ID.
     * @param id Unique identifier of the inquiry.
     */
    async delete(id) {
        const db = await (0, database_1.getDatabase)();
        return db.run('DELETE FROM inquiries WHERE id = ?', [id]);
    }
};
