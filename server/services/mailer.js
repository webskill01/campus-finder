const { Resend } = require('resend');

let resend;
try {
  resend = new Resend(process.env.RESEND_API_KEY);
} catch (err) {
  console.warn('Resend not configured — emails will be skipped');
}

const FROM_EMAIL = 'CampusFinder <onboarding@resend.dev>';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendManageEmail({ to, title, manageToken }) {
  if (!resend) return;
  const manageUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/manage/${manageToken}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Manage your CampusFinder post — "${title}"`,
      html: `
        <p>Your item has been posted on CampusFinder.</p>
        <p><strong>Manage link</strong> (edit / resolve / delete):<br>
        <a href="${manageUrl}">${manageUrl}</a></p>
        <p>This link is private. Do not share it.</p>
        <p>— CampusFinder</p>
      `
    });
  } catch (err) {
    console.error('Failed to send manage email:', err.message);
  }
}

async function sendInterestEmail({ to, title, interestedGmail, message }) {
  if (!resend) return;
  const safeTitle = escapeHtml(title);
  const safeGmail = escapeHtml(interestedGmail);
  const safeMessage = escapeHtml(message);

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Someone may have found your item — "${title}"`,
      html: `
        <p>A campus member expressed interest in your post "<strong>${safeTitle}</strong>".</p>
        <p><strong>Their contact:</strong><br>
        Gmail: ${safeGmail}</p>
        ${safeMessage ? `<p><strong>Message:</strong> ${safeMessage}</p>` : ''}
        <p>Reply directly to connect with them.</p>
        <p>— CampusFinder</p>
      `
    });
  } catch (err) {
    console.error('Failed to send interest email:', err.message);
  }
}

module.exports = { sendManageEmail, sendInterestEmail };
