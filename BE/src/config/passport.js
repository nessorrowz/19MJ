const passport       = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool           = require('./db');
const jwt            = require('jsonwebtoken');

if (
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET
) {

  passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email    = profile.emails[0].value;
      const fullName = profile.displayName;

      // Cek apakah user sudah ada
      let userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

      if (userResult.rows.length === 0) {
        // User baru — daftar otomatis sebagai candidate
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          const newUser = await client.query(
            `INSERT INTO users (email, password, role)
             VALUES ($1, 'GOOGLE_AUTH', 'candidate')
             RETURNING id, email, role`,
            [email]
          );
          const user = newUser.rows[0];

          // Auto-generate username dari email
          const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
          let username = baseUsername;
          let check = await client.query('SELECT id FROM candidates WHERE username = $1', [username]);
          let counter = 1;
          while (check.rows.length > 0) {
            username = `${baseUsername}${counter++}`;
            check = await client.query('SELECT id FROM candidates WHERE username = $1', [username]);
          }

          await client.query(
            'INSERT INTO candidates (user_id, username, full_name) VALUES ($1, $2, $3)',
            [user.id, username, fullName]
          );

          await client.query('COMMIT');
          userResult = await pool.query('SELECT * FROM users WHERE id = $1', [user.id]);
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      }

      const user = userResult.rows[0];

      // Ambil profil candidate
      const candidateResult = await pool.query(
        'SELECT username, full_name FROM candidates WHERE user_id = $1', [user.id]
      );
      const candidate = candidateResult.rows[0] || {};

      // Buat JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '1y' }
      );

      return done(null, {
        token,
        user: { id: user.id, email: user.email, role: user.role, ...candidate },
      });
    } catch (err) {
      return done(err, null);
    }
  }
));
}
module.exports = passport;
