import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { roleAPI } from '../../services/api';
import StepIndicator from '../../components/StepIndicator/StepIndicator';
import { Target, Search, Sparkles, CheckCircle, AlertCircle, ChevronRight, RefreshCw, Briefcase } from 'lucide-react';
import './RoleSelection.css';

const RoleSelection = () => {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null); // Selected RoleReference object
  const [customRole, setCustomRole] = useState(''); // Custom text string
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [initialRole, setInitialRole] = useState(null); // Saved existing role for regen prompt
  const [showRegenModal, setShowRegenModal] = useState(false);

  const navigate = useNavigate();
  const steps = ['Upload Resume', 'Confirm Skills', 'Select Role'];

  useEffect(() => {
    fetchRolesAndTarget();
  }, []);

  const fetchRolesAndTarget = async () => {
    try {
      setLoading(true);
      const [rolesRes, targetRes] = await Promise.all([
        roleAPI.getRoles(),
        roleAPI.getUserTargetRole()
      ]);

      const allRoles = rolesRes.roles || [];
      setRoles(allRoles);

      // Check if user already has a saved role
      if (targetRes.targetRole) {
        setSelectedRole(targetRes.targetRole);
        setInitialRole(targetRes.targetRole);
      } else if (targetRes.customTargetRole) {
        setCustomRole(targetRes.customTargetRole);
        setIsCustomMode(true);
        setInitialRole({ custom: targetRes.customTargetRole });
      } else if (allRoles.length > 0) {
        // Default to first popular role
        const popularRole = allRoles.find(r => r.isPopular) || allRoles[0];
        setSelectedRole(popularRole);
      }
    } catch (err) {
      setError('Failed to load target roles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredRoles = roles.filter(role => 
    role.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (role.description && role.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const popularRoles = roles.filter(r => r.isPopular);

  const handleSelectRole = (role) => {
    setIsCustomMode(false);
    setSelectedRole(role);
    setCustomRole('');
    setError(null);
  };

  const handleSelectCustom = () => {
    setIsCustomMode(true);
    setSelectedRole(null);
    setError(null);
  };

  const handleSaveAndContinue = async () => {
    if (isCustomMode && (!customRole || !customRole.trim())) {
      setError('Please enter your desired target role.');
      return;
    }
    if (!isCustomMode && !selectedRole) {
      setError('Please select a target role from the list.');
      return;
    }

    // Check if user is changing an existing target role
    const isChangingRole = initialRole && (
      (isCustomMode && initialRole.custom !== customRole.trim()) ||
      (!isCustomMode && initialRole.id !== selectedRole?.id)
    );

    if (isChangingRole) {
      setShowRegenModal(true);
    } else {
      await saveRoleToBackend();
    }
  };

  const saveRoleToBackend = async () => {
    try {
      setSaving(true);
      setError(null);

      const roleIdToSend = isCustomMode ? null : selectedRole?.id;
      const customRoleToSend = isCustomMode ? customRole.trim() : null;

      await roleAPI.saveTargetRole(roleIdToSend, customRoleToSend);
      setShowRegenModal(false);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to save target role.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="role-selection-page">
        <div className="loader-container">
          <RefreshCw className="spin-icon" size={32} />
          <p>Loading curated target roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="role-selection-page">
      <div className="role-container">
        
        <div className="role-header">
          <h1>Select Your Target Role</h1>
          <p>Choose your goal career track. SkillForge AI uses this benchmark to calculate your exact skill gap analysis.</p>
        </div>

        <StepIndicator steps={steps} currentStep={2} />

        {error && (
          <div className="error-message">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="popular-chips-section">
          <span className="chips-label"><Sparkles size={16} /> Top Popular Roles:</span>
          <div className="popular-chips">
            {popularRoles.map(role => (
              <button
                key={role.id}
                type="button"
                className={`chip ${!isCustomMode && selectedRole?.id === role.id ? 'active' : ''}`}
                onClick={() => handleSelectRole(role)}
              >
                {role.title}
              </button>
            ))}
          </div>
        </div>

        <div className="role-content-grid">
          
          {/* Left Column: Role Selector & Search */}
          <div className="role-selector-card">
            
            <div className="search-bar">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search roles by title, category, or skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="roles-list">
              {filteredRoles.map(role => {
                const isSelected = !isCustomMode && selectedRole?.id === role.id;
                return (
                  <div
                    key={role.id}
                    className={`role-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectRole(role)}
                  >
                    <div className="role-item-header">
                      <h3>{role.title}</h3>
                      {role.isPopular && <span className="badge popular">Popular</span>}
                    </div>
                    <span className="category-tag">{role.category}</span>
                    <p className="role-desc">{role.description}</p>
                  </div>
                );
              })}

              {/* Custom Role Item Option */}
              <div
                className={`role-item custom-option ${isCustomMode ? 'selected' : ''}`}
                onClick={handleSelectCustom}
              >
                <div className="role-item-header">
                  <h3>Enter Custom Target Role</h3>
                  <span className="badge custom">Custom</span>
                </div>
                <p className="role-desc">Specify a unique target role if not listed above.</p>
                {isCustomMode && (
                  <div className="custom-input-wrapper" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      placeholder="e.g. AI Prompt Engineer, Senior iOS Developer..."
                      value={customRole}
                      onChange={(e) => setCustomRole(e.target.value)}
                      maxLength={50}
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Selected Role Preview & Required Skills */}
          <div className="role-preview-card">
            <div className="preview-header">
              <div className="preview-icon">
                <Target size={24} />
              </div>
              <div>
                <h2>{isCustomMode ? (customRole || 'Custom Target Role') : selectedRole?.title}</h2>
                <span className="category-tag">
                  {isCustomMode ? 'Custom Career Track' : selectedRole?.category}
                </span>
              </div>
            </div>

            <p className="preview-description">
              {isCustomMode 
                ? 'SkillForge AI will generate a tailored learning path based on your custom target role specification.'
                : selectedRole?.description}
            </p>

            <div className="required-skills-section">
              <h3><Briefcase size={18} /> Required Baseline Skills</h3>
              
              {!isCustomMode && selectedRole?.requiredSkills && selectedRole.requiredSkills.length > 0 ? (
                <div className="required-skills-grid">
                  {selectedRole.requiredSkills.map((sk, idx) => (
                    <div key={idx} className="required-skill-card">
                      <span className="skill-name">{sk.name}</span>
                      <span className={`proficiency-tag ${sk.proficiency?.toLowerCase()}`}>
                        {sk.proficiency}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="custom-skills-notice">
                  <p>Custom role selected. AI will auto-benchmark industry skill expectations upon roadmap generation.</p>
                </div>
              )}
            </div>

            <div className="preview-actions">
              <button
                className="btn-primary full-width cta-button"
                onClick={handleSaveAndContinue}
                disabled={saving}
              >
                {saving ? (
                  <>Saving Selection... <RefreshCw size={18} className="spin-icon" /></>
                ) : (
                  <>Confirm Target Role & Continue <ChevronRight size={18} /></>
                )}
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* Confirmation Modal for Role Change */}
      {showRegenModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <AlertCircle size={28} className="warning-icon" />
              <h2>Update Target Role?</h2>
            </div>
            <p>
              Changing your target role will reset your current target career benchmark. Would you like to save this new target role and update your roadmap?
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowRegenModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={saveRoleToBackend} disabled={saving}>
                {saving ? 'Updating...' : 'Yes, Update Target Role'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default RoleSelection;
