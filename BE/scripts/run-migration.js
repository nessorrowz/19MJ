const pool = require('../src/config/db');

async function runMigration() {
  try {
    console.log('Running migration to add jobs and applications tables...');

    // 1. Create Jobs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        type VARCHAR(100),
        experience_level VARCHAR(100),
        salary_range VARCHAR(100),
        description TEXT,
        requirements TEXT,
        skills JSONB DEFAULT '[]'::jsonb,
        status VARCHAR(50) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Jobs table created or already exists.');

    // 2. Create Applications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id SERIAL PRIMARY KEY,
        job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        candidate_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'applied',
        ai_match_score INTEGER CHECK (ai_match_score BETWEEN 0 AND 100),
        ai_analysis TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(job_id, candidate_id)
      );
    `);
    console.log('✅ Applications table created or already exists.');

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
