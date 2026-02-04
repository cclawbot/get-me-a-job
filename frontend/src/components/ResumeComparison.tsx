import './ResumeComparison.css';

interface ExperienceChange {
  experienceIndex: number;
  bulletIndex: number;
  original: string;
  tailored: string;
  reasoning: string;
  jdQuote: string;
}

interface ComparisonProps {
  originalProfile: {
    summary?: string;
    experiences?: Array<{
      company: string;
      title: string;
      location?: string;
      startDate: string;
      endDate?: string;
      description?: string;
    }>;
  };
  tailoredResume: {
    summary: string;
    summaryReasoning?: string;
    experiences: Array<{
      company: string;
      title: string;
      location?: string;
      startDate: string;
      endDate?: string;
      bullets: string[];
    }>;
    experienceChanges?: ExperienceChange[];
  };
}

function ResumeComparison({ originalProfile, tailoredResume }: ComparisonProps) {
  return (
    <div className="resume-comparison">
      <div className="comparison-header">
        <h2>📊 Resume Comparison & Change Analysis</h2>
        <p className="comparison-subtitle">
          See how your resume was tailored to match the job description
        </p>
      </div>

      {/* Summary Comparison */}
      {(originalProfile.summary || tailoredResume.summary) && (
        <div className="comparison-section">
          <h3>Professional Summary</h3>
          <div className="comparison-grid">
            <div className="comparison-column original">
              <div className="column-header">
                <span className="column-badge">Original</span>
              </div>
              <div className="content-box">
                {originalProfile.summary ? (
                  <p>{originalProfile.summary}</p>
                ) : (
                  <p className="empty-state">No original summary</p>
                )}
              </div>
            </div>

            <div className="comparison-column tailored">
              <div className="column-header">
                <span className="column-badge">Tailored</span>
              </div>
              <div className="content-box">
                <p>{tailoredResume.summary}</p>
              </div>
            </div>
          </div>

          {tailoredResume.summaryReasoning && (
            <div className="reasoning-box">
              <div className="reasoning-label">💡 Why this change?</div>
              <p>{tailoredResume.summaryReasoning}</p>
            </div>
          )}
        </div>
      )}

      {/* Experience Comparison */}
      {tailoredResume.experiences && tailoredResume.experiences.length > 0 && (
        <div className="comparison-section">
          <h3>Professional Experience</h3>
          
          {tailoredResume.experiences.map((tailoredExp, expIndex) => {
            const originalExp = originalProfile.experiences?.[expIndex];
            const changesForExp = tailoredResume.experienceChanges?.filter(
              (change) => change.experienceIndex === expIndex
            ) || [];

            return (
              <div key={expIndex} className="experience-comparison">
                <div className="experience-title">
                  <strong>{tailoredExp.title}</strong> at {tailoredExp.company}
                  <span className="date-range">
                    {tailoredExp.startDate} - {tailoredExp.endDate || 'Present'}
                  </span>
                </div>

                {changesForExp.length > 0 ? (
                  <div className="bullets-comparison">
                    {changesForExp.map((change, idx) => (
                      <div key={idx} className="bullet-change">
                        <div className="comparison-grid">
                          <div className="comparison-column original">
                            {idx === 0 && (
                              <div className="column-header">
                                <span className="column-badge">Original</span>
                              </div>
                            )}
                            <div className="bullet-box removed">
                              <div className="diff-marker">−</div>
                              <div className="bullet-content">{change.original}</div>
                            </div>
                          </div>

                          <div className="comparison-column tailored">
                            {idx === 0 && (
                              <div className="column-header">
                                <span className="column-badge">Tailored</span>
                              </div>
                            )}
                            <div className="bullet-box added">
                              <div className="diff-marker">+</div>
                              <div className="bullet-content">{change.tailored}</div>
                            </div>
                          </div>
                        </div>

                        <div className="reasoning-box">
                          <div className="reasoning-label">💡 Why this change?</div>
                          <p className="reasoning-text">{change.reasoning}</p>
                          {change.jdQuote && (
                            <div className="jd-quote">
                              <div className="quote-label">📋 From Job Description:</div>
                              <blockquote>"{change.jdQuote}"</blockquote>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-changes-notice">
                    ✓ No changes needed for this experience
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ResumeComparison;
