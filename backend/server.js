import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import passport from 'passport';

import { connectDB } from './config/db.js';
import adminRoutes from './routes/admin.routes.js';
import authRoutes from './routes/auth.routes.js';
import questionRoutes from './routes/question.routes.js';
import submissionRoutes from './routes/submission.routes.js';
import { startSubmitWorker } from './workers/submitWorker.js';
import { startRunWorker } from './workers/runWorker.js';
import { startTcGenWorker } from './workers/tcGenWorker.js';
import './config/passport.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(passport.initialize());

app.use('/auth', authRoutes);
app.use('/questions', questionRoutes);
app.use('/admin', adminRoutes);
app.use('/submissions', submissionRoutes);

app.get('/', (req, res) => {
	res.json({ message: 'Leco Judge API is running' });
});

app.use((req, res) => {
	res.status(404).json({ message: 'Route not found' });
});

const startServer = async () => {
	try {
		await connectDB();
		startSubmitWorker();
		startRunWorker();
		startTcGenWorker();
		app.listen(PORT, () => {
			console.log(`Server running on port ${PORT}`);
		});
	} catch (error) {
		console.error('Failed to start server:', error);
		process.exit(1);
	}
};

startServer();
