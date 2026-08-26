import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, CheckCircle, ShieldCheck, KeyRound, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { authAPI } from '../../services/api';
import '../Login/Login.css';
import './Register.css';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Email OTP Verification state
  const [step, setStep] = useState(1); // 1: Info, 2: OTP Verification
  const [otpCode, setOtpCode] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [simulatedCode, setSimulatedCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const [pwdReqs, setPwdReqs] = useState({ length: false, number: false });
  const [pwdStrength, setPwdStrength] = useState(0);

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

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSendOTP = async (e) => {
    if (e) e.preventDefault();
    if (!pwdReqs.length || !pwdReqs.number) {
      setErrorMsg('Please meet all password requirements.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await authAPI.sendOTP(email);
      setOtpToken(res.otpToken);
      if (res.otpCode) {
        setSimulatedCode(res.otpCode);
      }
      setResendCooldown(60);
      setStep(2);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send email verification code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      setErrorMsg('Please enter the 6-digit email authentication code.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await register(email, password, otpToken, otpCode);
      navigate('/upload');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to complete registration');
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
          <p>{step === 1 ? 'Join SkillForge AI today' : `Verify your email: ${email}`}</p>
        </div>

        {errorMsg && <div className="auth-error">{errorMsg}</div>}

        {step === 1 ? (
          <form onSubmit={handleSendOTP} className="auth-form">
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
              {isSubmitting ? <span className="btn-spinner"></span> : 'Send Email Verification Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyAndRegister} className="auth-form">
            <div className="otp-info-box">
              <ShieldCheck size={28} className="text-teal" />
              <div>
                <h4>Verification Code Sent</h4>
                <p>We've sent a 6-digit verification code to <strong>{email}</strong>. Check your inbox and spam folder.</p>
                {simulatedCode && (
                  <div className="simulated-otp-badge" onClick={() => setOtpCode(simulatedCode)}>
                    Code: <strong>{simulatedCode}</strong> <span className="click-to-fill">(Click to Auto-fill)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="otpCode">6-Digit Verification Code</label>
              <div className="input-wrapper">
                <KeyRound className="input-icon" size={20} />
                <input
                  id="otpCode"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  disabled={isSubmitting}
                  autoFocus
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={isSubmitting || otpCode.length < 6}>
              {isSubmitting ? <span className="btn-spinner"></span> : 'Verify Email & Create Account'}
            </button>

            <div className="flex-between" style={{ marginTop: '14px', fontSize: '0.85rem' }}>
              <button 
                type="button" 
                className="btn-link"
                disabled={resendCooldown > 0 || isSubmitting}
                onClick={handleSendOTP}
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
              </button>

              <button type="button" className="btn-link flex-center gap-xs" onClick={() => setStep(1)}>
                <ArrowLeft size={14} /> Change Email
              </button>
            </div>
          </form>
        )}

        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Log in</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Register;
