import { useState } from 'react';
import { getSelectedAIModel } from '../utils/aiModel';
import './ResumeParserModal.css'; // Reuse modal styles

interface GeneratedStory {
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  metrics?: string;
  tags: string[];
}

interface StoryGeneratorModalProps {
  onClose: () => void;
  onStoryGenerated: (story: GeneratedStory) => void;
}

function StoryGeneratorModal({ onClose, onStoryGenerated }: StoryGeneratorModalProps) {
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!notes.trim()) {
      setError('Please provide some notes about your achievement');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const model = getSelectedAIModel();
      const res = await fetch('http://localhost:3001/api/stories/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, model }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || 'Failed to generate story');
      }

      const data = await res.json();
      onStoryGenerated(data);
      onClose();
    } catch (err) {
      console.error('Generate error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate story');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✨ AI Story Generator</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <p className="modal-description">
            Describe your achievement or experience in a few sentences, and our AI will create a polished STAR story for you.
          </p>
          
          <textarea
            className="resume-text-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Example: I led a project to migrate our legacy system to the cloud. It was complex because we had 10+ services and needed zero downtime. I planned the migration in phases, coordinated with 5 teams, and we completed it 2 weeks early. The system is now 40% faster and saves $100K/year in hosting costs."
            rows={10}
          />
          
          {error && (
            <div className="error-message">{error}</div>
          )}
          
          <div className="modal-tip">
            💡 <strong>Tip:</strong> Include context, challenges, your specific actions, and measurable results. The more details, the better the story!
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            className="btn-secondary" 
            onClick={onClose}
            disabled={generating}
          >
            Cancel
          </button>
          <button 
            className="btn-primary" 
            onClick={handleGenerate}
            disabled={generating || !notes.trim()}
          >
            {generating ? '✨ Generating Story...' : '🤖 Generate STAR Story'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default StoryGeneratorModal;
