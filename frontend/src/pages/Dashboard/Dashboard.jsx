import React from 'react';
import { Map, BookOpen, Activity } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();

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

        <div className="dash-card">
          <div className="dash-card-header">
            <div className="icon-wrapper skills-icon">
              <BookOpen size={24} />
            </div>
            <span className="badge-soon">Coming Soon</span>
          </div>
          <h3>Skill Inventory</h3>
          <p>Track the skills you've mastered and identify areas to focus on next.</p>
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
