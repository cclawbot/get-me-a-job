import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import profileRouter from './routes/profile';
import storiesRouter from './routes/stories';
import resumesRouter from './routes/resumes';

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

app.get('/api/jobs', (req, res) => {
  // Placeholder for job listings
  res.json([
    { id: 1, title: 'Frontend Developer', company: 'TechCorp', location: 'Remote' },
    { id: 2, title: 'Backend Engineer', company: 'StartupXYZ', location: 'San Francisco' },
  ]);
});

// Resume tailoring routes
app.use('/api/profile', profileRouter);
app.use('/api/stories', storiesRouter);
app.use('/api/resumes', resumesRouter);

// Start server
app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
});
