"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdmissionModel = void 0;
const database_1 = require("../config/database");
/**
 * AdmissionModel encapsulates SQLite queries for managing student admissions.
 */
exports.AdmissionModel = {
    /**
     * Fetch all admissions ordered by newest created first.
     */
    async findAll() {
        const db = await (0, database_1.getDatabase)();
        return db.all('SELECT * FROM admissions ORDER BY created_at DESC');
    },
    /**
     * Create a new student admission.
     * @param data Admission fields to write.
     */
    async create(data) {
        const db = await (0, database_1.getDatabase)();
        return db.run(`INSERT INTO admissions 
      (
        inquiry_id,
        student_name,
        mobile,
        reference_name,
        inquiry_for,
        remark,
        payload_json,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
            data.inquiry_id ?? null,
            data.student_name,
            data.mobile,
            data.reference_name ?? null,
            data.inquiry_for ?? null,
            data.remark ?? null,
            data.payload_json,
            data.status || 'Active',
        ]);
    },
    /**
     * Update an existing admission record.
     * @param id The admission ID.
     * @param data The updated admission fields.
     */
    async update(id, data) {
        const db = await (0, database_1.getDatabase)();
        return db.run(`UPDATE admissions
       SET
         inquiry_id = ?,
         student_name = ?,
         mobile = ?,
         reference_name = ?,
         inquiry_for = ?,
         remark = ?,
         payload_json = ?,
         status = ?
       WHERE id = ?`, [
            data.inquiry_id ?? null,
            data.student_name,
            data.mobile,
            data.reference_name ?? null,
            data.inquiry_for ?? null,
            data.remark ?? null,
            data.payload_json,
            data.status || 'Active',
            id,
        ]);
    },
    /**
     * Delete an admission record by ID.
     * @param id The admission ID.
     */
    async delete(id) {
        const db = await (0, database_1.getDatabase)();
        return db.run('DELETE FROM admissions WHERE id = ?', [id]);
    },
    /**
     * Find a single admission by its primary key ID.
     * @param id The admission ID.
     */
    async findById(id) {
        const db = await (0, database_1.getDatabase)();
        return db.get('SELECT * FROM admissions WHERE id = ?', [id]);
    },
};
