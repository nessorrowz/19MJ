const fs = require('fs');
const path = require('path');
const { getMailConfig } = require('../../config/resend');
const { renderTemplate } = require('./templateUtils');

const htmlTemplatePath = path.join(__dirname, 'resetPasswordPin', 'content.html');
const textTemplatePath = path.join(__dirname, 'resetPasswordPin', 'content.txt');
const htmlTemplate = fs.readFileSync(htmlTemplatePath, 'utf8');
const textTemplate = fs.readFileSync(textTemplatePath, 'utf8');

const buildResetPasswordPinEmail = (input) => {
  const mailConfig = getMailConfig();
  const payload = {
    product_name: mailConfig.appName,
    app_url: mailConfig.feUrl,
    name: input.name || 'there',
    pin_display: input.pinDisplay,
    expiry_minutes: input.expiryMinutes,
    max_attempts: input.maxAttempts,
    support_email: mailConfig.supportEmail,
    support_url: mailConfig.supportUrl,
  };

  return {
    subject: `Kode reset password ${mailConfig.appName}`,
    html: renderTemplate(htmlTemplate, payload, { escape: true }),
    text: renderTemplate(textTemplate, payload),
  };
};

module.exports = { buildResetPasswordPinEmail };
