import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { generateToken, generateRefreshToken, verifyRefreshToken, getCookieOptions, getRefreshCookieOptions } from '../utils/token.js';
import { config } from '../config/env.js';
import { deleteFile } from '../config/storage.js';

export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Generate random 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Sign verification token (expires in 10 minutes)
    const otpToken = jwt.sign(
      { email: normalizedEmail, otpCode, type: 'email_verification' },
      config.jwtSecret,
      { expiresIn: '10m' }
    );

    res.status(200).json({
      message: `Authentication code sent to ${normalizedEmail}`,
      otpCode,
      otpToken
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

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Unable to create account. Please try a different email or contact support.' });
    }

    // Require 6-digit Email Authentication Code if provided
    if (otpToken && otpCode) {
      try {
        const decoded = jwt.verify(otpToken, config.jwtSecret);
        if (decoded.email !== normalizedEmail || decoded.otpCode !== otpCode.trim()) {
          return res.status(400).json({ error: 'Invalid or expired email authentication code.' });
        }
      } catch (e) {
        return res.status(400).json({ error: 'Email authentication code expired. Please request a new code.' });
      }
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash
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
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      return res.status(200).json({
        message: 'If an account exists with that email, password reset instructions have been generated.'
      });
    }

    const resetToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'password_reset' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // Dynamically derive client base URL from request origin to prevent pointing to private Vercel project domains
    const originHeader = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : '');
    const clientBaseUrl = (originHeader && !originHeader.includes('localhost'))
      ? originHeader.replace(/\/$/, '')
      : (config.frontendUrl || 'https://skill-forge-ai-rose.vercel.app').replace(/\/$/, '');

    const resetLink = `${clientBaseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    res.status(200).json({
      message: 'Password reset token generated successfully.',
      resetLink,
      resetToken
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

    await prisma.user.update({
      where: { id: decoded.userId },
      data: { passwordHash }
    });

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

