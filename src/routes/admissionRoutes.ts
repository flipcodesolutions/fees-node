import { Router } from 'express';
import { createAdmission, deleteAdmission, getAllAdmissions, updateAdmission } from '../controllers/admissionController';

const router = Router();

router.get('/', getAllAdmissions);
router.post('/', createAdmission);
router.put('/:id', updateAdmission);
router.delete('/:id', deleteAdmission);

export default router;

