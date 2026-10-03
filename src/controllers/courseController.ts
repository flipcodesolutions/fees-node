import { Request, Response } from 'express';
import { CourseModel } from '../models/courseModel';

// Predefined set of valid course status states
const allowedStatuses = new Set(['Active', 'Core', 'Elective', 'Waitlist', 'Inactive', 'Deleted']);

/**
 * Normalizes parameterized ID strings to avoid array inputs.
 */
const normalizeId = (id: string | string[]) => (Array.isArray(id) ? id[0] : id);

/**
 * Validates course payload parameters before passing to Model.
 */
const validateCoursePayload = (body: Record<string, unknown>): string | null => {
  if (!body.name) {
    return 'Course name is required';
  }
  if (body.status && !allowedStatuses.has(String(body.status))) {
    return 'Invalid status value';
  }
  return null;
};

/**
 * Handles fetching all courses.
 */
export const getAllCourses = async (req: Request, res: Response) => {
  try {
    const courses = await CourseModel.findAll();
    res.json(courses);
  } catch (error) {
    console.error('Fetch courses error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

/**
 * Handles creating a course or batch of courses.
 */
export const createCourse = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    // Bulk creation flow
    if (Array.isArray(data)) {
      for (const item of data) {
        const validationError = validateCoursePayload(item);
        if (validationError) {
          return res.status(400).json({ error: validationError });
        }
        await CourseModel.create(item);
      }

      return res.status(201).json({
        message: 'Multiple courses added successfully',
      });
    }

    // Single creation flow
    const validationError = validateCoursePayload(data);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const result = await CourseModel.create(data);
    return res.status(201).json({
      id: result.lastID,
      message: 'Course added',
    });

  } catch (error) {
    console.error('Create course error:', error);
    return res.status(500).json({ error: 'Database error' });
  }
};

/**
 * Handles updating course parameters.
 */
export const updateCourse = async (req: Request, res: Response) => {
  try {
    const validationError = validateCoursePayload(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const cleanId = normalizeId(req.params.id);
    await CourseModel.update(cleanId, req.body);
    res.json({ message: 'Course updated' });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

/**
 * Handles deleting a single course.
 */
export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const cleanId = normalizeId(req.params.id);
    await CourseModel.delete(cleanId);
    res.json({ message: 'Course deleted' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

/**
 * Handles deleting all courses in the system.
 */
export const deleteAllCourses = async (req: Request, res: Response) => {
  try {
    await CourseModel.deleteAll();
    res.json({ message: 'All courses deleted' });
  } catch (error) {
    console.error('Delete all courses error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};
