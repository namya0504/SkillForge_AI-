import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

// Lazy-initialize Nodemailer transporter
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (config.smtpHost && config.smtpUser && config.smtpPass) {
    transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort || 587,
      secure: config.smtpSecure || (config.smtpPort === 465),
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  return transporter;
}

/**
 * Base email dispatch function with SMTP delivery & development console fallback
 */
export async function sendEmail({ to, subject, html, text }) {
  const mailTransporter = getTransporter();

  if (mailTransporter) {
    try {
      const info = await mailTransporter.sendMail({
        from: config.emailFrom || '"SkillForge AI" <noreply@skillforge.ai>',
        to,
        subject,
        text,
        html
      });
      console.log(`[Email Service] Email sent successfully to ${to} (Message ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId, delivered: true };
    } catch (err) {
      console.error(`[Email Service Error] Failed to send via SMTP to ${to}:`, err.message);
      // Fallback to console output below
    }
  }

  // Graceful development/test console output
  console.log(`\n======================================================`);
  console.log(`📨 [MOCK EMAIL DISPATCH] To: ${to}`);
  console.log(`📌 Subject: ${subject}`);
  console.log(`📝 Text Content:\n${text}`);
  console.log(`======================================================\n`);

  return { success: true, delivered: false, simulated: true };
}

/**
 * Send 6-Digit Email Verification Code (OTP)
 */
export async function sendVerificationEmail(email, otpCode) {
  const subject = `${otpCode} is your SkillForge AI verification code`;
  const text = `Welcome to SkillForge AI!\n\nYour 6-digit verification code is: ${otpCode}\n\nThis code will expire in 10 minutes. If you did not request this, please ignore this email.`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SkillForge AI Verification Code</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF7F2; margin: 0; padding: 20px; color: #1B1B1F; }
          .email-card { max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; padding: 36px; border: 1px solid #E5E1D8; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
          .logo-header { text-align: center; margin-bottom: 24px; }
          .logo-badge { display: inline-flex; align-items: center; gap: 8px; font-size: 22px; font-weight: 800; color: #0F4C5C; text-decoration: none; }
          .title { font-size: 20px; font-weight: 700; color: #1B1B1F; margin-bottom: 12px; text-align: center; }
          .subtitle { font-size: 14px; color: #5A5A67; line-height: 1.5; text-align: center; margin-bottom: 28px; }
          .code-box { background: #F5F0E8; border: 2px dashed #0F4C5C; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }
          .code { font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0F4C5C; font-family: monospace; }
          .expiry-note { font-size: 12px; color: #8C8C9A; text-align: center; margin-top: 10px; }
          .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #E5E1D8; text-align: center; font-size: 12px; color: #8C8C9A; }
        </style>
      </head>
      <body>
        <div class="email-card">
          <div class="logo-header">
            <span class="logo-badge">🚀 SkillForge AI</span>
          </div>
          <h1 class="title">Verify Your Email Address</h1>
          <p class="subtitle">Use the verification code below to complete your registration and unlock your tailored career roadmap.</p>
          <div class="code-box">
            <div class="code">${otpCode}</div>
          </div>
          <p class="expiry-note">⏱️ This code expires in <strong>10 minutes</strong>.</p>
          <div class="footer">
            <p>If you didn't create an account on SkillForge AI, you can safely ignore this email.</p>
            <p>&copy; ${new Date().getFullYear()} SkillForge AI. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({ to: email, subject, text, html });
}

/**
 * Send Password Reset Link & Instructions
 */
export async function sendPasswordResetEmail(email, resetLink) {
  const subject = `Reset your SkillForge AI password`;
  const text = `Hello,\n\nYou recently requested to reset your password for SkillForge AI. Use the link below to set a new password:\n\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, please ignore this email and your password will remain unchanged.`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Password - SkillForge AI</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF7F2; margin: 0; padding: 20px; color: #1B1B1F; }
          .email-card { max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; padding: 36px; border: 1px solid #E5E1D8; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
          .logo-header { text-align: center; margin-bottom: 24px; }
          .logo-badge { display: inline-flex; align-items: center; gap: 8px; font-size: 22px; font-weight: 800; color: #0F4C5C; text-decoration: none; }
          .title { font-size: 20px; font-weight: 700; color: #1B1B1F; margin-bottom: 12px; text-align: center; }
          .subtitle { font-size: 14px; color: #5A5A67; line-height: 1.5; text-align: center; margin-bottom: 28px; }
          .btn-container { text-align: center; margin: 28px 0; }
          .reset-btn { display: inline-block; background-color: #0F4C5C; color: #FFFFFF !important; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 10px; text-decoration: none; box-shadow: 0 2px 8px rgba(15,76,92,0.3); }
          .expiry-note { font-size: 12px; color: #8C8C9A; text-align: center; margin-top: 14px; }
          .direct-link-box { margin-top: 24px; background: #F5F0E8; border-radius: 8px; padding: 12px; font-size: 12px; word-break: break-all; color: #5A5A67; }
          .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #E5E1D8; text-align: center; font-size: 12px; color: #8C8C9A; }
        </style>
      </head>
      <body>
        <div class="email-card">
          <div class="logo-header">
            <span class="logo-badge">🚀 SkillForge AI</span>
          </div>
          <h1 class="title">Reset Your Password</h1>
          <p class="subtitle">We received a request to reset your password. Click the button below to choose a new secure password.</p>
          <div class="btn-container">
            <a href="${resetLink}" class="reset-btn" target="_blank">Reset Password</a>
          </div>
          <p class="expiry-note">⏱️ This link is valid for <strong>1 hour</strong>.</p>
          <div class="direct-link-box">
            <strong>Button not working?</strong> Copy and paste this URL into your browser:<br/>
            <a href="${resetLink}" style="color: #0F4C5C;">${resetLink}</a>
          </div>
          <div class="footer">
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
            <p>&copy; ${new Date().getFullYear()} SkillForge AI. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({ to: email, subject, text, html });
}

/**
 * Send Password Changed Security Confirmation Email
 */
export async function sendPasswordChangedEmail(email) {
  const subject = `Your SkillForge AI password was changed`;
  const text = `Hello,\n\nThis is a security confirmation that your SkillForge AI password was recently changed.\n\nIf you did not perform this change, please contact support or reset your password immediately.`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Security Alert - SkillForge AI</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF7F2; margin: 0; padding: 20px; color: #1B1B1F; }
          .email-card { max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; padding: 36px; border: 1px solid #E5E1D8; }
          .title { font-size: 18px; font-weight: 700; color: #1B1B1F; margin-bottom: 12px; }
          .subtitle { font-size: 14px; color: #5A5A67; line-height: 1.5; }
          .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #E5E1D8; font-size: 12px; color: #8C8C9A; }
        </style>
      </head>
      <body>
        <div class="email-card">
          <h2 class="title">🔐 Password Changed Successfully</h2>
          <p class="subtitle">Your SkillForge AI account password was successfully updated on ${new Date().toUTCString()}.</p>
          <p class="subtitle">If you did not make this change, please reset your password immediately.</p>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} SkillForge AI Security Team</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({ to: email, subject, text, html });
}
