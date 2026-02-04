import { useState, useEffect } from 'react';
import './StoryBankPage.css';

interface Story {
  id: number;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  tags: string;
  metrics?: string;
}

function StoryBankPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [title, setTitle] = useState('');
  const [situation, setSituation] = useState('');
  const [task, setTask] = useState('');
  const [action, setAction] = useState('');
  const [result, setResult] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [metrics, setMetrics] = useState('');

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/stories');
      const data = await res.json();
      setStories(data);
    } catch (error) {
      console.error('Failed to fetch stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setSituation('');
    setTask('');
    setAction('');
    setResult('');
    setTags([]);
    setTagInput('');
    setMetrics('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!title || !situation || !task || !action || !result) {
      alert('Please fill in all STAR fields');
      return;
    }

    const storyData = {
      title,
      situation,
      task,
      action,
      result,
      tags,
      metrics,
    };

    try {
      const url = editingId 
        ? `http://localhost:3001/api/stories/${editingId}`
        : 'http://localhost:3001/api/stories';
      
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storyData),
      });

      if (res.ok) {
        fetchStories();
        resetForm();
      } else {
        alert('Failed to save story');
      }
    } catch (error) {
      console.error('Failed to save story:', error);
      alert('Failed to save story');
    }
  };

  const handleEdit = (story: Story) => {
    setEditingId(story.id);
    setTitle(story.title);
    setSituation(story.situation);
    setTask(story.task);
    setAction(story.action);
    setResult(story.result);
    setTags(JSON.parse(story.tags));
    setMetrics(story.metrics || '');
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this story?')) return;

    try {
      const res = await fetch(`http://localhost:3001/api/stories/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchStories();
      } else {
        alert('Failed to delete story');
      }
    } catch (error) {
      console.error('Failed to delete story:', error);
      alert('Failed to delete story');
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  if (loading) return <div className="loading">Loading stories...</div>;

  return (
    <div className="story-bank-page">
      <div className="page-header">
        <div>
          <h1>Your Story Bank</h1>
          <p className="subtitle">Build a library of achievements using the STAR method</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)} 
          className="btn-primary"
        >
          {showForm ? 'Cancel' : '+ Add Story'}
        </button>
      </div>

      {showForm && (
        <div className="story-form">
          <h2>{editingId ? 'Edit Story' : 'New Story'}</h2>
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Increased Sales by 40%"
            />
          </div>

          <div className="star-section">
            <div className="form-group">
              <label>Situation * (Context & Background)</label>
              <textarea
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                placeholder="Describe the context and background of the situation..."
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Task * (Challenge or Goal)</label>
              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="What was your responsibility or goal?..."
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Action * (What You Did)</label>
              <textarea
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="Describe the specific actions you took..."
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Result * (Outcome & Impact)</label>
              <textarea
                value={result}
                onChange={(e) => setResult(e.target.value)}
                placeholder="What was the measurable outcome?..."
                rows={3}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Metrics (Optional but Recommended)</label>
            <input
              type="text"
              value={metrics}
              onChange={(e) => setMetrics(e.target.value)}
              placeholder="e.g., 40% increase, $2M revenue, 500+ users"
            />
          </div>

          <div className="form-group">
            <label>Tags (Keywords for matching)</label>
            <div className="tags-input">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
                placeholder="Add tags like 'leadership', 'sales', 'technical'..."
              />
              <button onClick={addTag} className="btn-secondary">Add</button>
            </div>
            <div className="tags-list">
              {tags.map((tag, i) => (
                <span key={i} className="tag">
                  {tag}
                  <button onClick={() => removeTag(tag)}>×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button onClick={resetForm} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit} className="btn-primary">
              {editingId ? 'Update Story' : 'Save Story'}
            </button>
          </div>
        </div>
      )}

      <div className="stories-grid">
        {stories.length === 0 ? (
          <div className="empty-state">
            <p>📖 No stories yet. Add your first achievement story!</p>
          </div>
        ) : (
          stories.map((story) => (
            <div key={story.id} className="story-card">
              <div className="story-header">
                <h3>{story.title}</h3>
                <div className="story-actions">
                  <button onClick={() => handleEdit(story)} className="btn-edit">✏️</button>
                  <button onClick={() => handleDelete(story.id)} className="btn-delete">🗑️</button>
                </div>
              </div>
              
              <div className="story-content">
                <div className="star-item">
                  <strong>S:</strong> {story.situation}
                </div>
                <div className="star-item">
                  <strong>T:</strong> {story.task}
                </div>
                <div className="star-item">
                  <strong>A:</strong> {story.action}
                </div>
                <div className="star-item">
                  <strong>R:</strong> {story.result}
                </div>
              </div>

              {story.metrics && (
                <div className="story-metrics">
                  📊 {story.metrics}
                </div>
              )}

              <div className="story-tags">
                {JSON.parse(story.tags).map((tag: string, i: number) => (
                  <span key={i} className="tag">{tag}</span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default StoryBankPage;
