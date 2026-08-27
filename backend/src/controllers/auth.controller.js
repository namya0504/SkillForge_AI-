import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../config/database.js';
import { generateToken, generateRefreshToken, verifyRefreshToken, getCookieOptions, getRefreshCookieOptions } from '../utils/token.js';
import { config } from '../config/env.js';
import { deleteFile } from '../config/storage.js';
import { sendVerificationEmail, sendPasswordResetEmail, sendPasswordChangedEmail } from '../services/email.service.js';

export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const normalizedEmail = email.toLowerCase().trim();

    // Generate random 6-digit OTP code
    const otpCode = crypto.randomInt(100000, 999999).toString();

    // Sign verification token (expires in 10 minutes)
    const otpToken = jwt.sign(
      { email: normalizedEmail, otpCode, type: 'email_verification' },
      config.jwtSecret,
      { expiresIn: '10m' }
    );

    // Send real transactional email via Email Service
    const emailResult = await sendVerificationEmail(normalizedEmail, otpCode);

    res.status(200).json({
      message: `Authentication code sent to ${normalizedEmail}`,
      otpToken,
      // Provide simulated fallback code for dev/test environments without SMTP setup
      otpCode: emailResult.simulated ? otpCode : undefined,
      emailDelivered: emailResult.delivered
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { otpToken, code } = req.body;

    if (!otpToken || !code) {
      return res.status(400).json({ error: 'Verification token and 6-digit code are required.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(otpToken, config.jwtSecret);
    } catch (err) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    if (decoded.otpCode !== code.trim()) {
      return res.status(400).json({ error: 'Invalid 6-digit verification code. Please check and try again.' });
    }

    res.status(200).json({
      message: 'Email authenticated successfully',
      email: decoded.email,
      verified: true
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
};

export const register = async (req, res) => {
  try {
    const { email, password, otpToken, otpCode } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    if (!email || !password || password.length < 8) {
      return res.status(400).json({ error: 'Valid email and password (minimum 8 characters) are required.' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Unable to create account. Please try a different email or contact support.' });
    }

    let isEmailVerified = false;
    // Require 6-digit Email Authentication Code if provided
    if (otpToken && otpCode) {
      try {
        const decoded = jwt.verify(otpToken, config.jwtSecret);
        if (decoded.email !== normalizedEmail || decoded.otpCode !== otpCode.trim()) {
          return res.status(400).json({ error: 'Invalid or expired email authentication code.' });
        }
        isEmailVerified = true;
      } catch (e) {
        return res.status(400).json({ error: 'Email authentication code expired. Please request a new code.' });
      }
    }

    // High security bcrypt password hashing with 12 salt rounds
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        isEmailVerified,
        emailVerifiedAt: isEmailVerified ? new Date() : null
      }
    });

    const token = generateToken(newUser.id);
    const refreshToken = generateRefreshToken(newUser.id);
    res.cookie('token', token, getCookieOptions());
    res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: newUser.id,
        email: newUser.email,
        isEmailVerified: newUser.isEmailVerified,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, otpToken, otpCode } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify bcrypt hash
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // If OTP verification provided
    if (otpToken && otpCode) {
      try {
        const decoded = jwt.verify(otpToken, config.jwtSecret);
        if (decoded.email !== normalizedEmail || decoded.otpCode !== otpCode.trim()) {
          return res.status(400).json({ error: 'Invalid security code. Please check your verification code.' });
        }
      } catch (e) {
        return res.status(400).json({ error: 'Verification code expired. Please request a new code.' });
      }
    }

    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    res.cookie('token', token, getCookieOptions());
    res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const refreshSession = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      res.clearCookie('token', { path: '/' });
      res.clearCookie('refreshToken', { path: '/' });
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      res.clearCookie('token', { path: '/' });
      res.clearCookie('refreshToken', { path: '/' });
      return res.status(401).json({ error: 'User not found' });
    }

    const newToken = generateToken(user.id);
    res.cookie('token', newToken, getCookieOptions());

    res.status(200).json({ message: 'Session refreshed successfully' });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const logout = (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
  res.status(200).json({ message: 'Logged out successfully' });
};

export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      // Return generic 200 to prevent user enumeration
      return res.status(200).json({
        message: 'If an account exists with that email, password reset instructions have been sent.'
      });
    }

    const resetToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'password_reset' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // Dynamically derive client base URL from request origin or config
    const originHeader = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : '');
    const clientBaseUrl = (originHeader && !originHeader.includes('localhost'))
      ? originHeader.replace(/\/$/, '')
      : (config.frontendUrl || 'https://skill-forge-ai-rose.vercel.app').replace(/\/$/, '');

    const resetLink = `${clientBaseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    // Send real transactional password reset email
    const emailResult = await sendPasswordResetEmail(user.email, resetLink);

    res.status(200).json({
      message: 'Password reset link sent to your email.',
      resetLink: emailResult.simulated ? resetLink : undefined,
      resetToken: emailResult.simulated ? resetToken : undefined,
      emailDelivered: emailResult.delivered
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (err) {
      return res.status(400).json({ error: 'Password reset link is invalid or has expired. Please request a new one.' });
    }

    if (decoded.type !== 'password_reset') {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    const updatedUser = await prisma.user.update({
      where: { id: decoded.userId },
      data: { passwordHash }
    });

    // Send security notification email
    try {
      await sendPasswordChangedEmail(updatedUser.email);
    } catch (emailErr) {
      console.warn('Failed to send password change alert email:', emailErr.message);
    }

    res.status(200).json({ message: 'Password updated successfully. You can now log in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Current password is required to delete your account.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { resumes: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password. Account deletion cancelled.' });
    }

    // Delete stored resume files from storage bucket
    if (user.resumes && user.resumes.length > 0) {
      for (const resume of user.resumes) {
        if (resume.storageKey) {
          try {
            await deleteFile(resume.storageKey);
          } catch (storageErr) {
            console.warn('Failed to delete resume file during account deletion:', storageErr.message);
          }
        }
      }
    }

    // Cascade delete user in database
    await prisma.user.delete({
      where: { id: req.user.id }
    });

    res.clearCookie('token', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });

    res.status(200).json({ message: 'Account and associated data deleted successfully.' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};
