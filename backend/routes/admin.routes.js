import { Router } from 'express';

import {
	createQuestion,
	getQuestionById,
	listQuestions,
	updateQuestion,
} from '../controllers/question.controller.js';
import { batchSaveTestcases, listTestcases } from '../controllers/testcase.controller.js';
import {
	handleDiscoverFamilies,
	handleGenerateGenerator,
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

// AI calls (2 total)
router.post('/ai/discover-families', handleDiscoverFamilies);   // AI Call #1
router.post('/ai/generate-generator', handleGenerateGenerator); // AI Call #2

// Generator execution in Docker (no AI)
router.post('/generator/run', handleRunGenerator);

export default router;