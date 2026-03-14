'use strict';

const nodemailer = require('nodemailer');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const templates = {
  'verify-email': ({ name, url }) => ({
    subject: 'Verify your THINGS account',
    html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#111;color:#fff;border-radius:16px">
      <h2 style="color:#6366F1">Welcome to THINGS, ${name}!</h2>
      <p style="color:#aaa">Click below to verify your email address.</p>
      <a href="${url}" style="display:inline-block;background:#6366F1;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Verify Email</a>
      <p style="color:#555;font-size:12px">Link expires in 24 hours. If you didn't sign up, ignore this email.</p>
    </div>`,
  }),
  'reset-password': ({ name, url }) => ({
    subject: 'Reset your THINGS password',
    html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#111;color:#fff;border-radius:16px">
      <h2 style="color:#6366F1">Password Reset</h2>
      <p style="color:#aaa">Hi ${name}, click below to reset your password.</p>
      <a href="${url}" style="display:inline-block;background:#EF4444;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Reset Password</a>
      <p style="color:#555;font-size:12px">Link expires in 10 minutes. If you didn't request this, ignore this email.</p>
    </div>`,
  }),
};

exports.sendEmail = async ({ to, subject, template, data, html, text }) => {
  try {
    const tmpl = template && templates[template] ? templates[template](data) : {};
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'THINGS <noreply@things.app>',
      to,
      subject: subject || tmpl.subject,
      html: html || tmpl.html,
      text,
    });
    logger.info(`Email sent to ${to}`);
  } catch (err) {
    logger.error('Email send failed:', err.message);
    throw err;
  }
};
