import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';
import { ENABLE_CLAUDE } from '../utils/aiModel';

export type AIModel = 'claude-sonnet-4-5-20250929' | 'claude-haiku-4-5-20251001' | 'google-gemini-cli/gemini-3-flash-preview' | 'google-gemini-cli/gemini-3-pro-preview';

function Navigation() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>(() => {
    const saved = localStorage.getItem('ai-model');
    const model = (saved as AIModel) || 'google-gemini-cli/gemini-3-flash-preview';
    
    if (!ENABLE_CLAUDE && model.startsWith('claude-')) {
      return 'google-gemini-cli/gemini-3-flash-preview';
    }
    return model;
  });

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Close menu when clicking outside
  const handleOverlayClick = () => {
    setIsOpen(false);
  };

  // Toggle AI model
  const handleModelToggle = () => {
    const allModels: AIModel[] = [
      'claude-sonnet-4-5-20250929',
      'claude-haiku-4-5-20251001',
      'google-gemini-cli/gemini-3-flash-preview',
      'google-gemini-cli/gemini-3-pro-preview'
    ];
    
    const availableModels = allModels.filter(m => ENABLE_CLAUDE || !m.startsWith('claude-'));
    
    const currentIndex = availableModels.indexOf(selectedModel);
    const nextIndex = (currentIndex + 1) % availableModels.length;
    const newModel = availableModels[nextIndex];
    
    setSelectedModel(newModel);
    localStorage.setItem('ai-model', newModel);
    
    // Dispatch custom event so other components can react
    window.dispatchEvent(new CustomEvent('ai-model-changed', { detail: newModel }));
  };

  const getModelLabel = (model: AIModel) => {
    switch (model) {
      case 'claude-sonnet-4-5-20250929': return 'Sonnet 4.5';
      case 'claude-haiku-4-5-20251001': return 'Haiku 4.5';
      case 'google-gemini-cli/gemini-3-flash-preview': return 'G3 Flash';
      case 'google-gemini-cli/gemini-3-pro-preview': return 'G3 Pro';
      default: return '🤖 AI';
    }
  };

  const getModelTooltip = (model: AIModel) => {
    switch (model) {
      case 'claude-sonnet-4-5-20250929': return 'Sonnet 4.5 (Most Powerful)';
      case 'claude-haiku-4-5-20251001': return 'Haiku 4.5 (Fast & Efficient)';
      case 'google-gemini-cli/gemini-3-flash-preview': return 'Gemini 3 Flash (Lightning Fast)';
      case 'google-gemini-cli/gemini-3-pro-preview': return 'Gemini 3 Pro (Highly Capable)';
      default: return 'Select AI Model';
    }
  };

  return (
    <>
      <nav className="navigation">
        <div className="nav-brand">
          <h2>🎯 Resume Builder</h2>
        </div>

        <button 
          className="model-toggle" 
          onClick={handleModelToggle}
          title={`Current: ${getModelTooltip(selectedModel)}`}
        >
          🤖 {getModelLabel(selectedModel)}
        </button>
        
        <button 
          className="nav-toggle" 
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
          aria-expanded={isOpen}
        >
          {isOpen ? '✕' : '☰'}
        </button>

        <div className={`nav-links ${isOpen ? 'open' : ''}`}>
          <Link 
            to="/jobs" 
            className={location.pathname === '/jobs' ? 'active' : ''}
          >
            🔍 Find Jobs
          </Link>
          <Link 
            to="/profile" 
            className={location.pathname === '/profile' ? 'active' : ''}
          >
            📝 Profile
          </Link>
          <Link 
            to="/stories" 
            className={location.pathname === '/stories' ? 'active' : ''}
          >
            ⭐ Story Bank
          </Link>
          <Link 
            to="/tailor" 
            className={location.pathname === '/tailor' ? 'active' : ''}
          >
            🎨 Tailor Resume
          </Link>
          <Link 
            to="/resumes" 
            className={location.pathname === '/resumes' ? 'active' : ''}
          >
            📄 My Resumes
          </Link>
        </div>
      </nav>
      
      {/* Overlay for mobile menu */}
      <div 
        className={`nav-overlay ${isOpen ? 'visible' : ''}`}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />
    </>
  );
}

export default Navigation;
