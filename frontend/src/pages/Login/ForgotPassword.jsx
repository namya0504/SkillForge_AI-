import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, KeyRound, ExternalLink } from 'lucide-react';
import { authAPI } from '../../services/api';
import './Login.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessData(null);

    try {
      const res = await authAPI.forgotPassword(email);
      setSuccessData(res);
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
          <div className="reset-success-box">
            <div className="success-icon-wrapper">
              <CheckCircle size={36} className="text-success" />
            </div>
            <h3>Reset Instructions Sent!</h3>
            <p className="reset-instructions">
              If an account exists for <strong>{email}</strong>, click the button below to reset your password:
            </p>

            {successData.resetLink && (
              <a href={successData.resetLink} className="btn-primary reset-direct-btn">
                <KeyRound size={18} /> Proceed to Reset Password <ExternalLink size={14} />
              </a>
            )}

            <div className="auth-footer" style={{ marginTop: '20px' }}>
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

            <button type="submit" className="btn-submit" disabled={isSubmitting}>
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
