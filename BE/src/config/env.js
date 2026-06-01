//Helper env wajib dan angka positif.
const requireEnv = (name) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} wajib dikonfigurasi.`);
  }

  return value;
};

const getOptionalEnv = (name, fallback = null) => {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
};

const getPositiveNumberEnv = (name, fallback) => {
  const value = Number(process.env[name] || fallback);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

module.exports = {
  getOptionalEnv,
  getPositiveNumberEnv,
  requireEnv,
};
