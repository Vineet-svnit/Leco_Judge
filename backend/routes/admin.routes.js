import { Router } from 'express';

import {
	createQuestion,
	getQuestionById,
	listQuestions,
	updateQuestion,
} from '../controllers/question.controller.js';
import { batchSaveTestcases, listTestcases } from '../controllers/testcase.controller.js';
import {
	handleGenerateGenerator,
	handleListFamilies,
	handleRunGenerator,
} from '../controllers/ai.controller.js';
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/', listQuestions);
router.post('/questions', createQuestion);
router.get('/questions/:id', getQuestionById);
router.patch('/questions/:id', updateQuestion);

router.get('/questions/:id/testcases', listTestcases);
router.post('/questions/:id/testcases/batch', batchSaveTestcases);

// AI-assisted testcase generation (AI used only for generator creation)
router.post('/ai/generate-generator', handleGenerateGenerator);

// Generator execution in Docker (no AI)
router.post('/generator/list-families', handleListFamilies);
router.post('/generator/run', handleRunGenerator);

export default router;