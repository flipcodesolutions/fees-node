import { getDatabase } from '../config/database';

export interface Admission {
  id?: number;
  inquiry_id?: number | null;
  student_name: string;
  mobile: string;
  reference_name?: string | null;
  inquiry_for?: string | null;
  remark?: string | null;
  payload_json: string;
  status?: string;
  created_at?: string;
}

/**
 * AdmissionModel encapsulates SQLite queries for managing student admissions.
 */
export const AdmissionModel = {
  /**
   * Fetch all admissions ordered by newest created first.
   */
  async findAll(): Promise<Admission[]> {
    const db = await getDatabase();
    return db.all('SELECT * FROM admissions ORDER BY created_at DESC');
  },

  /**
   * Create a new student admission.
   * @param data Admission fields to write.
   */
  async create(data: Admission): Promise<any> {
    const db = await getDatabase();
    return db.run(
      `INSERT INTO admissions 
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.inquiry_id ?? null,
        data.student_name,
        data.mobile,
        data.reference_name ?? null,
        data.inquiry_for ?? null,
        data.remark ?? null,
        data.payload_json,
        data.status || 'Active',
      ]
    );
  },

  /**
   * Update an existing admission record.
   * @param id The admission ID.
   * @param data The updated admission fields.
   */
  async update(id: string, data: Admission): Promise<any> {
    const db = await getDatabase();
    return db.run(
      `UPDATE admissions
       SET
         inquiry_id = ?,
         student_name = ?,
         mobile = ?,
         reference_name = ?,
         inquiry_for = ?,
         remark = ?,
         payload_json = ?,
         status = ?
       WHERE id = ?`,
      [
        data.inquiry_id ?? null,
        data.student_name,
        data.mobile,
        data.reference_name ?? null,
        data.inquiry_for ?? null,
        data.remark ?? null,
        data.payload_json,
        data.status || 'Active',
        id,
      ]
    );
  },

  /**
   * Delete an admission record by ID.
   * @param id The admission ID.
   */
  async delete(id: string): Promise<any> {
    const db = await getDatabase();
    return db.run('DELETE FROM admissions WHERE id = ?', [id]);
  },

  /**
   * Find a single admission by its primary key ID.
   * @param id The admission ID.
   */
  async findById(id: number): Promise<Admission | undefined> {
    const db = await getDatabase();
    return db.get('SELECT * FROM admissions WHERE id = ?', [id]);
  },
};