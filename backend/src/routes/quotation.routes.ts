import { Router } from 'express';
import {
  getQuotations,
  createQuotation,
  getQuotationById,
  updateQuotationStatus,
  convertQuotationToSalesOrder,
} from '../controllers/quotation.controller';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { quotationSchema, updateQuotationStatusSchema } from '../validators';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', authorizeRoles(Role.SALES, Role.ADMIN), getQuotations);
router.post('/', authorizeRoles(Role.SALES, Role.ADMIN), validateBody(quotationSchema), createQuotation);
router.get('/:id', authorizeRoles(Role.SALES, Role.ADMIN), getQuotationById);
router.patch('/:id/status', authorizeRoles(Role.SALES, Role.ADMIN), validateBody(updateQuotationStatusSchema), updateQuotationStatus);
router.post('/:id/convert', authorizeRoles(Role.SALES, Role.ADMIN), convertQuotationToSalesOrder);

export default router;
