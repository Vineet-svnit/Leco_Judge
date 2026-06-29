import { Router } from 'express';

import {
	submitCode,
	runCode,
	getSubmissionStatus,
	getSubmissionHistory,
} from '../controllers/submission.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.post('/submit', submitCode);
router.post('/run', runCode);
router.get('/', getSubmissionHistory);
router.get('/:id', getSubmissionStatus);

export default router;
