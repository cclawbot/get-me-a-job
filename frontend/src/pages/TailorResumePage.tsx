import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  const [jobUrl, setJobUrl] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsingUrl, setParsingUrl] = useState(false);
  const [tailoredResume, setTailoredResume] = useState<TailoredResume | null>(null);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editedResume, setEditedResume] = useState<TailoredResume | null>(null);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [generatingCoverLetter, setGeneratingCoverLetter] = useState(false);

  // Load URL params from Jobs page navigation
  useEffect(() => {
    const urlJobTitle = searchParams.get('jobTitle');
    const urlCompany = searchParams.get('company');
    const urlDescription = searchParams.get('description');
    const urlJobUrl = searchParams.get('url');
    
    if (urlJobTitle) setJobTitle(urlJobTitle);
    if (urlCompany) setCompany(urlCompany);
    if (urlDescription) setJobDescription(urlDescription);
    if (urlJobUrl) setJobUrl(urlJobUrl);
  }, [searchParams]);

  const handleParseUrl = async () => {
    if (!jobUrl.trim()) {
      setError('Please enter a job posting URL');
      return;
    }

    setParsingUrl(true);
    setError('');

    try {
      const model = getSelectedAIModel();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/resumes/parse-url`, {
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
    if (!jobDescription || !jobTitle) {
      setError('Job title and description are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const model = getSelectedAIModel();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/resumes/tailor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription,
          jobTitle,
          company,
          model,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to tailor resume');
      }

      setTailoredResume(data);
      console.log('✅ Resume tailored successfully:', data);
    } catch (err) {
      console.error('Tailor error:', err);
      setError(err instanceof Error ? err.message : 'Failed to tailor resume');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!jobDescription || !tailoredResume) return;

    setGeneratingCoverLetter(true);
    setError('');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/resumes/generate-cover-letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription,
          tailoredResume,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate cover letter');
      }

      setCoverLetter(data.coverLetter);
    } catch (err) {
      console.error('Failed to generate cover letter:', err);
      setError('Failed to generate cover letter');
    } finally {
      setGeneratingCoverLetter(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!tailoredResume?.id) return;

    try {
      window.open(`${import.meta.env.VITE_API_URL}/api/resumes/${tailoredResume.id}/pdf`, '_blank');
    } catch (err) {
      alert('Failed to download PDF');
    }
  };

  const handleReset = () => {
    setTailoredResume(null);
    setEditedResume(null);
    setEditMode(false);
    setError('');
  };

  const handleEnterEditMode = () => {
    if (tailoredResume) {
      // Create a deep copy for editing
      setEditedResume(JSON.parse(JSON.stringify(tailoredResume)));
      setEditMode(true);
    }
  };

  const handleSaveChanges = async () => {
    if (!editedResume || !editedResume.id) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/resumes/${editedResume.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: editedResume.summary,
          experiences: editedResume.experiences,
          keywords: editedResume.keywords,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save changes');
      }

      // Update the main resume with edited content
      setTailoredResume(editedResume);
      setEditMode(false);
      alert('✅ Changes saved successfully!');
    } catch (err) {
      console.error('Failed to save changes:', err);
      alert('Failed to save changes. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditedResume(null);
    setEditMode(false);
  };

  const handleSummaryChange = (value: string) => {
    if (editedResume) {
      setEditedResume({ ...editedResume, summary: value });
    }
  };

  const handleBulletChange = (expIndex: number, bulletIndex: number, value: string) => {
    if (editedResume) {
      const newExperiences = [...editedResume.experiences];
      newExperiences[expIndex].bullets[bulletIndex] = value;
      setEditedResume({ ...editedResume, experiences: newExperiences });
    }
  };

  const handleAddBullet = (expIndex: number) => {
    if (editedResume) {
      const newExperiences = [...editedResume.experiences];
      newExperiences[expIndex].bullets.push('');
      setEditedResume({ ...editedResume, experiences: newExperiences });
    }
  };

  const handleRemoveBullet = (expIndex: number, bulletIndex: number) => {
    if (editedResume) {
      const newExperiences = [...editedResume.experiences];
      newExperiences[expIndex].bullets.splice(bulletIndex, 1);
      setEditedResume({ ...editedResume, experiences: newExperiences });
    }
  };

  // Get the current resume to display (edited or original)
  const displayResume = editMode && editedResume ? editedResume : tailoredResume;

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
              {editMode ? (
                <>
                  <button onClick={handleCancelEdit} className="btn-secondary">
                    ✕ Cancel
                  </button>
                  <button onClick={handleSaveChanges} className="btn-primary">
                    💾 Save Changes
                  </button>
                </>
              ) : (
                <>
                  <button onClick={handleEnterEditMode} className="btn-secondary">
                    ✏️ Edit Resume
                  </button>
                  <button 
                    onClick={handleGenerateCoverLetter} 
                    className="btn-secondary"
                    disabled={generatingCoverLetter}
                  >
                    {generatingCoverLetter ? '🤖 Generating...' : '✉️ Cover Letter'}
                  </button>
                  <button onClick={handleDownloadPDF} className="btn-primary">
                    📄 Download PDF
                  </button>
                </>
              )}
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

          {/* Comparison View - only show when not editing */}
          {!editMode && tailoredResume?.profile && (
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

          {editMode && (
            <div className="edit-mode-notice">
              <strong>✏️ Edit Mode:</strong> Make your changes below, then click "Save Changes" when done.
            </div>
          )}

          <div className="resume-preview">
            <div className="resume-header-preview">
              <h1>{displayResume?.profile?.name || 'Your Name'}</h1>
              <div className="contact-info">
                {displayResume?.profile?.email && <span>{displayResume.profile.email}</span>}
                {displayResume?.profile?.phone && <span>{displayResume.profile.phone}</span>}
              </div>
            </div>

            {displayResume?.summary && (
              <div className="resume-section">
                <h2>Professional Summary</h2>
                {editMode ? (
                  <textarea
                    className="editable-summary"
                    value={editedResume?.summary || ''}
                    onChange={(e) => handleSummaryChange(e.target.value)}
                    rows={4}
                  />
                ) : (
                  <p className="summary-text">{displayResume.summary}</p>
                )}
              </div>
            )}

            {displayResume?.profile?.skills && Array.isArray(displayResume.profile.skills) && displayResume.profile.skills.length > 0 && (
              <div className="resume-section">
                <h2>Skills</h2>
                <div className="skills-list">
                  {displayResume.profile.skills.map((skill: string, i: number) => (
                    <span key={i} className="skill-badge">{skill}</span>
                  ))}
                </div>
              </div>
            )}

            {displayResume?.experiences && displayResume.experiences.length > 0 && (
              <div className="resume-section">
                <h2>Professional Experience</h2>
                {displayResume.experiences.map((exp, expIndex) => (
                  <div key={expIndex} className="experience-block">
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
                        {exp.bullets.map((bullet, bulletIndex) => (
                          <li key={bulletIndex} className={editMode ? 'editable-bullet-item' : ''}>
                            {editMode ? (
                              <div className="editable-bullet">
                                <textarea
                                  className="bullet-input"
                                  value={bullet}
                                  onChange={(e) => handleBulletChange(expIndex, bulletIndex, e.target.value)}
                                  rows={2}
                                />
                                <button
                                  className="btn-remove-bullet"
                                  onClick={() => handleRemoveBullet(expIndex, bulletIndex)}
                                  title="Remove bullet"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              bullet
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    {editMode && (
                      <button
                        className="btn-add-bullet"
                        onClick={() => handleAddBullet(expIndex)}
                      >
                        + Add Bullet
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {displayResume?.profile?.educations && displayResume.profile.educations.length > 0 && (
              <div className="resume-section">
                <h2>Education</h2>
                {displayResume.profile.educations.map((edu: any, i: number) => (
                  <div key={i} className="education-block">
                    <h3>{edu.degree}{edu.field && ` in ${edu.field}`}</h3>
                    <div className="institution">{edu.institution}</div>
                    {edu.endDate && <div className="edu-date">{edu.endDate}</div>}
                  </div>
                ))}
              </div>
            )}

            {displayResume?.profile?.certifications && displayResume.profile.certifications.length > 0 && (
              <div className="resume-section">
                <h2>Certifications</h2>
                {displayResume.profile.certifications.map((cert: any, i: number) => (
                  <div key={i} className="cert-block">
                    {cert.name} - {cert.issuer}
                    {cert.date && ` (${cert.date})`}
                  </div>
                ))}
              </div>
            )}
          </div>

          {coverLetter && (
            <div className="cover-letter-section" style={{ marginTop: '3rem' }}>
              <h2>✉️ Generated Cover Letter</h2>
              <div className="form-card" style={{ whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', lineHeight: '1.6', padding: '3rem' }}>
                {coverLetter}
              </div>
              <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                <button 
                  className="btn-primary"
                  onClick={() => {
                    navigator.clipboard.writeText(coverLetter);
                    alert('✅ Cover letter copied to clipboard!');
                  }}
                >
                  📋 Copy to Clipboard
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TailorResumePage;
