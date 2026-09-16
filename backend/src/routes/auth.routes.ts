import { Router } from 'express';
import { login, getMe } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { loginSchema } from '../validators';

const router = Router();

router.post('/login', validateBody(loginSchema), login);
router.get('/me', authenticate, getMe);

export default router;
