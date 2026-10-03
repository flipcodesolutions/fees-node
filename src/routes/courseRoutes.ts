import { Router } from 'express';
import { createCourse, deleteCourse, deleteAllCourses, getAllCourses, updateCourse } from '../controllers/courseController';

const router = Router();

router.get('/', getAllCourses);
router.post('/', createCourse);
router.delete('/all', deleteAllCourses);
router.put('/:id', updateCourse);
router.delete('/:id', deleteCourse);

export default router;

