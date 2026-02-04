import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

function Navigation() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Close menu when clicking outside
  const handleOverlayClick = () => {
    setIsOpen(false);
  };

  return (
    <>
      <nav className="navigation">
        <div className="nav-brand">
          <h2>🎯 Resume Builder</h2>
        </div>
        
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
