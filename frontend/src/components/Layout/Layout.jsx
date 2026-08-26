import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X, Rocket, Upload, Target, Map } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import './Layout.css';

const Layout = ({ children }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const toggleMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleDashboardClick = (e) => {
    setMobileMenuOpen(false);
    if (window.location.pathname === '/dashboard') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('refresh-dashboard'));
    }
  };

  return (
    <div className="layout-container">
      <header className="navbar">
        <div className="navbar-content">
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="logo" onClick={handleDashboardClick}>
            <Rocket className="logo-icon" />
            <span className="logo-text">SkillForge AI</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="nav-desktop">
            {isAuthenticated ? (
              <div className="nav-user-section">
                <Link to="/dashboard" className="nav-link" onClick={handleDashboardClick}><Map size={16} /> Dashboard</Link>
                <Link to="/upload" className="nav-link"><Upload size={16} /> Update Resume</Link>
                <Link to="/role-selection" className="nav-link"><Target size={16} /> Target Role</Link>
                <span className="user-email">{user?.email}</span>
                <button onClick={handleLogout} className="btn-logout">
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="nav-auth-section">
                <Link to="/login" className="btn-login">Log In</Link>
                <Link to="/register" className="btn-register">Sign Up</Link>
              </div>
            )}
          </nav>

          {/* Mobile Menu Toggle */}
          <button className="mobile-menu-btn" onClick={toggleMenu} aria-label="Toggle menu">
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="nav-mobile">
          {isAuthenticated ? (
            <div className="mobile-user-section">
              <span className="mobile-email">{user?.email}</span>
              <Link to="/dashboard" className="mobile-nav-link" onClick={handleDashboardClick}><Map size={16} /> Dashboard</Link>
              <Link to="/upload" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}><Upload size={16} /> Update Resume</Link>
              <Link to="/role-selection" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}><Target size={16} /> Target Role</Link>
              <button onClick={handleLogout} className="btn-mobile-logout">
                <LogOut size={18} />
                Logout
              </button>
            </div>
          ) : (
            <div className="mobile-auth-section">
              <Link to="/login" className="btn-mobile-login" onClick={() => setMobileMenuOpen(false)}>Log In</Link>
              <Link to="/register" className="btn-mobile-register" onClick={() => setMobileMenuOpen(false)}>Sign Up</Link>
            </div>
          )}
        </div>
      )}

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
