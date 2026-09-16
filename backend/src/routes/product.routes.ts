import { Router } from 'express';
import { getProducts, getProductById, updatePhysicalInventory } from '../controllers/product.controller';
import { authenticate } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { updateStockSchema } from '../validators';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', authorizeRoles(Role.SALES, Role.ADMIN), getProducts);
router.get('/:id', authorizeRoles(Role.SALES, Role.ADMIN), getProductById);
router.patch('/:productId/stock', authorizeRoles(Role.ADMIN), validateBody(updateStockSchema), updatePhysicalInventory);

export default router;
