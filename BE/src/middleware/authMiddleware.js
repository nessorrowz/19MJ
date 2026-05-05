const jwt = require('jsonwebtoken');

//Validasi JWT bearer token untuk route protected.
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Akses ditolak. Token tidak ditemukan.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.user = decoded; //Payload login berisi { id, email, role }.
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token tidak valid atau sudah kadaluarsa.' });
  }
};

//Batasi akses route berdasarkan role user.
const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user?.role) {
    return res.status(401).json({ message: 'Akses ditolak. User belum terautentikasi.' });
  }

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Akses ditolak. Role tidak memiliki izin.' });
  }

  return next();
};

module.exports = { protect, requireRole };
