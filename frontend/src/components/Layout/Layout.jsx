import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X, Rocket, Upload, Target, Map, Trash2, Shield, AlertTriangle, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { authAPI } from '../../services/api';
import './Layout.css';

const Layout = ({ children }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

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

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!deletePassword) {
      setDeleteError('Please enter your password to confirm deletion.');
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      await authAPI.deleteAccount(deletePassword);
      setDeleteModalOpen(false);
      await logout();
      navigate('/');
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete account. Please check your password.');
    } finally {
      setDeleting(false);
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
                
                {/* Theme Toggle Button */}
                <button
                  onClick={toggleTheme}
                  className="btn-theme-toggle"
                  title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
                  aria-label="Toggle theme"
                >
                  {isDark ? <Sun size={17} className="text-amber" /> : <Moon size={17} className="text-primary" />}
                </button>

                <button 
                  onClick={() => setDeleteModalOpen(true)} 
                  className="btn-link-icon" 
                  title="Account Settings & Data Privacy"
                  aria-label="Account Settings"
                >
                  <Shield size={16} />
                </button>
                <button onClick={handleLogout} className="btn-logout">
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="nav-auth-section">
                {/* Theme Toggle Button for Guests */}
                <button
                  onClick={toggleTheme}
                  className="btn-theme-toggle"
                  title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
                  aria-label="Toggle theme"
                >
                  {isDark ? <Sun size={17} className="text-amber" /> : <Moon size={17} className="text-primary" />}
                </button>

                <Link to="/login" className="btn-login">Log In</Link>
                <Link to="/register" className="btn-register">Sign Up</Link>
              </div>
            )}
          </nav>

          {/* Mobile Menu Toggle (only on mobile) */}
          <div className="mobile-header-actions">
            <button
              onClick={toggleTheme}
              className="btn-theme-toggle mobile-theme-btn"
              title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={18} className="text-amber" /> : <Moon size={18} className="text-primary" />}
            </button>
            <button className="mobile-menu-btn" onClick={toggleMenu} aria-label="Toggle menu">
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
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
              
              <button 
                onClick={toggleTheme}
                className="mobile-nav-link"
              >
                {isDark ? <Sun size={16} className="text-amber" /> : <Moon size={16} className="text-primary" />}
                <span>{isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
              </button>

              <button 
                onClick={() => { setMobileMenuOpen(false); setDeleteModalOpen(true); }}
                className="mobile-nav-link text-danger"
              >
                <Trash2 size={16} /> Delete Account & Data
              </button>
              <button onClick={handleLogout} className="btn-mobile-logout">
                <LogOut size={18} />
                Logout
              </button>
            </div>
          ) : (
            <div className="mobile-auth-section">
              <button 
                onClick={toggleTheme}
                className="mobile-nav-link"
              >
                {isDark ? <Sun size={16} className="text-amber" /> : <Moon size={16} className="text-primary" />}
                <span>{isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
              </button>
              <Link to="/login" className="btn-mobile-login" onClick={() => setMobileMenuOpen(false)}>Log In</Link>
              <Link to="/register" className="btn-mobile-register" onClick={() => setMobileMenuOpen(false)}>Sign Up</Link>
            </div>
          )}
        </div>
      )}

      {/* Account Deletion / Data Privacy Confirmation Modal */}
      {deleteModalOpen && (
        <div className="modal-overlay" onClick={() => setDeleteModalOpen(false)}>
          <div className="modal-content danger-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex-center gap-xs text-danger">
                <AlertTriangle size={24} />
                <h3>Delete Account & Data</h3>
              </div>
              <button className="close-btn" onClick={() => setDeleteModalOpen(false)}><X size={18} /></button>
            </div>
            <p className="modal-desc">
              This action is permanent. All your resumes, extracted skills, progress, and career roadmap will be completely deleted from our database and cloud storage.
            </p>
            {deleteError && (
              <div className="error-message" style={{ marginBottom: '12px' }}>
                <span>{deleteError}</span>
              </div>
            )}
            <form onSubmit={handleDeleteAccount}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Enter your password to confirm:
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Your current password"
                  className="modal-input"
                  required
                />
              </div>
              <div className="modal-actions flex-between">
                <button type="button" className="btn-secondary" onClick={() => setDeleteModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-danger" disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete Everything'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
