import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

function Navigation() {
  const location = useLocation();

  return (
    <nav className="navigation">
      <div className="nav-brand">
        <h2>🎯 Resume Builder</h2>
      </div>
      <div className="nav-links">
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
  );
}

export default Navigation;
