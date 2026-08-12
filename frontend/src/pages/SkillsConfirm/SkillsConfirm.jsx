import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { skillAPI } from '../../services/api';
import './SkillsConfirm.css';
import { CheckCircle, Plus, X, AlertCircle, Edit2 } from 'lucide-react';

const SkillsConfirm = () => {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newSkill, setNewSkill] = useState('');
  const [newProficiency, setNewProficiency] = useState('Beginner');
  const navigate = useNavigate();

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      const { data } = await skillAPI.getSkills();
      setSkills(data.skills);
    } catch (err) {
      setError('Failed to load skills.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = async (e) => {
    e.preventDefault();
    if (!newSkill.trim()) return;

    const skillToAdd = {
      id: `temp-${Date.now()}`,
      skillName: newSkill.trim().toLowerCase(),
      proficiency: newProficiency,
      source: 'manual'
    };

    // Optimistic UI update
    setSkills(prev => [...prev, skillToAdd]);
    setNewSkill('');

    try {
      const { data } = await skillAPI.addSkill(skillToAdd.skillName, skillToAdd.proficiency);
      // Replace temp id with real id
      setSkills(prev => prev.map(s => s.id === skillToAdd.id ? data.skill : s));
    } catch (err) {
      // Revert on failure
      setSkills(prev => prev.filter(s => s.id !== skillToAdd.id));
      setError('Failed to add skill.');
    }
  };

  const handleDelete = async (id) => {
    // Optimistic update
    const previousSkills = [...skills];
    setSkills(prev => prev.filter(s => s.id !== id));

    try {
      if (!id.startsWith('temp-')) {
        await skillAPI.deleteSkill(id);
      }
    } catch (err) {
      // Revert on failure
      setSkills(previousSkills);
      setError('Failed to delete skill.');
    }
  };

  const handleProficiencyChange = async (id, newProficiency) => {
    if (id.startsWith('temp-')) return; // Wait for real ID

    // Optimistic update
    const previousSkills = [...skills];
    setSkills(prev => prev.map(s => s.id === id ? { ...s, proficiency: newProficiency } : s));

    try {
      await skillAPI.updateSkill(id, newProficiency);
    } catch (err) {
      // Revert on failure
      setSkills(previousSkills);
      setError('Failed to update proficiency.');
    }
  };

  const handleContinue = () => {
    navigate('/role-selection'); // Next phase
  };

  if (loading) return <div className="skills-page"><div className="loader"></div></div>;

  return (
    <div className="skills-page">
      <div className="skills-container">
        
        <div className="skills-header">
          <h1>Confirm Your Skills</h1>
          <p>We've extracted these skills from your resume. Feel free to add more or adjust your proficiency levels.</p>
        </div>

        <div className="step-indicator-container">
          <div className="step-indicator-wrapper">
            <div className="step-item completed">
              <div className="step-circle"><CheckCircle size={20} /></div>
              <span className="step-label">Upload Resume</span>
            </div>
            <div className="step-line completed"></div>
            <div className="step-item active">
              <div className="step-circle">2</div>
              <span className="step-label">Confirm Skills</span>
            </div>
            <div className="step-line"></div>
            <div className="step-item">
              <div className="step-circle">3</div>
              <span className="step-label">Select Role</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="skills-content">
          <form onSubmit={handleAddSkill} className="add-skill-form">
            <input
              type="text"
              placeholder="e.g. React, Python, UI/UX"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              maxLength={50}
              required
            />
            <select
              value={newProficiency}
              onChange={(e) => setNewProficiency(e.target.value)}
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
            <button type="submit" className="btn-primary btn-icon">
              <Plus size={18} /> Add
            </button>
          </form>

          <div className="skills-list">
            {skills.length === 0 ? (
              <div className="empty-state">No skills found. Try adding some above!</div>
            ) : (
              skills.map(skill => (
                <div key={skill.id} className="skill-card">
                  <div className="skill-info">
                    <h3>{skill.skillName.charAt(0).toUpperCase() + skill.skillName.slice(1)}</h3>
                    {skill.source === 'extracted' && <span className="badge extracted">Extracted</span>}
                  </div>
                  
                  <div className="skill-actions">
                    <select
                      className="proficiency-select"
                      value={skill.proficiency}
                      onChange={(e) => handleProficiencyChange(skill.id, e.target.value)}
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                    
                    <button 
                      onClick={() => handleDelete(skill.id)} 
                      className="btn-icon-danger"
                      aria-label="Delete skill"
                      data-testid={`delete-${skill.skillName}`}
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="skills-footer">
          <button onClick={handleContinue} className="btn-primary cta-button">
            Continue
          </button>
        </div>

      </div>
    </div>
  );
};

export default SkillsConfirm;
