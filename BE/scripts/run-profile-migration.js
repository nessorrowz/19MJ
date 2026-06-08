const pool = require('../src/config/db');

async function runProfileMigration() {
  try {
    console.log('Running migration to update candidates and companies tables for profile storage...');

    await pool.query(`
      ALTER TABLE candidates
      ADD COLUMN IF NOT EXISTS about TEXT,
      ADD COLUMN IF NOT EXISTS photo TEXT,
      ADD COLUMN IF NOT EXISTS experiences JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS education_list JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'::jsonb;
    `);
    console.log('✅ Candidates table updated with profile fields.');

    await pool.query(`
      ALTER TABLE companies
      ADD COLUMN IF NOT EXISTS logo TEXT;
    `);
    console.log('✅ Companies table updated with profile fields.');

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runProfileMigration();
