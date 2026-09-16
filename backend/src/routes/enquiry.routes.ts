import { Router } from 'express';
import {
  getEnquiries,
  createEnquiry,
  getEnquiryById,
  updateEnquiryStatus,
} from '../controllers/enquiry.controller';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { enquirySchema, updateEnquiryStatusSchema } from '../validators';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', authorizeRoles(Role.SALES, Role.ADMIN), getEnquiries);
router.post('/', authorizeRoles(Role.SALES, Role.ADMIN), validateBody(enquirySchema), createEnquiry);
router.get('/:id', authorizeRoles(Role.SALES, Role.ADMIN), getEnquiryById);
router.patch('/:id/status', authorizeRoles(Role.SALES, Role.ADMIN), validateBody(updateEnquiryStatusSchema), updateEnquiryStatus);

export default router;
