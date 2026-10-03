"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAllCourses = exports.deleteCourse = exports.updateCourse = exports.createCourse = exports.getAllCourses = void 0;
const courseModel_1 = require("../models/courseModel");
// Predefined set of valid course status states
const allowedStatuses = new Set(['Active', 'Core', 'Elective', 'Waitlist', 'Inactive', 'Deleted']);
/**
 * Normalizes parameterized ID strings to avoid array inputs.
 */
const normalizeId = (id) => (Array.isArray(id) ? id[0] : id);
/**
 * Validates course payload parameters before passing to Model.
 */
const validateCoursePayload = (body) => {
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
const getAllCourses = async (req, res) => {
    try {
        const courses = await courseModel_1.CourseModel.findAll();
        res.json(courses);
    }
    catch (error) {
        console.error('Fetch courses error:', error);
        res.status(500).json({ error: 'Database error' });
    }
};
exports.getAllCourses = getAllCourses;
/**
 * Handles creating a course or batch of courses.
 */
const createCourse = async (req, res) => {
    try {
        const data = req.body;
        // Bulk creation flow
        if (Array.isArray(data)) {
            for (const item of data) {
                const validationError = validateCoursePayload(item);
                if (validationError) {
                    return res.status(400).json({ error: validationError });
                }
                await courseModel_1.CourseModel.create(item);
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
        const result = await courseModel_1.CourseModel.create(data);
        return res.status(201).json({
            id: result.lastID,
            message: 'Course added',
        });
    }
    catch (error) {
        console.error('Create course error:', error);
        return res.status(500).json({ error: 'Database error' });
    }
};
exports.createCourse = createCourse;
/**
 * Handles updating course parameters.
 */
const updateCourse = async (req, res) => {
    try {
        const validationError = validateCoursePayload(req.body);
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }
        const cleanId = normalizeId(req.params.id);
        await courseModel_1.CourseModel.update(cleanId, req.body);
        res.json({ message: 'Course updated' });
    }
    catch (error) {
        console.error('Update course error:', error);
        res.status(500).json({ error: 'Database error' });
    }
};
exports.updateCourse = updateCourse;
/**
 * Handles deleting a single course.
 */
const deleteCourse = async (req, res) => {
    try {
        const cleanId = normalizeId(req.params.id);
        await courseModel_1.CourseModel.delete(cleanId);
        res.json({ message: 'Course deleted' });
    }
    catch (error) {
        console.error('Delete course error:', error);
        res.status(500).json({ error: 'Database error' });
    }
};
exports.deleteCourse = deleteCourse;
/**
 * Handles deleting all courses in the system.
 */
const deleteAllCourses = async (req, res) => {
    try {
        await courseModel_1.CourseModel.deleteAll();
        res.json({ message: 'All courses deleted' });
    }
    catch (error) {
        console.error('Delete all courses error:', error);
        res.status(500).json({ error: 'Database error' });
    }
};
exports.deleteAllCourses = deleteAllCourses;
