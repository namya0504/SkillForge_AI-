import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import '../Login/Login.css'; // Reusing base auth styles
import './Register.css';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [pwdReqs, setPwdReqs] = useState({ length: false, number: false });
  const [pwdStrength, setPwdStrength] = useState(0); // 0-2

  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const hasLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    setPwdReqs({ length: hasLength, number: hasNumber });
    
    let strength = 0;
    if (hasLength) strength += 1;
    if (hasNumber) strength += 1;
    setPwdStrength(strength);
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pwdReqs.length || !pwdReqs.number) {
      setErrorMsg('Please meet all password requirements.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await register(email, password);
      navigate('/upload');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to register');
      setIsSubmitting(false);
    }
  };

  const getStrengthColor = () => {
    if (pwdStrength === 0) return 'var(--color-border)';
    if (pwdStrength === 1) return 'var(--color-warning)';
    return 'var(--color-success)';
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Create Account</h2>
          <p>Join SkillForge AI today</p>
        </div>

        {errorMsg && <div className="auth-error">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
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

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            
            {/* Password strength indicator */}
            <div className="pwd-strength-container">
              <div 
                className="pwd-strength-bar" 
                style={{ 
                  width: `${(pwdStrength / 2) * 100}%`,
                  backgroundColor: getStrengthColor() 
                }}
              ></div>
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

          <button type="submit" className="btn-submit" disabled={isSubmitting || pwdStrength < 2}>
            {isSubmitting ? <span className="btn-spinner"></span> : 'Sign Up'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Log in</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Register;
