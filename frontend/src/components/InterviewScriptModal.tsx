import { useState, useEffect } from 'react';
import './InterviewScriptModal.css';

interface InterviewScript {
  naturalOpening: string;
  keyPoints: string[];
  closingStatement: string;
  practiceQuestions: string[];
}

interface InterviewScriptModalProps {
  onClose: () => void;
  story: {
    title: string;
    situation: string;
    task: string;
    action: string;
    result: string;
    metrics?: string;
  };
}

function InterviewScriptModal({ onClose, story }: InterviewScriptModalProps) {
  const [script, setScript] = useState<InterviewScript | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    generateScript();
  }, []);

  const generateScript = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:3001/api/stories/to-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(story),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || 'Failed to generate script');
      }

      const data = await res.json();
      setScript(data);
    } catch (err) {
      console.error('Script generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate interview script');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!script) return;

    const text = `
Interview Script: ${story.title}

Opening:
${script.naturalOpening}

Key Points:
${script.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Closing:
${script.closingStatement}

Practice Questions:
${script.practiceQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text);
    alert('✅ Script copied to clipboard!');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content script-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎯 Interview Script</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>✨ Generating your interview script...</p>
            </div>
          )}

          {error && (
            <div className="error-message">{error}</div>
          )}

          {script && !loading && (
            <div className="script-content">
              <div className="script-section">
                <h3>📢 Opening</h3>
                <p className="script-text">{script.naturalOpening}</p>
              </div>

              <div className="script-section">
                <h3>🎯 Key Points to Cover</h3>
                <ul className="key-points-list">
                  {script.keyPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>

              <div className="script-section">
                <h3>💪 Closing Statement</h3>
                <p className="script-text">{script.closingStatement}</p>
              </div>

              <div className="script-section practice-questions">
                <h3>💬 Practice Questions</h3>
                <p className="practice-intro">This story works well for questions like:</p>
                <ul className="questions-list">
                  {script.practiceQuestions.map((q, i) => (
                    <li key={i}>"{q}"</li>
                  ))}
                </ul>
              </div>

              <div className="modal-tip">
                💡 <strong>Tip:</strong> Practice delivering this naturally. Don't memorize word-for-word — use the key points as anchors and speak conversationally!
              </div>
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <button 
            className="btn-secondary" 
            onClick={onClose}
          >
            Close
          </button>
          {script && (
            <button 
              className="btn-primary" 
              onClick={copyToClipboard}
            >
              📋 Copy Script
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default InterviewScriptModal;
