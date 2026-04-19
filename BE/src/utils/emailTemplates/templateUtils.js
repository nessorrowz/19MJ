const escapeHtml = (value) => {
  const text = String(value ?? '');

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const renderTemplate = (template, values, { escape = false } = {}) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const rawValue = values[key];

    if (rawValue === undefined || rawValue === null) {
      return '';
    }

    const text = String(rawValue);
    return escape ? escapeHtml(text) : text;
  });

module.exports = { escapeHtml, renderTemplate };
