import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

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

// Start server
app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
});
