require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const passport   = require('./config/passport');
const authRoutes = require('./routes/authRoutes');
const aiRoutes   = require('./ai/routes/aiRoutes');
const { mountAiSwaggerDocs } = require('./ai/docs/aiSwagger');

// Trigger DB connection test on startup
require('./config/db');

const app  = express();
const PORT = process.env.PORT || 3000;

//Ambil origin CORS dari env agar tidak terkunci ke port dev.
const getCorsOrigins = () => {
  const configuredOrigins = process.env.CORS_ORIGINS || process.env.FE_URL || 'http://localhost:5173';
  return [...new Set(configuredOrigins.split(',').map((origin) => origin.trim()).filter(Boolean))];
};

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: getCorsOrigins(),
  credentials: true,
}));
app.use(express.json());
app.use(passport.initialize());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
mountAiSwaggerDocs(app);
app.use('/api/ai', aiRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '19MJ Backend is running' });
});

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} tidak ditemukan.` });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
  console.log('📡 Endpoints:');
  console.log('   POST /api/auth/register');
  console.log('   POST /api/auth/login');
  console.log('   GET  /api/auth/me  (protected)');
  console.log('   POST /api/ai/cv-review  (protected)');
  console.log('   POST /api/ai/career-advice  (protected)');
<<<<<<< HEAD
});
=======
});
>>>>>>> 2f52672af75dde5ac0e373aafb33356dc6a9be01
