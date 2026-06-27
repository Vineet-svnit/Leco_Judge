import { Router } from 'express';

import { getQuestionById, listQuestions } from '../controllers/question.controller.js';

const router = Router();

router.get('/', listQuestions);
router.get('/:id', getQuestionById);

export default router;