import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSelectedAIModel } from '../utils/aiModel';
import ResumeComparison from '../components/ResumeComparison';
import './TailorResumePage.css';

interface TailoredResume {
  id?: number;
  keywords: string[];
  summary: string;
  summaryReasoningPoints?: string[];
  tailoringNotesPoints?: string[];
  experiences: Array<{
    company: string;
    title: string;
    location?: string;
    startDate: string;
    endDate?: string;
    bullets: string[];
    reasoningPoints?: string[];
  }>;
  matchedStories?: number[];
  atsScore?: number;
  profile?: {
    name?: string;
    email?: string;
    phone?: string;
    summary?: string;
    skills: string[]; // Already parsed array from backend
    experiences?: any[];
    educations?: any[];
    certifications?: any[];
  };
}

function TailorResumePage() {
  const navigate = useNavigate();
  const [jobUrl, setJobUrl] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsingUrl, setParsingUrl] = useState(false);
  const [tailoredResume, setTailoredResume] = useState<TailoredResume | null>(null);
  const [error, setError] = useState('');

  const handleParseUrl = async () => {
    if (!jobUrl.trim()) {
      setError('Please enter a job posting URL');
      return;
    }

    setParsingUrl(true);
    setError('');

    try {
      const model = getSelectedAIModel();
      const res = await fetch('http://localhost:3001/api/resumes/parse-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: jobUrl, model }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || 'Failed to parse URL');
      }

      const data = await res.json();
      setJobTitle(data.jobTitle);
      setCompany(data.company || '');
      setJobDescription(data.jobDescription);
      setError('');
      
      console.log('✅ Successfully parsed job from URL:', data);
    } catch (err) {
      console.error('Parse URL error:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse job URL');
    } finally {
      setParsingUrl(false);
    }
  };

  const handleTailor = async () => {
    if (!jobTitle || !jobDescription) {
      setError('Please fill in job title and description');
      return;
    }

    setLoading(true);
    setError('');
    setTailoredResume(null);

    try {
      const res = await fetch('http://localhost:3001/api/resumes/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle,
          company,
          jobDescription,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.demo) {
          setError('⚠️ OpenAI API key not configured. Please add your OpenAI API key to backend/.env file to use AI-powered resume tailoring.');
        } else {
          setError(data.error || 'Failed to tailor resume');
        }
        return;
      }

      setTailoredResume(data);
    } catch (err) {
      console.error('Failed to tailor resume:', err);
      setError('Failed to connect to backend');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!tailoredResume?.id) return;

    try {
      window.open(`http://localhost:3001/api/resumes/${tailoredResume.id}/pdf`, '_blank');
    } catch (err) {
      alert('Failed to download PDF');
    }
  };

  const handleReset = () => {
    setTailoredResume(null);
    setError('');
  };

  return (
    <div className="tailor-resume-page">
      <h1>Tailor Your Resume</h1>
      <p className="subtitle">Paste a job description and let AI optimize your resume for it</p>

      {!tailoredResume ? (
        <div className="input-section">
          <div className="form-card">
            <div className="url-section">
              <h3>🔗 Quick Import from URL</h3>
              <p className="helper-text">Paste a job posting URL (Seek, LinkedIn, Indeed, etc.) and we'll extract the details automatically</p>
              
              <div className="url-input-group">
                <input
                  type="url"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder="https://www.seek.com.au/job/..."
                  className="url-input"
                  disabled={parsingUrl}
                />
                <button 
                  onClick={handleParseUrl}
                  disabled={parsingUrl || !jobUrl.trim()}
                  className="btn-primary"
                >
                  {parsingUrl ? '🤖 Fetching...' : '🔍 Fetch & Parse'}
                </button>
              </div>
              
              <div className="divider">
                <span>OR</span>
              </div>
            </div>

            <h3>✍️ Manual Entry</h3>

            <div className="form-group">
              <label>Job Title *</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g., Senior Frontend Developer"
              />
            </div>

            <div className="form-group">
              <label>Company (Optional)</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g., Google"
              />
            </div>

            <div className="form-group">
              <label>Job Description *</label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here..."
                rows={15}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="ai-note">
              💡 <strong>Smart tailoring:</strong> Our AI writes in a natural, human tone — no generic buzzwords or corporate jargon. Just clear, powerful language that gets results.
            </div>

            <div className="form-actions">
              <button 
                onClick={handleTailor} 
                disabled={loading}
                className="btn-primary btn-large"
              >
                {loading ? '🤖 AI is tailoring your resume...' : '✨ Tailor My Resume'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="results-section">
          <div className="results-header">
            <div>
              <h2>Your Tailored Resume</h2>
              <p className="job-info">
                {jobTitle} {company && `at ${company}`}
              </p>
            </div>
            <div className="results-actions">
              <button onClick={handleReset} className="btn-secondary">
                ← New Resume
              </button>
              <button onClick={handleDownloadPDF} className="btn-primary">
                📄 Download PDF
              </button>
            </div>
          </div>

          {tailoredResume.atsScore && (
            <div className="ats-score">
              <div className="score-label">ATS Match Score</div>
              <div className="score-value">{tailoredResume.atsScore}%</div>
              <div className="score-bar">
                <div 
                  className="score-fill" 
                  style={{ width: `${tailoredResume.atsScore}%` }}
                />
              </div>
            </div>
          )}

          {tailoredResume.keywords && tailoredResume.keywords.length > 0 && (
            <div className="keywords-section">
              <h3>🎯 Key Skills & Keywords</h3>
              <div className="keywords-list">
                {tailoredResume.keywords.map((keyword, i) => (
                  <span key={i} className="keyword">{keyword}</span>
                ))}
              </div>
            </div>
          )}

          {/* Comparison View */}
          {tailoredResume.profile && (
            <ResumeComparison
              originalProfile={{
                summary: tailoredResume.profile.summary,
                experiences: tailoredResume.profile.experiences,
              }}
              tailoredResume={{
                summary: tailoredResume.summary,
                summaryReasoningPoints: tailoredResume.summaryReasoningPoints,
                tailoringNotesPoints: tailoredResume.tailoringNotesPoints,
                experiences: tailoredResume.experiences,
              }}
            />
          )}

          <div className="resume-preview">
            <div className="resume-header-preview">
              <h1>{tailoredResume.profile?.name || 'Your Name'}</h1>
              <div className="contact-info">
                {tailoredResume.profile?.email && <span>{tailoredResume.profile.email}</span>}
                {tailoredResume.profile?.phone && <span>{tailoredResume.profile.phone}</span>}
              </div>
            </div>

            {tailoredResume.summary && (
              <div className="resume-section">
                <h2>Professional Summary</h2>
                <p className="summary-text">{tailoredResume.summary}</p>
              </div>
            )}

            {tailoredResume.profile?.skills && Array.isArray(tailoredResume.profile.skills) && tailoredResume.profile.skills.length > 0 && (
              <div className="resume-section">
                <h2>Skills</h2>
                <div className="skills-list">
                  {tailoredResume.profile.skills.map((skill: string, i: number) => (
                    <span key={i} className="skill-badge">{skill}</span>
                  ))}
                </div>
              </div>
            )}

            {tailoredResume.experiences && tailoredResume.experiences.length > 0 && (
              <div className="resume-section">
                <h2>Professional Experience</h2>
                {tailoredResume.experiences.map((exp, i) => (
                  <div key={i} className="experience-block">
                    <div className="exp-header">
                      <div>
                        <h3>{exp.title}</h3>
                        <div className="company-name">{exp.company}</div>
                      </div>
                      <div className="exp-dates">
                        {exp.startDate} - {exp.endDate || 'Present'}
                      </div>
                    </div>
                    {exp.bullets && exp.bullets.length > 0 && (
                      <ul className="bullet-list">
                        {exp.bullets.map((bullet, j) => (
                          <li key={j}>{bullet}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tailoredResume.profile?.educations && tailoredResume.profile.educations.length > 0 && (
              <div className="resume-section">
                <h2>Education</h2>
                {tailoredResume.profile.educations.map((edu: any, i: number) => (
                  <div key={i} className="education-block">
                    <h3>{edu.degree}{edu.field && ` in ${edu.field}`}</h3>
                    <div className="institution">{edu.institution}</div>
                    {edu.endDate && <div className="edu-date">{edu.endDate}</div>}
                  </div>
                ))}
              </div>
            )}

            {tailoredResume.profile?.certifications && tailoredResume.profile.certifications.length > 0 && (
              <div className="resume-section">
                <h2>Certifications</h2>
                {tailoredResume.profile.certifications.map((cert: any, i: number) => (
                  <div key={i} className="cert-block">
                    {cert.name} - {cert.issuer}
                    {cert.date && ` (${cert.date})`}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TailorResumePage;
