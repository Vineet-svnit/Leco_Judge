import { Router } from 'express';

import {
	createQuestion,
	getQuestionById,
	listQuestions,
	updateQuestion,
} from '../controllers/question.controller.js';
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/', listQuestions);
router.post('/questions', createQuestion);
router.get('/questions/:id', getQuestionById);
router.patch('/questions/:id', updateQuestion);

export default router;