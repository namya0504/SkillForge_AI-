import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useOnboardingStatus } from '../../hooks/useOnboardingStatus';
import { roadmapAPI } from '../../services/api';
import { 
  Target, Sparkles, CheckCircle2, AlertCircle, RefreshCw, 
  Map, Award, FolderGit2, ExternalLink, Clock, ChevronRight, Edit3, ShieldCheck,
  Upload, UserCheck, Compass, ArrowRight, BookOpen, CheckSquare
} from 'lucide-react';
import './Dashboard.css';

/* ──────────────────────────────────────────────────────────
   Empty State — shown when the user hasn't finished onboarding
   ────────────────────────────────────────────────────────── */
const OnboardingEmptyState = ({ hasResume, hasSkills, hasTargetRole, email }) => {
  const steps = [
    {
      done: hasResume || hasSkills, // either uploaded resume OR manually added skills counts
      icon: <Upload size={24} />,
      title: 'Upload Your Resume',
      desc: 'Upload a PDF or DOCX resume so we can extract your skills automatically.',
      link: '/upload',
      btnText: 'Upload Resume',
    },
    {
      done: hasSkills,
      icon: <UserCheck size={24} />,
      title: 'Confirm Your Skills',
      desc: 'Review extracted skills or add them manually to build your profile.',
      link: '/skills-confirm',
      btnText: 'Manage Skills',
    },
    {
      done: hasTargetRole,
      icon: <Compass size={24} />,
      title: 'Select Target Role',
      desc: 'Choose the career role you want to grow into — this powers your personalized roadmap.',
      link: '/role-selection',
      btnText: 'Choose Role',
    },
  ];

  // Find the first incomplete step to highlight
  const nextStep = steps.find(s => !s.done);

  return (
    <div className="dashboard-container center-content">
      <div className="onboarding-empty-state">
        <div className="empty-state-icon">
          <Map size={48} />
        </div>
        <h1>Welcome, {email}!</h1>
        <p className="empty-state-subtitle">
          Complete your profile to unlock your personalized AI-powered career roadmap.
        </p>

        <div className="onboarding-steps">
          {steps.map((step, idx) => (
            <div key={idx} className={`onboarding-step ${step.done ? 'completed' : ''} ${nextStep === step ? 'next' : ''}`}>
              <div className={`step-icon ${step.done ? 'done' : ''}`}>
                {step.done ? <CheckCircle2 size={24} /> : step.icon}
              </div>
              <div className="step-content">
                <h3>
                  <span className="step-number">Step {idx + 1}</span>
                  {step.title}
                  {step.done && <span className="step-badge-done">Completed</span>}
                </h3>
                <p>{step.desc}</p>
              </div>
              {!step.done && (
                <Link to={step.link} className="step-action-btn">
                  {step.btnText} <ArrowRight size={16} />
                </Link>
              )}
            </div>
          ))}
        </div>

        {nextStep && (
          <Link to={nextStep.link} className="btn-primary empty-state-cta">
            {nextStep.btnText} <ArrowRight size={18} />
          </Link>
        )}
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────
   Main Dashboard Component
   ────────────────────────────────────────────────────────── */
const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const onboarding = useOnboardingStatus();

  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('projects');
  const [completedTopics, setCompletedTopics] = useState(new Set());

  useEffect(() => {
    if (user?.id) {
      try {
        const saved = localStorage.getItem(`completed_topics_${user.id}`);
        if (saved) {
          setCompletedTopics(new Set(JSON.parse(saved)));
        }
      } catch (e) {
        console.warn('Failed to load completed topics', e);
      }
    }
  }, [user?.id]);

  const toggleTopicCompleted = (topicKey) => {
    setCompletedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topicKey)) next.delete(topicKey);
      else next.add(topicKey);
      if (user?.id) {
        localStorage.setItem(`completed_topics_${user.id}`, JSON.stringify(Array.from(next)));
      }
      return next;
    });
  };

  useEffect(() => {
    // Don't fetch roadmap until onboarding status is loaded
    if (onboarding.isLoading) return;

    // If onboarding is incomplete, skip roadmap fetch entirely
    if (!onboarding.isComplete) {
      setLoading(false);
      return;
    }

    fetchRoadmap();
  }, [onboarding.isLoading, onboarding.isComplete]);

  useEffect(() => {
    const handleDashboardRefresh = () => {
      onboarding.refresh();
      fetchRoadmap();
    };

    window.addEventListener('refresh-dashboard', handleDashboardRefresh);
    return () => window.removeEventListener('refresh-dashboard', handleDashboardRefresh);
  }, [onboarding]);

  const fetchRoadmap = async () => {
    try {
      setLoading(true);
      const res = await roadmapAPI.getRoadmap();
      if (res.roadmap) {
        setRoadmap(res.roadmap);
      }
      // Don't auto-generate — let the user click "Generate" explicitly
    } catch (err) {
      // Roadmap doesn't exist yet — that's fine, show generate prompt
      setRoadmap(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError(null);
      const res = await roadmapAPI.generateRoadmap();
      setRoadmap(res.roadmap);
    } catch (err) {
      setError(err.message || 'Failed to generate roadmap.');
    } finally {
      setGenerating(false);
    }
  };

  // ── Loading state ──
  if (loading || onboarding.isLoading) {
    return (
      <div className="dashboard-container center-content">
        <div className="loader-box">
          <RefreshCw size={36} className="spin-icon text-teal" />
          <h2>Loading Your Dashboard...</h2>
          <p>Checking your profile and roadmap status.</p>
        </div>
      </div>
    );
  }

  // ── Onboarding incomplete → show empty state (BUG-01 + BUG-07 fix) ──
  if (!onboarding.isComplete) {
    return (
      <OnboardingEmptyState
        hasResume={onboarding.hasResume}
        hasSkills={onboarding.hasSkills}
        hasTargetRole={onboarding.hasTargetRole}
        email={user?.email}
      />
    );
  }

  // ── Onboarding complete but no roadmap generated yet ──
  if (!roadmap) {
    return (
      <div className="dashboard-container center-content">
        <div className="onboarding-empty-state">
          <div className="empty-state-icon">
            <Sparkles size={48} />
          </div>
          <h1>Your Profile Is Ready!</h1>
          <p className="empty-state-subtitle">
            You've completed all onboarding steps. Generate your personalized AI career roadmap now.
          </p>
          {error && (
            <div className="error-message" style={{ marginBottom: '16px' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}
          <button className="btn-primary empty-state-cta" onClick={handleGenerate} disabled={generating}>
            <RefreshCw size={18} className={generating ? 'spin-icon' : ''} />
            {generating ? 'Generating...' : 'Generate Your Roadmap'}
          </button>
        </div>
      </div>
    );
  }

  // ── Full roadmap dashboard ──
  const gapAnalysis = roadmap?.gapAnalysis || { matchedSkills: [], levelGaps: [], missingSkills: [] };
  const milestones = roadmap?.milestones || [];
  const recommendations = roadmap?.recommendations || { projects: [], certifications: [] };

  const matchedCount = gapAnalysis.matchedSkills?.length || 0;
  const gapCount = (gapAnalysis.levelGaps?.length || 0) + (gapAnalysis.missingSkills?.length || 0);
  const totalSkillsCount = matchedCount + gapCount;
  const matchPercentage = totalSkillsCount > 0 ? Math.round((matchedCount / totalSkillsCount) * 100) : 0;

  return (
    <div className="dashboard-container">
      
      {/* Top Banner: User Greeting & Target Role */}
      <header className="dashboard-banner">
        <div className="banner-left">
          <div className="role-icon-badge">
            <Target size={28} />
          </div>
          <div>
            <div className="user-greeting">Welcome back, {user?.email}!</div>
            <h1 className="target-role-heading">
              Target Goal: <span>{roadmap?.targetRoleTitle || 'Target Role'}</span>
            </h1>
          </div>
        </div>
        <div className="banner-actions">
          <button className="btn-secondary flex-center" onClick={() => navigate('/upload')}>
            <Upload size={16} /> Update Resume
          </button>
          <button className="btn-secondary flex-center" onClick={() => navigate('/role-selection')}>
            <Edit3 size={16} /> Change Goal Role
          </button>
          <button className="btn-primary flex-center" onClick={handleGenerate} disabled={generating}>
            <RefreshCw size={16} className={generating ? 'spin-icon' : ''} />
            {generating ? 'Regenerating...' : 'Regenerate Roadmap'}
          </button>
        </div>
      </header>

      {error && (
        <div className="error-message">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="dashboard-main-grid">

        {/* Left Column: Skill Gap Analysis & Milestone Timeline (Feature 5) */}
        <div className="roadmap-column">

          {/* Skill Gap Summary Card */}
          <div className="gap-analysis-card">
            <div className="gap-card-header">
              <h2><Sparkles size={20} className="text-amber" /> Skill Gap Benchmark Analysis</h2>
              <span className="match-score-badge">{matchPercentage}% Match</span>
            </div>

            <div className="gap-progress-bar-container">
              <div className="gap-progress-bar" style={{ width: `${matchPercentage}%` }}></div>
            </div>

            <div className="gap-stats-grid">
              <div className="gap-stat matched">
                <span className="stat-num">{matchedCount}</span>
                <span className="stat-label"><CheckCircle2 size={14} /> Matched Skills</span>
              </div>
              <div className="gap-stat level-gap">
                <span className="stat-num">{gapAnalysis.levelGaps?.length || 0}</span>
                <span className="stat-label"><RefreshCw size={14} /> Level Gaps</span>
              </div>
              <div className="gap-stat missing">
                <span className="stat-num">{gapAnalysis.missingSkills?.length || 0}</span>
                <span className="stat-label"><AlertCircle size={14} /> Missing Skills</span>
              </div>
            </div>

            {/* Gap Skills Pills */}
            <div className="gap-skills-tags">
              {gapAnalysis.missingSkills?.map((s, i) => (
                <span key={`miss-${i}`} className="tag missing-tag">
                  + {s.name} ({s.targetProficiency})
                </span>
              ))}
              {gapAnalysis.levelGaps?.map((s, i) => (
                <span key={`gap-${i}`} className="tag levelgap-tag">
                  ↑ {s.name} ({s.currentProficiency} → {s.targetProficiency})
                </span>
              ))}
              {gapAnalysis.matchedSkills?.map((s, i) => (
                <span key={`match-${i}`} className="tag matched-tag">
                  ✓ {s.name}
                </span>
              ))}
            </div>
          </div>

          {/* Milestone Learning Timeline (Feature 5) */}
          <div className="milestones-section">
            {(() => {
              let totalTopicsCount = 0;
              milestones.forEach((m) => {
                (m.topics || []).forEach(() => totalTopicsCount++);
              });

              let completedCount = 0;
              completedTopics.forEach(k => {
                if (k.startsWith('m-')) completedCount++;
              });

              const overallProgress = totalTopicsCount > 0 
                ? Math.min(100, Math.round((completedCount / totalTopicsCount) * 100)) 
                : 0;

              return (
                <>
                  <div className="section-title flex-between">
                    <div className="flex-center gap-sm">
                      <Map size={22} className="text-teal" />
                      <h2>Personalized Learning Path</h2>
                    </div>
                    <div className="progress-badge flex-center gap-xs">
                      <CheckSquare size={16} className="text-teal" />
                      <span>{completedCount} / {totalTopicsCount} Tasks Done ({overallProgress}%)</span>
                    </div>
                  </div>

                  {/* Overall Progress Bar */}
                  <div className="overall-progress-card">
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${overallProgress}%` }}></div>
                    </div>
                  </div>

                  <div className="milestones-timeline">
                    {milestones.map((m, idx) => {
                      const phaseTopics = m.topics || [];
                      const phaseCompleted = phaseTopics.filter((_, tIdx) => completedTopics.has(`m-${idx}-t-${tIdx}`)).length;
                      const phaseProgressPercent = phaseTopics.length > 0 ? Math.round((phaseCompleted / phaseTopics.length) * 100) : 0;

                      return (
                        <div key={idx} className="milestone-card">
                          <div className="milestone-badge flex-between">
                            <div className="flex-center gap-xs">
                              <span className="phase-num">Phase {m.phase || idx + 1}</span>
                              <span className="phase-duration"><Clock size={13} /> {m.duration}</span>
                            </div>
                            <span className="phase-progress-text">{phaseCompleted}/{phaseTopics.length} Done ({phaseProgressPercent}%)</span>
                          </div>

                          <h3>{m.title}</h3>
                          <p className="milestone-desc">{m.description}</p>

                          <div className="milestone-topics">
                            <h4>Key Focus Topics & Learning Resources:</h4>
                            <ul className="topics-checklist">
                              {phaseTopics.map((topicItem, tIdx) => {
                                const topicKey = `m-${idx}-t-${tIdx}`;
                                const isDone = completedTopics.has(topicKey);
                                const topicTitle = typeof topicItem === 'object' ? topicItem.title : topicItem;
                                const resource = typeof topicItem === 'object' ? topicItem.resource : null;

                                return (
                                  <li key={tIdx} className={`topic-item ${isDone ? 'completed' : ''}`}>
                                    <label className="checkbox-label">
                                      <input
                                        type="checkbox"
                                        checked={isDone}
                                        onChange={() => toggleTopicCompleted(topicKey)}
                                      />
                                      <span className="topic-text">{topicTitle}</span>
                                    </label>

                                    {resource && resource.url && (
                                      <a 
                                        href={resource.url} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="resource-link-chip"
                                        title={`Open ${resource.title}`}
                                      >
                                        <BookOpen size={12} /> {resource.title} <ExternalLink size={10} />
                                      </a>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>

                          {m.targetSkills && (
                            <div className="milestone-skills">
                              {m.targetSkills.map((sk, skIdx) => (
                                <span key={skIdx} className="milestone-skill-chip">{sk}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>

        </div>

        {/* Right Column: Project & Certification Recommendations Panel (Feature 6) */}
        <div className="recommendations-column">
          
          <div className="recommendations-card">
            
            <div className="recs-header">
              <h2><Award size={22} className="text-amber" /> Recommendations</h2>
              <div className="recs-tabs">
                <button 
                  className={`tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
                  onClick={() => setActiveTab('projects')}
                >
                  <FolderGit2 size={16} /> Projects ({recommendations.projects?.length || 0})
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'certifications' ? 'active' : ''}`}
                  onClick={() => setActiveTab('certifications')}
                >
                  <ShieldCheck size={16} /> Certifications ({recommendations.certifications?.length || 0})
                </button>
              </div>
            </div>

            {/* Projects Tab Panel (Feature 6) */}
            {activeTab === 'projects' && (
              <div className="recs-list">
                {recommendations.projects?.length === 0 ? (
                  <p className="no-recs">No project recommendations available.</p>
                ) : (
                  recommendations.projects?.map((proj) => (
                    <div key={proj.id} className="rec-item project-item">
                      <div className="rec-item-top">
                        <h3>{proj.title}</h3>
                        <div className="rec-badges">
                          <span className={`badge diff-${proj.difficulty?.toLowerCase()}`}>
                            {proj.difficulty}
                          </span>
                          {proj.estimatedHours && (
                            <span className="badge hours-badge"><Clock size={12} /> {proj.estimatedHours}</span>
                          )}
                        </div>
                      </div>

                      <p className="rec-desc">{proj.description}</p>

                      {/* Traceable Rationale Requirement (FR-6) */}
                      <div className="rationale-box">
                        <strong>Why this project?</strong> {proj.rationale}
                      </div>

                      <div className="rec-skills">
                        {proj.targetSkills?.map((sk, i) => (
                          <span key={i} className="rec-skill-tag">{sk}</span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Certifications Tab Panel (Feature 6) */}
            {activeTab === 'certifications' && (
              <div className="recs-list">
                {recommendations.certifications?.length === 0 ? (
                  <p className="no-recs">No certification recommendations available.</p>
                ) : (
                  recommendations.certifications?.map((cert) => (
                    <div key={cert.id} className="rec-item cert-item">
                      <div className="rec-item-top">
                        <div>
                          <h3>{cert.title}</h3>
                          <span className="cert-issuer">Issued by {cert.issuer}</span>
                        </div>
                        <div className="rec-badges">
                          <span className={`badge cost-${cert.costType?.toLowerCase() || 'paid'}`}>
                            {cert.costType || 'Paid'}
                          </span>
                          <span className={`badge diff-${cert.difficulty?.toLowerCase()}`}>
                            {cert.difficulty}
                          </span>
                        </div>
                      </div>

                      {/* Traceable Rationale Requirement (FR-6) */}
                      <div className="rationale-box">
                        <strong>Why this certification?</strong> {cert.rationale}
                      </div>

                      <div className="cert-footer">
                        <div className="rec-skills">
                          {cert.targetSkills?.map((sk, i) => (
                            <span key={i} className="rec-skill-tag">{sk}</span>
                          ))}
                        </div>

                        {cert.url && (
                          <a href={cert.url} target="_blank" rel="noopener noreferrer" className="cert-link">
                            View Cert <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};

export default Dashboard;
