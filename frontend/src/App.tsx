import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import ProfilePage from './pages/ProfilePage';
import StoryBankPage from './pages/StoryBankPage';
import TailorResumePage from './pages/TailorResumePage';
import ResumesListPage from './pages/ResumesListPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/profile" replace />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/stories" element={<StoryBankPage />} />
            <Route path="/tailor" element={<TailorResumePage />} />
            <Route path="/resumes" element={<ResumesListPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
