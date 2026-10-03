import { Router } from 'express';
import { 
    getAllInquiries, 
    createInquiry, 
    updateInquiry, 
    deleteInquiry 
} from '../controllers/inquiryController';

const router = Router();

router.get('/', getAllInquiries);
router.post('/', createInquiry);
router.put('/:id', updateInquiry);
router.delete('/:id', deleteInquiry);

export default router;
