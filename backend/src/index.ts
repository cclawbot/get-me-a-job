import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import profileRouter from './routes/profile';
import storiesRouter from './routes/stories';
import resumesRouter from './routes/resumes';
import jobsRouter from './routes/jobs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running!' });
});

// Resume tailoring routes
app.use('/api/profile', profileRouter);
app.use('/api/stories', storiesRouter);
app.use('/api/resumes', resumesRouter);
app.use('/api/jobs', jobsRouter);

// Start server
app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
});
