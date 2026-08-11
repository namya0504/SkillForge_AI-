import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Map, TrendingUp, Shield } from 'lucide-react';
import './Landing.css';

const Landing = () => {
  return (
    <div className="landing-page">
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Your AI-Powered Career Mentor</h1>
          <p className="hero-subtitle">
            Upload your resume, discover your personalized roadmap, and track your growth with intelligent guidance tailored to your goals.
          </p>
          <Link to="/register" className="btn-cta">
            Get Your Personalized Roadmap &rarr;
          </Link>
        </div>
        <div className="hero-background">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
        </div>
      </section>

      <section className="features-section">
        <div className="features-container">
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <FileText className="feature-icon" size={32} />
            </div>
            <h3 className="feature-title">AI Resume Analysis</h3>
            <p className="feature-description">
              Upload your existing resume and let our AI instantly identify your strengths and areas for growth.
            </p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Map className="feature-icon" size={32} />
            </div>
            <h3 className="feature-title">Personalized Roadmap</h3>
            <p className="feature-description">
              Get a custom, step-by-step curriculum designed specifically to bridge your skill gaps and land your dream job.
            </p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <TrendingUp className="feature-icon" size={32} />
            </div>
            <h3 className="feature-title">Track Your Growth</h3>
            <p className="feature-description">
              Monitor your progress with interactive dashboards and earn achievements as you master new skills.
            </p>
          </div>
        </div>
      </section>

      <section className="trust-section">
        <div className="trust-content">
          <Shield className="trust-icon" size={48} />
          <h2>Your data stays yours</h2>
          <p>
            We believe in privacy by design. Your resume and career data are encrypted and never shared with third parties without your explicit consent.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Landing;
