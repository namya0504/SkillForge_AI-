import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, KeyRound, ArrowLeft } from 'lucide-react';
import { authAPI } from '../../services/api';
import './Login.css';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';
  const emailFromUrl = searchParams.get('email') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const [pwdReqs, setPwdReqs] = useState({ length: false, number: false });

  const navigate = useNavigate();

  useEffect(() => {
    const hasLength = newPassword.length >= 8;
    const hasNumber = /\d/.test(newPassword);
    setPwdReqs({ length: hasLength, number: hasNumber });
  }, [newPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setErrorMsg('Missing password reset token.');
      return;
    }
    if (!pwdReqs.length || !pwdReqs.number) {
      setErrorMsg('Password must be at least 8 characters long and contain a number.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await authAPI.resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Create New Password</h2>
          <p>{emailFromUrl ? `Resetting password for ${emailFromUrl}` : 'Enter your reset token and new password'}</p>
        </div>

        {errorMsg && <div className="auth-error">{errorMsg}</div>}

        {success ? (
          <div className="reset-success-box text-center">
            <CheckCircle size={48} className="text-success margin-bottom-sm" style={{ margin: '0 auto 12px auto' }} />
            <h3>Password Changed Successfully!</h3>
            <p className="reset-instructions" style={{ marginBottom: '24px' }}>
              Your password has been updated. You can now log in with your new credentials.
            </p>
            <Link to="/login" className="btn-primary flex-center full-width">
              Log In Now
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            {!tokenFromUrl && (
              <div className="form-group">
                <label htmlFor="token">Reset Token</label>
                <div className="input-wrapper">
                  <KeyRound className="input-icon" size={20} />
                  <input
                    id="token"
                    type="text"
                    placeholder="Paste reset token here"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={20} />
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  className="btn-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="pwd-requirements">
                <div className={`req-item ${pwdReqs.length ? 'met' : ''}`}>
                  <CheckCircle size={14} /> Min 8 characters
                </div>
                <div className={`req-item ${pwdReqs.number ? 'met' : ''}`}>
                  <CheckCircle size={14} /> Contains a number
                </div>
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={isSubmitting || !pwdReqs.length || !pwdReqs.number}>
              {isSubmitting ? <span className="btn-spinner"></span> : 'Update Password'}
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

export default ResetPassword;
