import { useState, useEffect } from 'react';
import ResumeParserModal from '../components/ResumeParserModal';
import './ProfilePage.css';

interface WorkExperience {
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description?: string;
}

interface Education {
  institution: string;
  degree: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
}

interface Certification {
  name: string;
  issuer: string;
  date?: string;
  url?: string;
}

function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showParserModal, setShowParserModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [summary, setSummary] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [experiences, setExperiences] = useState<WorkExperience[]>([]);
  const [educations, setEducations] = useState<Education[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/profile');
      const data = await res.json();
      
      setName(data.name || '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
      setSummary(data.summary || '');
      setSkills(JSON.parse(data.skills || '[]'));
      setExperiences(data.experiences || []);
      setEducations(data.educations || []);
      setCertifications(data.certifications || []);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('http://localhost:3001/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          summary,
          skills,
          experiences,
          educations,
          certifications,
        }),
      });
      
      if (res.ok) {
        alert('Profile saved successfully!');
      } else {
        alert('Failed to save profile');
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const addExperience = () => {
    setExperiences([...experiences, {
      company: '',
      title: '',
      location: '',
      startDate: '',
      current: false,
    }]);
  };

  const updateExperience = (index: number, field: string, value: any) => {
    const updated = [...experiences];
    updated[index] = { ...updated[index], [field]: value };
    setExperiences(updated);
  };

  const removeExperience = (index: number) => {
    setExperiences(experiences.filter((_, i) => i !== index));
  };

  const addEducation = () => {
    setEducations([...educations, {
      institution: '',
      degree: '',
      field: '',
    }]);
  };

  const updateEducation = (index: number, field: string, value: any) => {
    const updated = [...educations];
    updated[index] = { ...updated[index], [field]: value };
    setEducations(updated);
  };

  const removeEducation = (index: number) => {
    setEducations(educations.filter((_, i) => i !== index));
  };

  const addCertification = () => {
    setCertifications([...certifications, {
      name: '',
      issuer: '',
    }]);
  };

  const updateCertification = (index: number, field: string, value: any) => {
    const updated = [...certifications];
    updated[index] = { ...updated[index], [field]: value };
    setCertifications(updated);
  };

  const removeCertification = (index: number) => {
    setCertifications(certifications.filter((_, i) => i !== index));
  };

  const handleParsedResume = (data: any) => {
    // Populate all fields with parsed data
    setName(data.name || '');
    setEmail(data.email || '');
    setPhone(data.phone || '');
    setSummary(data.summary || '');
    setSkills(data.skills || []);
    setExperiences(data.experiences || []);
    setEducations(data.educations || []);
    setCertifications(data.certifications || []);
    
    alert('✅ Resume parsed successfully! Review the information and click Save.');
  };

  if (loading) return <div className="loading">Loading profile...</div>;

  return (
    <div className="profile-page">
      <div className="page-header">
        <div>
          <h1>Build Your Profile</h1>
          <p className="subtitle">Complete your profile to get started with resume tailoring</p>
        </div>
        <button 
          className="btn-primary" 
          onClick={() => setShowParserModal(true)}
          style={{ whiteSpace: 'nowrap' }}
        >
          🤖 Import Resume with AI
        </button>
      </div>

      <div className="profile-form">
        <section className="form-section">
          <h2>Basic Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Professional Summary</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief overview of your professional background..."
              rows={4}
            />
          </div>
        </section>

        <section className="form-section">
          <h2>Skills</h2>
          <div className="skills-input">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addSkill()}
              placeholder="Add a skill (press Enter)"
            />
            <button onClick={addSkill} className="btn-secondary">Add</button>
          </div>
          <div className="skills-list">
            {skills.map((skill, i) => (
              <span key={i} className="skill-tag">
                {skill}
                <button onClick={() => removeSkill(skill)}>×</button>
              </span>
            ))}
          </div>
        </section>

        <section className="form-section">
          <div className="section-header">
            <h2>Work Experience</h2>
            <button onClick={addExperience} className="btn-secondary">+ Add Experience</button>
          </div>
          {experiences.map((exp, i) => (
            <div key={i} className="item-card">
              <div className="card-header">
                <h3>Experience {i + 1}</h3>
                <button onClick={() => removeExperience(i)} className="btn-danger-small">Remove</button>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Company *</label>
                  <input
                    type="text"
                    value={exp.company}
                    onChange={(e) => updateExperience(i, 'company', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Job Title *</label>
                  <input
                    type="text"
                    value={exp.title}
                    onChange={(e) => updateExperience(i, 'title', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={exp.location}
                    onChange={(e) => updateExperience(i, 'location', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Start Date *</label>
                  <input
                    type="text"
                    value={exp.startDate}
                    onChange={(e) => updateExperience(i, 'startDate', e.target.value)}
                    placeholder="Jan 2020"
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="text"
                    value={exp.endDate || ''}
                    onChange={(e) => updateExperience(i, 'endDate', e.target.value)}
                    placeholder="Dec 2022"
                    disabled={exp.current}
                  />
                </div>
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={exp.current}
                      onChange={(e) => updateExperience(i, 'current', e.target.checked)}
                    />
                    Currently working here
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>Description / Key Achievements</label>
                <textarea
                  value={exp.description || ''}
                  onChange={(e) => updateExperience(i, 'description', e.target.value)}
                  placeholder="• Lead end-to-end requirements delivery for complex banking platforms&#10;• Translate business needs into detailed technical requirements&#10;• Partner closely with solution architects and engineers&#10;• Facilitate workshops with senior stakeholders"
                  rows={6}
                  style={{ fontFamily: 'monospace', fontSize: '0.9em' }}
                />
              </div>
            </div>
          ))}
        </section>

        <section className="form-section">
          <div className="section-header">
            <h2>Education</h2>
            <button onClick={addEducation} className="btn-secondary">+ Add Education</button>
          </div>
          {educations.map((edu, i) => (
            <div key={i} className="item-card">
              <div className="card-header">
                <h3>Education {i + 1}</h3>
                <button onClick={() => removeEducation(i)} className="btn-danger-small">Remove</button>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Institution *</label>
                  <input
                    type="text"
                    value={edu.institution}
                    onChange={(e) => updateEducation(i, 'institution', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Degree *</label>
                  <input
                    type="text"
                    value={edu.degree}
                    onChange={(e) => updateEducation(i, 'degree', e.target.value)}
                    placeholder="Bachelor of Science"
                  />
                </div>
                <div className="form-group">
                  <label>Field of Study</label>
                  <input
                    type="text"
                    value={edu.field || ''}
                    onChange={(e) => updateEducation(i, 'field', e.target.value)}
                    placeholder="Computer Science"
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="text"
                    value={edu.endDate || ''}
                    onChange={(e) => updateEducation(i, 'endDate', e.target.value)}
                    placeholder="May 2020"
                  />
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="form-section">
          <div className="section-header">
            <h2>Certifications</h2>
            <button onClick={addCertification} className="btn-secondary">+ Add Certification</button>
          </div>
          {certifications.map((cert, i) => (
            <div key={i} className="item-card">
              <div className="card-header">
                <h3>Certification {i + 1}</h3>
                <button onClick={() => removeCertification(i)} className="btn-danger-small">Remove</button>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={cert.name}
                    onChange={(e) => updateCertification(i, 'name', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Issuing Organization *</label>
                  <input
                    type="text"
                    value={cert.issuer}
                    onChange={(e) => updateCertification(i, 'issuer', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="text"
                    value={cert.date || ''}
                    onChange={(e) => updateCertification(i, 'date', e.target.value)}
                    placeholder="Jan 2023"
                  />
                </div>
              </div>
            </div>
          ))}
        </section>

        <div className="form-actions">
          <button onClick={saveProfile} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>

      {showParserModal && (
        <ResumeParserModal
          onClose={() => setShowParserModal(false)}
          onDataParsed={handleParsedResume}
        />
      )}
    </div>
  );
}

export default ProfilePage;
