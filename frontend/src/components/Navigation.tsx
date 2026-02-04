import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

export type AIModel = 'claude-sonnet-4-5' | 'claude-haiku-4-5';

function Navigation() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>(() => {
    const saved = localStorage.getItem('ai-model');
    return (saved as AIModel) || 'claude-sonnet-4-5';
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
    const newModel: AIModel = selectedModel === 'claude-sonnet-4-5' ? 'claude-haiku-4-5' : 'claude-sonnet-4-5';
    setSelectedModel(newModel);
    localStorage.setItem('ai-model', newModel);
    
    // Dispatch custom event so other components can react
    window.dispatchEvent(new CustomEvent('ai-model-changed', { detail: newModel }));
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
          title={`Current: ${selectedModel === 'claude-sonnet-4-5' ? 'Sonnet (Powerful)' : 'Haiku (Fast & Cheaper)'}`}
        >
          🤖 {selectedModel === 'claude-sonnet-4-5' ? 'Sonnet' : 'Haiku'}
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
