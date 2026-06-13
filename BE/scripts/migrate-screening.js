require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function migrate() {
  // Add screening_questions column to jobs table
  await pool.query(`
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS screening_questions JSONB DEFAULT '[]'::jsonb;
  `);
  console.log('✅ Added screening_questions column to jobs table');

  // Add screening_answers column to applications table
  await pool.query(`
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS screening_answers JSONB DEFAULT '[]'::jsonb;
  `);
  console.log('✅ Added screening_answers column to applications table');

  await pool.end();
  console.log('Done!');
}

migrate().catch(e => { console.error(e); pool.end(); });
