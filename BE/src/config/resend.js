const RESEND_API_URL = 'https://api.resend.com/emails';

const getMailConfig = () => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!apiKey) {
    throw new Error('RESEND_API_KEY belum dikonfigurasi.');
  }

  if (!from) {
    throw new Error('MAIL_FROM belum dikonfigurasi.');
  }

  return {
    apiKey,
    from,
    appName: process.env.APP_NAME || '19MJ',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@19mj.com',
    supportUrl: process.env.SUPPORT_URL || 'https://19mj.com/support',
    feUrl: process.env.FE_URL || 'http://localhost:5173',
  };
};

const sendResendEmail = async ({ from, to, subject, html, text }) => {
  const config = getMailConfig();
  const payload = {
    from: from || config.from,
    to,
    subject,
    html,
    text,
  };

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    const message = responseBody?.message || `Resend mengembalikan status ${response.status}`;
    throw new Error(message);
  }

  return responseBody;
};

module.exports = { getMailConfig, sendResendEmail };
