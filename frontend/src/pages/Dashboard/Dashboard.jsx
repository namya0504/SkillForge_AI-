import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useOnboardingStatus } from '../../hooks/useOnboardingStatus';
import { roadmapAPI, progressAPI, certificationAPI } from '../../services/api';
import { 
  Target, Sparkles, CheckCircle2, AlertCircle, RefreshCw, 
  Map, Award, FolderGit2, ExternalLink, Clock, ChevronRight, ChevronDown, Edit3, ShieldCheck,
  Upload, UserCheck, Compass, ArrowRight, ArrowLeft, Code, BookOpen, CheckSquare, Trophy, Zap, TrendingUp, Check, Download
} from 'lucide-react';
import './Dashboard.css';

/* ──────────────────────────────────────────────────────────
   Empty State — shown when the user hasn't finished onboarding
   ────────────────────────────────────────────────────────── */
const OnboardingEmptyState = ({ hasResume, hasSkills, hasTargetRole, email }) => {
  const steps = [
    {
      done: hasResume || hasSkills,
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
      link: '/skills',
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
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('projects');
  
  // Server-synced progress state: { [itemId]: 'not_started' | 'in_progress' | 'completed' }
  const [progressMap, setProgressMap] = useState({});
  const [certProgressMap, setCertProgressMap] = useState({});
  const [progressSummary, setProgressSummary] = useState({
    totalItems: 0,
    completedItems: 0,
    inProgressItems: 0,
    completionPercent: 0
  });

  // Collapsed phases state: { [phaseIndex]: boolean }
  const [collapsedPhases, setCollapsedPhases] = useState({});
  const [achievementToast, setAchievementToast] = useState(null);

  useEffect(() => {
    // Don't fetch roadmap until onboarding status is loaded
    if (onboarding.isLoading) return;

    // If onboarding is incomplete, skip roadmap fetch entirely
    if (!onboarding.isComplete) {
      setLoading(false);
      return;
    }

    fetchRoadmapAndProgress();
  }, [onboarding.isLoading, onboarding.isComplete]);

  useEffect(() => {
    const handleDashboardRefresh = () => {
      onboarding.refresh();
      fetchRoadmapAndProgress();
    };

    window.addEventListener('refresh-dashboard', handleDashboardRefresh);
    return () => window.removeEventListener('refresh-dashboard', handleDashboardRefresh);
  }, [onboarding]);

  const fetchRoadmapAndProgress = async () => {
    try {
      setLoading(true);
      const [roadmapRes, progressRes, summaryRes, certRes] = await Promise.allSettled([
        roadmapAPI.getRoadmap(),
        progressAPI.getAll(),
        progressAPI.getSummary(),
        certificationAPI.getProgress()
      ]);

      if (roadmapRes.status === 'fulfilled' && roadmapRes.value.roadmap) {
        setRoadmap(roadmapRes.value.roadmap);
      } else {
        setRoadmap(null);
      }

      if (progressRes.status === 'fulfilled' && progressRes.value.progress) {
        const map = {};
        progressRes.value.progress.forEach(p => {
          map[p.itemId] = p.status;
        });
        setProgressMap(map);
      }

      if (certRes.status === 'fulfilled' && certRes.value.certifications) {
        const certMap = {};
        certRes.value.certifications.forEach(c => {
          certMap[c.certIdentifier] = c.status;
        });
        setCertProgressMap(certMap);
      }

      if (summaryRes.status === 'fulfilled' && summaryRes.value) {
        setProgressSummary(summaryRes.value);
      }
    } catch (err) {
      setRoadmap(null);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCertStatus = async (certTitle) => {
    const current = certProgressMap[certTitle] || 'recommended';
    let nextStatus = 'in_progress';
    if (current === 'recommended') nextStatus = 'in_progress';
    else if (current === 'in_progress') nextStatus = 'completed';
    else if (current === 'completed') nextStatus = 'recommended';

    setCertProgressMap(prev => ({ ...prev, [certTitle]: nextStatus }));

    try {
      await certificationAPI.updateStatus(certTitle, nextStatus);
    } catch (err) {
      console.warn('Failed to update certification progress:', err.message);
    }
  };

  const handleToggleTopicStatus = async (itemId, specificStatus = null, phaseIndex = null, phaseTitle = null, phaseTotalTopics = 0) => {
    const currentStatus = progressMap[itemId] || 'not_started';
    let nextStatus = specificStatus;
    
    if (!nextStatus) {
      if (currentStatus === 'not_started') nextStatus = 'in_progress';
      else if (currentStatus === 'in_progress') nextStatus = 'completed';
      else if (currentStatus === 'completed') nextStatus = 'not_started';
    }

    // Optimistic UI update
    const nextMap = { ...progressMap, [itemId]: nextStatus };
    setProgressMap(nextMap);

    // Check if this action completed an entire phase
    if (nextStatus === 'completed' && phaseIndex !== null && phaseTotalTopics > 0 && roadmap?.milestones) {
      const currentMilestone = roadmap.milestones[phaseIndex];
      const phaseTopics = currentMilestone?.topics || [];
      const completedCount = phaseTopics.filter((t, tIdx) => {
        const tId = (typeof t === 'object' && t.id) ? t.id : `p${phaseIndex + 1}-t${tIdx + 1}`;
        return tId === itemId ? true : nextMap[tId] === 'completed';
      }).length;

      if (completedCount === phaseTopics.length) {
        setAchievementToast(`🎉 Amazing work! You completed Phase ${phaseIndex + 1}: ${phaseTitle || currentMilestone.title}!`);
        setTimeout(() => setAchievementToast(null), 5000);
      }
    }

    try {
      await progressAPI.update(itemId, nextStatus);
      const summary = await progressAPI.getSummary();
      setProgressSummary(summary);
    } catch (err) {
      console.warn('Failed to sync progress to server:', err);
    }
  };

  const togglePhaseCollapse = (phaseIdx) => {
    setCollapsedPhases(prev => ({
      ...prev,
      [phaseIdx]: !prev[phaseIdx]
    }));
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError(null);
      const res = await roadmapAPI.generateRoadmap();
      setRoadmap(res.roadmap);
      const summary = await progressAPI.getSummary();
      setProgressSummary(summary);
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
          <h2>Loading Your Learning Path...</h2>
          <p>Analyzing your skills and progress.</p>
        </div>
      </div>
    );
  }

  // ── Onboarding incomplete → show step checklist empty state ──
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
            You've completed all onboarding steps. Generate your personalized step-by-step career path now.
          </p>
          {error && (
            <div className="error-message" style={{ marginBottom: '16px' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}
          <button className="btn-primary empty-state-cta" onClick={handleGenerate} disabled={generating}>
            <RefreshCw size={18} className={generating ? 'spin-icon' : ''} />
            {generating ? 'Building Path...' : 'Generate My Career Path'}
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

  // Compute total task count and completed task count across all milestones
  let totalTopics = 0;
  let completedTopics = 0;
  milestones.forEach((m, mIdx) => {
    const phaseNum = m.phase || mIdx + 1;
    (m.topics || []).forEach((t, tIdx) => {
      totalTopics++;
      const itemId = (typeof t === 'object' && t.id) ? t.id : `p${phaseNum}-t${tIdx + 1}`;
      if (progressMap[itemId] === 'completed') completedTopics++;
    });
  });

  const handleExportData = () => {
    if (!roadmap) return;
    const exportPayload = {
      exportDate: new Date().toISOString(),
      user: {
        email: user?.email,
        targetRole: roadmap?.targetRoleTitle
      },
      gapAnalysis: gapAnalysis,
      progressSummary: progressSummary,
      milestones: (roadmap?.milestones || []).map((m, pIdx) => ({
        phase: m.phase || (pIdx + 1),
        title: m.title,
        duration: m.duration,
        topics: (m.topics || []).map((t, tIdx) => {
          const topicId = typeof t === 'object' && t.id ? t.id : `p${m.phase || pIdx + 1}-t${tIdx + 1}`;
          const topicTitle = typeof t === 'object' ? t.title : t;
          return {
            title: topicTitle,
            status: progressMap[topicId] || 'not_started'
          };
        })
      })),
      recommendations: recommendations,
      certificationStatuses: certProgressMap
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `skillforge-career-profile-${(roadmap?.targetRoleTitle || 'roadmap').toLowerCase().replace(/\s+/g, '-')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="dashboard-container">
      
      {/* Phase Completion Achievement Toast */}
      {achievementToast && (
        <div className="achievement-toast flex-between">
          <div className="flex-center gap-sm">
            <Trophy size={22} className="text-amber" />
            <span>{achievementToast}</span>
          </div>
          <button className="close-toast-btn" onClick={() => setAchievementToast(null)}>✕</button>
        </div>
      )}

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
          <button className="btn-secondary flex-center" onClick={handleExportData} title="Export full career roadmap as JSON">
            <Download size={16} /> Export JSON
          </button>
          <button className="btn-secondary flex-center" onClick={handleGenerate} disabled={generating} title="Regenerate learning path">
            <RefreshCw size={14} className={generating ? 'spin-icon' : ''} />
            {generating ? 'Updating...' : 'Regenerate'}
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

        {/* Left Column: Skill Benchmark & Learning Path */}
        <div className="roadmap-column">

          {/* Where You Stand / Skill Benchmark Card */}
          <div className="gap-analysis-card">
            <div className="gap-card-header">
              <div>
                <h2><Sparkles size={20} className="text-amber" /> Where You Stand</h2>
                <div className="grounding-badge flex-center gap-xs">
                  <ShieldCheck size={13} className="text-teal" />
                  <span>Curated Benchmark &bull; 20+ Roles Verified</span>
                </div>
              </div>
              <span className="match-score-badge">{matchPercentage}% Match</span>
            </div>

            <div className="gap-progress-bar-container">
              <div className="gap-progress-bar" style={{ width: `${matchPercentage}%` }}></div>
            </div>

            <div className="gap-stats-grid">
              <div className="gap-stat matched">
                <span className="stat-num">{matchedCount}</span>
                <span className="stat-label"><CheckCircle2 size={14} /> You Already Know</span>
              </div>
              <div className="gap-stat level-gap">
                <span className="stat-num">{gapAnalysis.levelGaps?.length || 0}</span>
                <span className="stat-label"><RefreshCw size={14} /> Brush Up On</span>
              </div>
              <div className="gap-stat missing">
                <span className="stat-num">{gapAnalysis.missingSkills?.length || 0}</span>
                <span className="stat-label"><AlertCircle size={14} /> New to Learn</span>
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

          <div className="milestones-section">
            <div className="section-title">
              <h2><BookOpen size={20} className="text-teal" /> Personalized Learning Path</h2>
              <div className="progress-badge">
                <CheckCircle size={14} /> 
                {completedTopics} / {totalTopics} Tasks Done ({totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0}%)
              </div>
            </div>

            {roadmap.selectedCapstone && (
              <div className="capstone-persistent-header">
                <div className="cap-header-top flex-between">
                  <h3><Target size={18} /> Capstone Goal: {roadmap.selectedCapstone.title}</h3>
                  <span className={`diff-badge diff-${roadmap.selectedCapstone.difficulty?.toLowerCase()}`}>{roadmap.selectedCapstone.difficulty}</span>
                </div>
                <p>{roadmap.selectedCapstone.description}</p>
              </div>
            )}

            <div className="gap-progress-bar-container">
              <div 
                className="gap-progress-bar" 
                style={{ width: `${totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0}%` }}
              ></div>
            </div>

            <div className="milestones-stepper">
              {milestones.length > 0 && (
                <div className="milestone-card active-phase">
                  {(() => {
                    const m = milestones[currentPhaseIndex];
                    const phaseTopics = m.topics || [];
                    const phaseNum = m.phase || currentPhaseIndex + 1;
                    const phaseCompleted = phaseTopics.filter((t, tIdx) => {
                      const itemId = (typeof t === 'object' && t.id) ? t.id : `p${phaseNum}-t${tIdx + 1}`;
                      return progressMap[itemId] === 'completed';
                    }).length;
                    const phaseProgressPercent = phaseTopics.length > 0 ? Math.round((phaseCompleted / phaseTopics.length) * 100) : 0;

                    return (
                      <>
                        <div className="milestone-badge flex-between">
                          <div className="flex-center gap-xs">
                            <span className="phase-num">Phase {phaseNum} of {milestones.length}</span>
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
                              const itemId = (typeof topicItem === 'object' && topicItem.id) 
                                ? topicItem.id 
                                : `p${phaseNum}-t${tIdx + 1}`;
                              const status = progressMap[itemId] || 'not_started';
                              const isDone = status === 'completed';
                              const topicTitle = typeof topicItem === 'object' ? topicItem.title : topicItem;
                              const resource = typeof topicItem === 'object' ? topicItem.resource : null;

                              return (
                                <li key={tIdx} className={`topic-item ${isDone ? 'completed' : ''}`}>
                                  <div className="topic-main-row flex-between">
                                    <label className="checkbox-label flex-center gap-sm">
                                      <input
                                        type="checkbox"
                                        checked={isDone}
                                        onChange={(e) => {
                                          const newStatus = e.target.checked ? 'completed' : 'not_started';
                                          handleToggleTopicStatus(itemId, newStatus, currentPhaseIndex, m.title, phaseTopics.length);
                                        }}
                                      />
                                      <span className={`topic-text ${isDone ? 'text-done' : ''}`}>{topicTitle}</span>
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
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>

                        {m.miniProject && (
                          <div className="mini-project-section">
                            <div className="mini-proj-header flex-center gap-sm">
                              <Code size={18} className="text-amber" />
                              <h4>Capstone Building Block</h4>
                            </div>
                            <div className="mini-proj-content">
                              <h5>{m.miniProject.title}</h5>
                              <p>{m.miniProject.description}</p>
                              <div className="builds-toward">
                                <strong>Builds Toward:</strong> {m.miniProject.buildsToward}
                              </div>
                              <label className="checkbox-label flex-center gap-sm mt-10">
                                <input
                                  type="checkbox"
                                  checked={progressMap[`mini-${phaseNum}`] === 'completed'}
                                  onChange={(e) => {
                                    const newStatus = e.target.checked ? 'completed' : 'not_started';
                                    handleToggleTopicStatus(`mini-${phaseNum}`, newStatus, currentPhaseIndex, 'Mini Project', 1);
                                  }}
                                />
                                <span className={`topic-text font-bold ${progressMap[`mini-${phaseNum}`] === 'completed' ? 'text-done' : ''}`}>
                                  Mark building block complete
                                </span>
                              </label>
                            </div>
                          </div>
                        )}

                        <div className="stepper-actions flex-between mt-20">
                          <button 
                            className="btn-secondary flex-center gap-xs"
                            onClick={() => setCurrentPhaseIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentPhaseIndex === 0}
                          >
                            <ArrowLeft size={16} /> Previous Phase
                          </button>
                          
                          {currentPhaseIndex < milestones.length - 1 ? (
                            <button 
                              className="btn-primary flex-center gap-xs"
                              onClick={() => setCurrentPhaseIndex(prev => Math.min(milestones.length - 1, prev + 1))}
                            >
                              Next Phase <ArrowRight size={16} />
                            </button>
                          ) : (
                            <div className="capstone-complete-state flex-center gap-xs">
                              <Award size={16} /> Capstone Journey Complete
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Certifications */}
        <div className="recommendations-column">
          
          <div className="recommendations-card">
            
            <div className="recs-header">
              <div className="tab-buttons flex-center">
                <button className="tab-btn active" style={{ width: '100%', cursor: 'default' }}>
                  <Award size={16} /> Recommended Certifications ({recommendations.certifications?.length || 0})
                </button>
              </div>
            </div>

            <div className="recs-body">
              <div className="certs-list">
                {recommendations.certifications?.map((cert, i) => {
                  const certStatus = certProgressMap[cert.title] || 'recommended';
                  const isDone = certStatus === 'completed';
                  const isInProgress = certStatus === 'in_progress';

                  return (
                    <div key={cert.id || i} className={`cert-card ${isDone ? 'cert-completed' : ''}`}>
                      <div className="cert-card-header flex-between">
                        <div>
                          <h4>{cert.title}</h4>
                          <span className="cert-issuer">{cert.issuer}</span>
                        </div>
                        <span className={`cost-badge cost-${cert.costType?.toLowerCase() || 'paid'}`}>
                          {cert.costType || 'Paid'}
                        </span>
                      </div>

                      {cert.rationale && (
                        <p className="cert-rationale">{cert.rationale}</p>
                      )}

                      <div className="cert-card-footer flex-between">
                        <div className="flex-center gap-xs">
                          <span className={`diff-badge diff-${cert.difficulty?.toLowerCase()}`}>{cert.difficulty}</span>
                          <button
                            className={`cert-status-pill status-${certStatus}`}
                            onClick={() => handleToggleCertStatus(cert.title)}
                            title="Click to cycle status (Recommended → In Progress → Completed)"
                          >
                            {isDone ? <span className="flex-center gap-xs"><Check size={11} /> Done</span> : isInProgress ? 'In Progress' : 'Recommended'}
                          </button>
                        </div>
                        {cert.url && (
                          <a href={cert.url} target="_blank" rel="noreferrer" className="cert-link flex-center gap-xs">
                            View Details <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}

                {(!recommendations.certifications || recommendations.certifications.length === 0) && (
                  <div className="empty-tab-state">
                    <Award size={32} />
                    <p>Certifications will be recommended based on your role target.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default Dashboard;
