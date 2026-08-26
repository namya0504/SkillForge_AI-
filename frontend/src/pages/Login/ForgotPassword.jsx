import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, RefreshCw, KeyRound, ExternalLink, Inbox } from 'lucide-react';
import { authAPI } from '../../services/api';
import './Login.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const navigate = useNavigate();

  // 60s cooldown timer for resending reset email
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await authAPI.forgotPassword(email);
      setSuccessData(res);
      setResendCooldown(60);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to request password reset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Reset Your Password</h2>
          <p>Enter your account email to receive a password reset link.</p>
        </div>

        {errorMsg && <div className="auth-error">{errorMsg}</div>}

        {successData ? (
          <div className="reset-success-box text-center">
            <div className="success-icon-wrapper" style={{ margin: '0 auto 16px auto', display: 'flex', justifyContent: 'center' }}>
              <Inbox size={44} className="text-teal" style={{ color: 'var(--color-primary-light)' }} />
            </div>

            <h3>Check Your Email</h3>
            <p className="reset-instructions" style={{ margin: '12px 0 20px 0', lineHeight: 1.5 }}>
              We've sent a password reset link to <strong>{email}</strong>. Please check your inbox and spam folder, and click the link to choose a new password.
            </p>

            {/* Development / Simulated Helper (only visible when SMTP is not configured) */}
            {successData.resetLink && (
              <div className="dev-simulated-box" style={{ 
                background: 'var(--color-bg-elevated)', 
                border: '1px dashed var(--color-border)', 
                borderRadius: '10px', 
                padding: '12px', 
                marginBottom: '16px',
                fontSize: '0.8rem'
              }}>
                <span style={{ color: 'var(--color-accent)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  ⚡ Dev Mode Simulated Link:
                </span>
                <a 
                  href={successData.resetLink} 
                  className="btn-link"
                  style={{ wordBreak: 'break-all', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  Click to open reset page <ExternalLink size={12} />
                </a>
              </div>
            )}

            <div className="flex-between" style={{ marginTop: '16px', fontSize: '0.85rem' }}>
              <button
                type="button"
                className="btn-link"
                disabled={resendCooldown > 0 || isSubmitting}
                onClick={handleSubmit}
              >
                {resendCooldown > 0 ? `Resend email in ${resendCooldown}s` : 'Resend Email'}
              </button>

              <Link to={`/reset-password?email=${encodeURIComponent(email)}`} className="btn-link">
                Have a token?
              </Link>
            </div>

            <div className="auth-footer" style={{ marginTop: '24px' }}>
              <Link to="/login" className="flex-center gap-xs">
                <ArrowLeft size={16} /> Back to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Account Email Address</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={20} />
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={isSubmitting || !email}>
              {isSubmitting ? <span className="btn-spinner"></span> : 'Send Reset Link'}
            </button>

            <div className="auth-footer">
              <Link to="/login" className="flex-center gap-xs">
                <ArrowLeft size={16} /> Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
