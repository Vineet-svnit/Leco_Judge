import { Router } from 'express';

import { getQuestionById, listQuestions } from '../controllers/question.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', listQuestions);
router.get('/:id', getQuestionById);

export default router;