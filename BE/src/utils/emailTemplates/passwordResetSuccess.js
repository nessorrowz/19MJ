const { getMailConfig } = require('../../config/resend');
const { escapeHtml } = require('./templateUtils');

const buildPasswordResetSuccessEmail = (input) => {
  const mailConfig = getMailConfig();
  const name = escapeHtml(input.name || 'there');
  const supportEmail = escapeHtml(mailConfig.supportEmail);
  const supportUrl = escapeHtml(mailConfig.supportUrl);
  const appName = escapeHtml(mailConfig.appName);

  return {
    subject: `Password akun ${mailConfig.appName} berhasil direset`,
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; background:#f2f4f6; padding:24px;">
        <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:32px;">
          <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#0f7c82;">${appName}</p>
          <h1 style="margin:0 0 16px;font-size:24px;color:#111827;">Password berhasil direset</h1>
          <p style="margin:0 0 14px;line-height:1.7;color:#374151;">Halo ${name}, password akun Anda sudah berhasil diubah.</p>
          <p style="margin:0 0 14px;line-height:1.7;color:#374151;">Jika Anda tidak merasa melakukan perubahan ini, segera hubungi tim dukungan.</p>
          <p style="margin:0;line-height:1.7;color:#374151;">Dukungan: <a href="mailto:${supportEmail}" style="color:#0f7c82;">${supportEmail}</a><br />
          Bantuan: <a href="${supportUrl}" style="color:#0f7c82;">${supportUrl}</a></p>
        </div>
      </div>
    `,
    text: `Halo ${input.name || 'there'}, password akun ${mailConfig.appName} Anda sudah berhasil direset.\n\nJika Anda tidak merasa melakukan perubahan ini, segera hubungi tim dukungan di ${mailConfig.supportEmail} atau ${mailConfig.supportUrl}.`,
  };
};

module.exports = { buildPasswordResetSuccessEmail };
