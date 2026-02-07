import { useState } from 'react';
import { getSelectedAIModel } from '../utils/aiModel';
import './ResumeParserModal.css';

interface ParsedResumeData {
  name: string;
  email: string;
  phone: string;
  summary: string;
  skills: string[];
  experiences: any[];
  educations: any[];
  certifications: any[];
}

interface ResumeParserModalProps {
  onClose: () => void;
  onDataParsed: (data: ParsedResumeData) => void;
}

function ResumeParserModal({ onClose, onDataParsed }: ResumeParserModalProps) {
  const [resumeText, setResumeText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');

  const handleParse = async () => {
    if (!resumeText.trim()) {
      setError('Please paste your resume text');
      return;
    }

    setParsing(true);
    setError('');

    try {
      const model = getSelectedAIModel();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/profile/parse-resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, model }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || 'Failed to parse resume');
      }

      const data = await res.json();
      onDataParsed(data);
      onClose();
    } catch (err) {
      console.error('Parse error:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse resume');
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🤖 AI Resume Parser</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <p className="modal-description">
            Paste your resume text below and our AI will automatically extract all the information to fill your profile.
          </p>
          
          <textarea
            className="resume-text-input"
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your resume text here (plain text, not PDF)..."
            rows={15}
          />
          
          {error && (
            <div className="error-message">{error}</div>
          )}
          
          <div className="modal-tip">
            💡 <strong>Tip:</strong> For best results, copy text from your resume (PDF → Select All → Copy) and paste it here. The AI will structure it automatically!
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            className="btn-secondary" 
            onClick={onClose}
            disabled={parsing}
          >
            Cancel
          </button>
          <button 
            className="btn-primary" 
            onClick={handleParse}
            disabled={parsing || !resumeText.trim()}
          >
            {parsing ? '🤖 Parsing with AI...' : '✨ Parse Resume'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResumeParserModal;
