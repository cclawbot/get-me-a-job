import { useEffect, useState } from 'react';
import './App.css';

interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
}

function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('http://localhost:3001/api/jobs')
      .then(res => res.json())
      .then(data => {
        setJobs(data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to fetch jobs');
        setLoading(false);
        console.error(err);
      });
  }, []);

  if (loading) return <div className="App"><h1>Loading jobs...</h1></div>;
  if (error) return <div className="App"><h1>{error}</h1></div>;

  return (
    <div className="App">
      <header>
        <h1>🎯 Get Me a Job</h1>
        <p>Your AI-powered job search companion</p>
      </header>
      
      <main>
        <div className="jobs-grid">
          {jobs.map(job => (
            <div key={job.id} className="job-card">
              <h2>{job.title}</h2>
              <p className="company">{job.company}</p>
              <p className="location">📍 {job.location}</p>
              <button>View Details</button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
