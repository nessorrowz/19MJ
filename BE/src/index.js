require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const passport   = require('./config/passport');
const authRoutes = require('./routes/authRoutes');
const aiRoutes   = require('./routes/aiRoutes');

// Trigger DB connection test on startup
require('./config/db');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FE_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ],
  credentials: true,
}));
app.use(express.json());
app.use(passport.initialize());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/ai',   aiRoutes);

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
});
