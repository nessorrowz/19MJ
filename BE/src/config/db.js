const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || '19mj_db',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

// Test koneksi saat startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Gagal konek ke PostgreSQL:', err.message);
  } else {
    console.log('✅ PostgreSQL terhubung!');
    release();
  }
});

module.exports = pool;
