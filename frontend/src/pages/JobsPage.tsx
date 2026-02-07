import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './JobsPage.css';

interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  salary?: string;
  url: string;
  source: string;
  status: string;
  postedDate?: string;
  workType?: string;
  remote: boolean;
  description?: string;
  notes?: string;
  createdAt: string;
}

interface Stats {
  total: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
}

const STATUS_OPTIONS = [
  { value: 'new', label: '🆕 New', color: '#3498db' },
  { value: 'saved', label: '⭐ Saved', color: '#f39c12' },
  { value: 'applied', label: '📤 Applied', color: '#9b59b6' },
  { value: 'interviewing', label: '🎯 Interviewing', color: '#27ae60' },
  { value: 'offered', label: '🎉 Offered', color: '#2ecc71' },
  { value: 'rejected', label: '❌ Rejected', color: '#e74c3c' },
];

const SOURCE_ICONS: Record<string, string> = {
  seek: '🔵',
  linkedin: '🔷',
  indeed: '🟣',
  manual: '📝',
};

export default function JobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  
  // Search form
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [sources, setSources] = useState<string[]>(['seek', 'linkedin', 'indeed']);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected jobs for bulk actions
  const [selectedJobs, setSelectedJobs] = useState<number[]>([]);
  
  // Expanded job for details
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);

  useEffect(() => {
    fetchJobs();
    fetchStats();
  }, [filterStatus, filterSource]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterSource !== 'all') params.append('source', filterSource);
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/jobs?${params}`);
      const data = await response.json();
      setJobs(data);
    } catch (err) {
      setError('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/jobs/stats/summary`);
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keywords.trim()) {
      setError('Please enter search keywords');
      return;
    }
    
    setSearching(true);
    setError('');
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/jobs/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords,
          location: location || undefined,
          sources,
          maxResults: 10,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }
      
      // Refresh job list
      await fetchJobs();
      await fetchStats();
      
      // Show success message
      alert(`Found ${data.count} jobs!`);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleStatusChange = async (jobId: number, newStatus: string) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      // Update local state
      setJobs(jobs.map(job => 
        job.id === jobId ? { ...job, status: newStatus } : job
      ));
      fetchStats();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleFetchDescription = async (jobId: number) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/jobs/${jobId}/fetch-description`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch description');
      }
      
      const updated = await response.json();
      
      // Update local state
      setJobs(jobs.map(job => 
        job.id === jobId ? updated : job
      ));
    } catch (err) {
      console.error('Failed to fetch description:', err);
      alert('Failed to fetch job description. Please try again.');
    }
  };

  const handleTailorResume = (job: Job) => {
    // Navigate to tailor page with job info
    const params = new URLSearchParams({
      jobTitle: job.title,
      company: job.company,
      url: job.url,
    });
    if (job.description) {
      params.append('description', job.description);
    }
    navigate(`/tailor?${params}`);
  };

  const handleDeleteJob = async (jobId: number) => {
    if (!confirm('Delete this job?')) return;
    
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/jobs/${jobId}`, {
        method: 'DELETE',
      });
      
      setJobs(jobs.filter(job => job.id !== jobId));
      fetchStats();
    } catch (err) {
      console.error('Failed to delete job:', err);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedJobs.length === 0) return;
    if (!confirm(`Delete ${selectedJobs.length} jobs?`)) return;
    
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/jobs/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedJobs }),
      });
      
      setJobs(jobs.filter(job => !selectedJobs.includes(job.id)));
      setSelectedJobs([]);
      fetchStats();
    } catch (err) {
      console.error('Failed to bulk delete:', err);
    }
  };

  const handleCleanup = async () => {
    if (!confirm('Are you sure you want to delete ALL jobs with status "New" or "Rejected"? This cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/jobs/cleanup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statuses: ['new', 'rejected'] }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Cleanup failed');
      }

      // Refresh job list and stats
      await fetchJobs();
      await fetchStats();
      alert(`Successfully cleaned up ${data.count} jobs.`);
    } catch (err: any) {
      setError(err.message || 'Cleanup failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleJobSelection = (jobId: number) => {
    setSelectedJobs(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  const toggleSourceSelection = (source: string) => {
    setSources(prev => 
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  const getStatusColor = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.color || '#95a5a6';
  };

  return (
    <div className="jobs-page">
      <h1>🔍 Job Search</h1>
      
      {/* Search Form */}
      <div className="search-section">
        <h2>Search for Jobs</h2>
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-inputs">
            <input
              type="text"
              placeholder="Keywords (e.g., Software Engineer, React)"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="search-input"
            />
            <input
              type="text"
              placeholder="Location (e.g., Sydney, Melbourne)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="source-toggles">
            <label className="source-toggle">
              <input
                type="checkbox"
                checked={sources.includes('seek')}
                onChange={() => toggleSourceSelection('seek')}
              />
              🔵 Seek
            </label>
            <label className="source-toggle">
              <input
                type="checkbox"
                checked={sources.includes('linkedin')}
                onChange={() => toggleSourceSelection('linkedin')}
              />
              🔷 LinkedIn
            </label>
            <label className="source-toggle">
              <input
                type="checkbox"
                checked={sources.includes('indeed')}
                onChange={() => toggleSourceSelection('indeed')}
              />
              🟣 Indeed
            </label>
          </div>
          
          <button 
            type="submit" 
            className="search-button"
            disabled={searching || sources.length === 0}
          >
            {searching ? '🔄 Searching...' : '🔍 Search Jobs'}
          </button>
        </form>
        
        {error && <div className="error-message">{error}</div>}
      </div>
      
      {/* Stats */}
      {stats && (
        <div className="stats-section">
          <div className="stat-card">
            <span className="stat-number">{stats.total}</span>
            <span className="stat-label">Total Jobs</span>
          </div>
          {STATUS_OPTIONS.slice(0, 4).map(status => (
            <div 
              key={status.value} 
              className="stat-card"
              style={{ borderColor: status.color }}
            >
              <span className="stat-number">{stats.byStatus[status.value] || 0}</span>
              <span className="stat-label">{status.label}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Status:</label>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All</option>
            {STATUS_OPTIONS.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label>Source:</label>
          <select 
            value={filterSource} 
            onChange={(e) => setFilterSource(e.target.value)}
          >
            <option value="all">All</option>
            <option value="seek">🔵 Seek</option>
            <option value="linkedin">🔷 LinkedIn</option>
            <option value="indeed">🟣 Indeed</option>
          </select>
        </div>
        
        <div className="filter-group search-filter">
          <input
            type="text"
            placeholder="Search saved jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchJobs()}
          />
          <button onClick={fetchJobs}>🔍</button>
        </div>
        
        {selectedJobs.length > 0 && (
          <button className="bulk-delete-btn" onClick={handleBulkDelete}>
            🗑️ Delete {selectedJobs.length} selected
          </button>
        )}

        <button 
          className="cleanup-btn" 
          onClick={handleCleanup}
          title="Delete all jobs with status New or Rejected"
        >
          🧹 Clean Up
        </button>
      </div>
      
      {/* Job List */}
      <div className="jobs-list">
        {loading ? (
          <div className="loading">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="empty-state">
            <h3>No jobs found</h3>
            <p>Search for jobs using the form above to get started!</p>
          </div>
        ) : (
          jobs.map(job => (
            <div 
              key={job.id} 
              className={`job-card ${expandedJobId === job.id ? 'expanded' : ''}`}
            >
              <div className="job-header">
                <input
                  type="checkbox"
                  checked={selectedJobs.includes(job.id)}
                  onChange={() => toggleJobSelection(job.id)}
                  className="job-checkbox"
                />
                
                <div className="job-main" onClick={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}>
                  <div className="job-title-row">
                    <span className="source-icon">{SOURCE_ICONS[job.source]}</span>
                    <h3 className="job-title">{job.title}</h3>
                    {job.remote && <span className="remote-badge">🏠 Remote</span>}
                    {job.description && <span className="fetched-badge" title="Full description fetched">📄 Fetched</span>}
                  </div>
                  <div className="job-meta">
                    <span className="company">🏢 {job.company}</span>
                    <span className="location">📍 {job.location}</span>
                    {job.salary && <span className="salary">💰 {job.salary}</span>}
                    {job.postedDate && <span className="posted">🕐 {job.postedDate}</span>}
                  </div>
                </div>
                
                <div className="job-actions">
                  <select
                    value={job.status}
                    onChange={(e) => handleStatusChange(job.id, e.target.value)}
                    className="status-select"
                    style={{ borderColor: getStatusColor(job.status) }}
                  >
                    {STATUS_OPTIONS.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                  
                  <a 
                    href={job.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="action-btn view-btn"
                    title="View original posting"
                  >
                    🔗
                  </a>
                </div>
              </div>
              
              {expandedJobId === job.id && (
                <div className="job-details">
                  {job.description ? (
                    <div className="description">
                      <h4>Job Description</h4>
                      <p>{job.description.substring(0, 1000)}...</p>
                    </div>
                  ) : (
                    <button 
                      className="fetch-description-btn"
                      onClick={() => handleFetchDescription(job.id)}
                    >
                      📄 Fetch Full Description
                    </button>
                  )}
                  
                  <div className="detail-actions">
                    <button 
                      className="tailor-btn"
                      onClick={() => handleTailorResume(job)}
                    >
                      ✨ Tailor Resume for This Job
                    </button>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDeleteJob(job.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
