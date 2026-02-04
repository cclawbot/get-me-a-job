import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ResumesListPage.css';

interface Resume {
  id: number;
  jobTitle: string;
  company?: string;
  createdAt: string;
}

function ResumesListPage() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/resumes');
      const data = await res.json();
      setResumes(data);
    } catch (error) {
      console.error('Failed to fetch resumes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = (id: number, jobTitle: string) => {
    window.open(`http://localhost:3001/api/resumes/${id}/pdf`, '_blank');
  };

  const handleDeleteClick = (id: number) => {
    setDeleteConfirm(id);
  };

  const handleDeleteConfirm = async (id: number) => {
    setDeleting(true);
    try {
      const res = await fetch(`http://localhost:3001/api/resumes/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Remove from local state
        setResumes(resumes.filter(r => r.id !== id));
        setDeleteConfirm(null);
      } else {
        alert('Failed to delete resume. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete resume:', error);
      alert('Failed to delete resume. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (loading) return <div className="loading">Loading resumes...</div>;

  return (
    <div className="resumes-list-page">
      <div className="page-header">
        <div>
          <h1>My Tailored Resumes</h1>
          <p className="subtitle">View and download your previously tailored resumes</p>
        </div>
        <button 
          onClick={() => navigate('/tailor')} 
          className="btn-primary"
        >
          + Create New Resume
        </button>
      </div>

      {resumes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h2>No resumes yet</h2>
          <p>Create your first tailored resume to see it here!</p>
          <button 
            onClick={() => navigate('/tailor')} 
            className="btn-primary"
          >
            Tailor a Resume
          </button>
        </div>
      ) : (
        <div className="resumes-grid">
          {resumes.map((resume) => (
            <div key={resume.id} className="resume-card">
              <div className="resume-card-header">
                <div className="resume-icon">📄</div>
                <div className="resume-info">
                  <h3>{resume.jobTitle}</h3>
                  {resume.company && <p className="company">{resume.company}</p>}
                  <p className="date">Created {formatDate(resume.createdAt)}</p>
                </div>
              </div>
              <div className="resume-card-actions">
                <button 
                  onClick={() => handleDownloadPDF(resume.id, resume.jobTitle)}
                  className="btn-download"
                >
                  📥 Download PDF
                </button>
                <button 
                  onClick={() => handleDeleteClick(resume.id)}
                  className="btn-delete"
                  title="Delete resume"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm !== null && (
        <div className="modal-overlay" onClick={handleDeleteCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Resume?</h2>
            <p>Are you sure you want to delete this resume? This action cannot be undone.</p>
            <div className="modal-actions">
              <button 
                onClick={handleDeleteCancel}
                className="btn-cancel"
                disabled={deleting}
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteConfirm(deleteConfirm)}
                className="btn-delete-confirm"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResumesListPage;
