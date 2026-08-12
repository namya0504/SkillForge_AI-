import React from 'react';
import { Map, BookOpen, Activity, Upload as UploadIcon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Welcome back, {user?.email}!</h1>
        <p>Ready to level up your career today?</p>
      </header>

      <div className="dashboard-grid">
        <div className="dash-card">
          <div className="dash-card-header">
            <div className="icon-wrapper map-icon">
              <Map size={24} />
            </div>
            <span className="badge-soon">Coming Soon</span>
          </div>
          <h3>Your Roadmap</h3>
          <p>Your personalized AI-generated learning path will appear here.</p>
        </div>

        <div className="dash-card dash-card-actionable" onClick={() => navigate('/upload')}>
          <div className="dash-card-header">
            <div className="icon-wrapper skills-icon">
              <UploadIcon size={24} />
            </div>
          </div>
          <h3>Upload Your Resume</h3>
          <p>Start by uploading your resume to get personalized recommendations.</p>
          <button className="dash-upload-btn">
            Upload Resume
          </button>
        </div>

        <div className="dash-card">
          <div className="dash-card-header">
            <div className="icon-wrapper progress-icon">
              <Activity size={24} />
            </div>
            <span className="badge-soon">Coming Soon</span>
          </div>
          <h3>Growth Analytics</h3>
          <p>Visualize your progress and see how close you are to your career goals.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
