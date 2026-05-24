const crypto = require('crypto');
const { requireEnv } = require('../config/env');

const getResetPinSecret = () => process.env.RESET_PIN_SECRET || requireEnv('JWT_SECRET');

// PIN dibuat dengan random number dan disimpan dalam bentuk hash.
const generateResetPin = () =>
  crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

const formatResetPin = (pin) => {
  const digits = String(pin ?? '').replace(/\D/g, '');
  return digits.length === 6 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits;
};

const hashResetPin = (pin) =>
  crypto.createHmac('sha256', getResetPinSecret()).update(String(pin)).digest('hex');

const verifyResetPin = (pin, storedHash) => {
  const computedHash = hashResetPin(pin);
  const left = Buffer.from(computedHash, 'hex');
  const right = Buffer.from(String(storedHash || ''), 'hex');

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
};

module.exports = {
  generateResetPin,
  formatResetPin,
  hashResetPin,
  verifyResetPin,
};
