import { getDatabase } from '../config/database';

export interface Course {
  id?: number;
  course_code?: string;
  name: string;
  duration?: string;
  fees?: string;
  details?: string;
  status?: string;
  created_at?: string;
}

/**
 * CourseModel encapsulates the database interactions for courses.
 */
export const CourseModel = {
  /**
     * Fetch all courses ordered by latest created first.
     */
  async findAll(): Promise<Course[]> {
    const db = await getDatabase();
    return db.all('SELECT * FROM courses ORDER BY created_at DESC');
  },

  /**
     * Create a new course in the system.
     * @param data Course fields to insert.
     */
  async create(data: Course): Promise<any> {
    const db = await getDatabase();
    return db.run(
      `INSERT INTO courses (course_code, name, duration, fees, details, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.course_code || null,
        data.name,
        data.duration || null,
        data.fees || null,
        data.details || null,
        data.status || 'Active',
      ]
    );
  },

  /**
     * Update an existing course record.
     * @param id The primary key identifier of the course.
     * @param data The updated course parameters.
     */
  async update(id: string, data: Course): Promise<any> {
    const db = await getDatabase();
    return db.run(
      `UPDATE courses 
       SET course_code = ?, name = ?, duration = ?, fees = ?, details = ?, status = ? 
       WHERE id = ?`,
      [
        data.course_code || null,
        data.name,
        data.duration || null,
        data.fees || null,
        data.details || null,
        data.status || 'Active',
        id,
      ]
    );
  },

  /**
     * Delete a single course by its ID.
     * @param id The course ID.
     */
  async delete(id: string): Promise<any> {
    const db = await getDatabase();
    return db.run('DELETE FROM courses WHERE id = ?', [id]);
  },

  /**
     * Clear all courses from the database (bulk delete).
     */
  async deleteAll(): Promise<any> {
    const db = await getDatabase();
    return db.run('DELETE FROM courses');
  },
};