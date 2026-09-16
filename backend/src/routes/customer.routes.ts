import { Router } from 'express';
import { getCustomers, createCustomer, getCustomerById } from '../controllers/customer.controller';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { customerSchema } from '../validators';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', authorizeRoles(Role.SALES, Role.ADMIN), getCustomers);
router.post('/', authorizeRoles(Role.SALES, Role.ADMIN), validateBody(customerSchema), createCustomer);
router.get('/:id', authorizeRoles(Role.SALES, Role.ADMIN), getCustomerById);

export default router;
