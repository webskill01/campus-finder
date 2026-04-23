const nodemailer = require('nodemailer');

const transport = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
});

const smtpReady = transport.verify().then(() => {
  console.log('SMTP connection verified - mailer ready');
}).catch(err => {
  console.error('SMTP connection FAILED:', err.message, '| Check BREVO_SMTP_USER and BREVO_SMTP_PASS env vars');
  throw err;
});

const FROM = process.env.MAIL_FROM || `Find Hub <${process.env.BREVO_SMTP_USER || 'noreply@Find-Hub.app'}>`;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const MAIL_LOGO_URL = process.env.MAIL_LOGO_URL || `${CLIENT_URL}/logo.png`;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function wrapEmailHtml(content) {
  return `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
      <div style="margin-bottom: 20px;">
        <img src="${MAIL_LOGO_URL}" alt="Find Hub" style="height: 44px; width: auto; display: block;" />
      </div>
      ${content}
    </div>
  `;
}

async function sendEmail({ to, subject, html, replyTo }) {
  if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASS) {
    throw new Error('Brevo SMTP credentials are missing');
  }

  await smtpReady;

  const info = await transport.sendMail({
    from: FROM,
    to,
    subject,
    html,
    ...(replyTo ? { replyTo } : {}),
  });

  console.log(`Mail queued: ${subject} -> ${to} (${info.messageId})`);
  return info;
}

async function sendManageEmail({ to, name, title, manageToken }) {
  const manageUrl = `${CLIENT_URL}/manage/${manageToken}`;
  const safeName = escapeHtml(name || 'Campus member');
  const safeTitle = escapeHtml(title);

  return sendEmail({
    to,
    subject: `Your Find Hub post is live - "${title}"`,
    html: wrapEmailHtml(`
      <p>Hi ${safeName},</p>
      <p>Your item <strong>"${safeTitle}"</strong> has been posted on Find Hub.</p>
      <p><strong>Manage link</strong> (edit / resolve / delete):<br>
      <a href="${manageUrl}">${manageUrl}</a></p>
      <p>This link is private - do not share it.</p>
      <p>- Find Hub</p>
    `),
  });
}

async function sendInterestEmail({ to, posterName, title, interestedGmail, interestedName, message }) {
  const safePoster = escapeHtml(posterName || 'Campus member');
  const safeTitle = escapeHtml(title);
  const safeGmail = escapeHtml(interestedGmail);
  const safeName = escapeHtml(interestedName || '');
  const safeMessage = escapeHtml(message);

  return sendEmail({
    to,
    subject: `Someone is interested in your post - "${title}"`,
    replyTo: interestedGmail,
    html: wrapEmailHtml(`
      <p>Hi ${safePoster},</p>
      <p>A campus member${safeName ? ` (<strong>${safeName}</strong>)` : ''} expressed interest in your post <strong>"${safeTitle}"</strong>.</p>
      <p><strong>Their Gmail:</strong> ${safeGmail}</p>
      ${safeMessage ? `<p><strong>Message:</strong> ${safeMessage}</p>` : ''}
      <p>Use reply to respond directly to them.</p>
      <p>- Find Hub</p>
    `),
  });
}

async function sendRemovalEmail({ to, name, title }) {
  const safeName = escapeHtml(name || 'Campus member');
  const safeTitle = escapeHtml(title);

  return sendEmail({
    to,
    subject: `Your Find Hub post has been removed - "${title}"`,
    html: wrapEmailHtml(`
      <p>Hi ${safeName},</p>
      <p>Your post <strong>"${safeTitle}"</strong> has been removed from Find Hub because it was flagged as suspicious by multiple users.</p>
      <p>If you believe this was a mistake, please repost with clearer details.</p>
      <p>- Find Hub</p>
    `),
  });
}

module.exports = { sendManageEmail, sendInterestEmail, sendRemovalEmail };
