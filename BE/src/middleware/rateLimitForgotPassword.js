const WINDOW_MS = Number(process.env.FORGOT_PASSWORD_WINDOW_MS || 15 * 60 * 1000);
const MAX_REQUESTS = Number(process.env.FORGOT_PASSWORD_MAX_REQUESTS || 5);
const MAX_BUCKETS = Number(process.env.FORGOT_PASSWORD_MAX_BUCKETS || 5000);
const requestBuckets = new Map();

//Bersihkan bucket lama agar memori limiter tetap terbatas.
const pruneExpiredBuckets = (now) => {
  if (requestBuckets.size <= MAX_BUCKETS) {
    return;
  }

  for (const [key, history] of requestBuckets.entries()) {
    const activeHistory = history.filter((timestamp) => now - timestamp < WINDOW_MS);

    if (activeHistory.length) {
      requestBuckets.set(key, activeHistory);
    } else {
      requestBuckets.delete(key);
    }

    if (requestBuckets.size <= MAX_BUCKETS) {
      return;
    }
  }
};

//Pembatas sederhana per IP agar endpoint reset password tidak ter-bruteforce.
const forgotPasswordRequestLimiter = (req, res, next) => {
  const now = Date.now();
  pruneExpiredBuckets(now);

  const key = req.ip || req.socket?.remoteAddress || 'unknown';
  const history = requestBuckets.get(key) || [];
  const activeHistory = history.filter((timestamp) => now - timestamp < WINDOW_MS);

  if (activeHistory.length >= MAX_REQUESTS) {
    requestBuckets.set(key, activeHistory);
    return res.status(429).json({
      message: 'Terlalu banyak permintaan reset password. Coba lagi nanti.',
    });
  }

  activeHistory.push(now);
  requestBuckets.set(key, activeHistory);
  next();
};

module.exports = { forgotPasswordRequestLimiter };
