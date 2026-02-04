import './ResumeComparison.css';

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

          {tailoredResume.summaryReasoningPoints && tailoredResume.summaryReasoningPoints.length > 0 && (
            <div className="reasoning-box">
              <div className="reasoning-label">💡 Why this change?</div>
              <ul className="reasoning-list">
                {tailoredResume.summaryReasoningPoints.map((point, idx) => (
                  <li key={idx}>{point}</li>
                ))}
              </ul>
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

            return (
              <div key={expIndex} className="experience-comparison">
                <div className="experience-title">
                  <strong>{tailoredExp.title}</strong> at {tailoredExp.company}
                  <span className="date-range">
                    {tailoredExp.startDate} - {tailoredExp.endDate || 'Present'}
                  </span>
                </div>

                <div className="comparison-grid">
                  <div className="comparison-column original">
                    <div className="column-header">
                      <span className="column-badge">Original</span>
                    </div>
                    <div className="content-box">
                      {originalExp?.description ? (
                        <p>{originalExp.description}</p>
                      ) : (
                        <p className="empty-state">No original description</p>
                      )}
                    </div>
                  </div>

                  <div className="comparison-column tailored">
                    <div className="column-header">
                      <span className="column-badge">Tailored</span>
                    </div>
                    <div className="content-box">
                      {tailoredExp.bullets && tailoredExp.bullets.length > 0 ? (
                        <ul className="bullet-list">
                          {tailoredExp.bullets.map((bullet, idx) => (
                            <li key={idx}>{bullet}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="empty-state">No tailored bullets</p>
                      )}
                    </div>
                  </div>
                </div>

                {tailoredExp.reasoningPoints && tailoredExp.reasoningPoints.length > 0 && (
                  <div className="reasoning-box">
                    <div className="reasoning-label">💡 Why this change?</div>
                    <ul className="reasoning-list">
                      {tailoredExp.reasoningPoints.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
          
          {tailoredResume.tailoringNotesPoints && tailoredResume.tailoringNotesPoints.length > 0 && (
            <div className="reasoning-box" style={{ marginTop: '1.5rem' }}>
              <div className="reasoning-label">💡 Overall Tailoring Strategy</div>
              <ul className="reasoning-list">
                {tailoredResume.tailoringNotesPoints.map((point, idx) => (
                  <li key={idx}>{point}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ResumeComparison;
