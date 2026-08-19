import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { generateToken, getCookieOptions } from '../utils/token.js';
import { config } from '../config/env.js';

export const register = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Unable to create account. Please try a different email or contact support.' });
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
    res.cookie('token', token, getCookieOptions());

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
    const { email, password } = req.body;
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

    const token = generateToken(user.id);
    res.cookie('token', token, getCookieOptions());

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

export const logout = (req, res) => {
  res.clearCookie('token', { path: '/' });
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

    const resetLink = `${config.frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

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
