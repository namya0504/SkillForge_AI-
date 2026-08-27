import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { roleAPI, roadmapAPI } from '../../services/api';
import { RefreshCw, Code, CheckCircle, ArrowRight, Zap, Target } from 'lucide-react';
import StepIndicator from '../../components/StepIndicator/StepIndicator';
import './CapstoneSelection.css';

const CapstoneSelection = () => {
  const [capstones, setCapstones] = useState([]);
  const [targetRole, setTargetRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCapstone, setSelectedCapstone] = useState(null);
  const navigate = useNavigate();

  const steps = [
    { num: 1, label: 'Extract Skills' },
    { num: 2, label: 'Target Role' },
    { num: 3, label: 'Capstone' },
    { num: 4, label: 'Roadmap' }
  ];

  useEffect(() => {
    const fetchCapstones = async () => {
      try {
        setLoading(true);
        const { targetRole, customTargetRole } = await roleAPI.getUserTargetRole();
        
        // If they have a curated role
        if (targetRole && targetRole.id) {
          setTargetRole(targetRole.title);
          const res = await roleAPI.getCapstones(targetRole.id);
          const fetchedCapstones = res.capstones || [];
          setCapstones(fetchedCapstones);
          
          if (fetchedCapstones.length === 1) {
            setSelectedCapstone(fetchedCapstones[0]);
          }
        } else if (customTargetRole) {
          setTargetRole(customTargetRole);
          // Zero curated options for custom roles
          setCapstones([]);
        } else {
          // No role set, go back to role selection
          navigate('/role-selection');
        }
      } catch (err) {
        setError('Failed to load capstone options. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchCapstones();
  }, [navigate]);

  const handleGenerate = async (capstoneObj) => {
    try {
      setSaving(true);
      setError(null);
      await roadmapAPI.generateRoadmap(capstoneObj);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to generate roadmap.');
      setSaving(false);
    }
  };

  const handleContinue = () => {
    if (capstones.length > 0 && !selectedCapstone) {
      setError('Please select a capstone project.');
      return;
    }
    // If capstones array is empty, we pass null and the backend LLM generates one.
    handleGenerate(selectedCapstone);
  };

  if (loading) {
    return (
      <div className="capstone-selection-page">
        <div className="loader-container">
          <RefreshCw className="spin-icon" size={32} />
          <p>Analyzing capstone requirements...</p>
        </div>
      </div>
    );
  }

  if (saving) {
    return (
      <div className="capstone-selection-page">
        <div className="loader-container">
          <RefreshCw className="spin-icon" size={48} style={{ color: 'var(--color-accent)' }} />
          <h2 style={{ marginTop: 24, fontSize: '1.5rem', fontWeight: 800 }}>Forging your Roadmap...</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>Designing milestones around your capstone project.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="capstone-selection-page">
      <div className="capstone-container">
        <div className="role-header">
          <h1>Select Your Capstone Project</h1>
          <p>Choose the real-world production project you will build during your learning journey for <strong>{targetRole}</strong>.</p>
        </div>

        <StepIndicator steps={steps} currentStep={3} />

        {error && (
          <div className="error-toast">
            {error}
          </div>
        )}

        {capstones.length === 0 ? (
          <div className="ai-capstone-state">
            <div className="ai-icon-wrapper">
              <Zap size={32} />
            </div>
            <h2>AI-Curated Capstone</h2>
            <p>We don't have hand-curated projects for <strong>{targetRole}</strong> yet. Our Elite AI Architect will dynamically design a production-ready Capstone project specifically for your skill gaps.</p>
            <button className="btn-primary flex-center mt-20" onClick={handleContinue} disabled={saving}>
              Forge My Roadmap <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <>
            <div className="capstones-grid">
              {capstones.map((cap) => (
                <div 
                  key={cap.id} 
                  className={`capstone-card ${selectedCapstone?.id === cap.id ? 'selected' : ''}`}
                  onClick={() => setSelectedCapstone(cap)}
                >
                  {selectedCapstone?.id === cap.id && (
                    <div className="selected-badge">
                      <CheckCircle size={16} /> Selected
                    </div>
                  )}
                  <div className="capstone-diff-badge diff-advanced">
                    <Target size={14} /> {cap.difficulty}
                  </div>
                  <h3>{cap.title}</h3>
                  <p className="cap-desc">{cap.description}</p>
                  
                  <div className="cap-rationale">
                    <span className="label">Why this project:</span> {cap.whyThisProject}
                  </div>

                  <div className="cap-skills">
                    {cap.coreSkillsCovered?.map(skill => (
                      <span key={skill} className="cap-skill-tag">{skill}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="capstone-actions">
              <button className="btn-secondary" onClick={() => navigate('/role-selection')} disabled={saving}>
                Back
              </button>
              <button className="btn-primary flex-center" onClick={handleContinue} disabled={saving || (!selectedCapstone && capstones.length > 0)}>
                {saving ? 'Generating...' : 'Continue'} <ArrowRight size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CapstoneSelection;
