import { Router } from 'express';
import { healthController } from '../controllers/health.js';

const router = Router();

router.get('/', healthController.check);
router.get('/details', healthController.details);

export default router;