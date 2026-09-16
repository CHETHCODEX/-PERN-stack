import { Router } from 'express';
import {
  getSalesOrders,
  getSalesOrderById,
  confirmSalesOrder,
  cancelSalesOrder,
  dispatchSalesOrder,
} from '../controllers/salesOrder.controller';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { dispatchSchema } from '../validators';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Sales & Admin can view orders
router.get('/', authorizeRoles(Role.SALES, Role.ADMIN), getSalesOrders);
router.get('/:id', authorizeRoles(Role.SALES, Role.ADMIN), getSalesOrderById);

// Admin-only operational transitions (Case study requirement)
router.post('/:id/confirm', authorizeRoles(Role.ADMIN), confirmSalesOrder);
router.post('/:id/cancel', authorizeRoles(Role.ADMIN), cancelSalesOrder);
router.post('/:id/dispatch', authorizeRoles(Role.ADMIN), validateBody(dispatchSchema), dispatchSalesOrder);

export default router;
