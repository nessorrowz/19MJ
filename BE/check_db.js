const pool = require('./src/config/db');

async function check() {
  const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'applications'");
  console.log('Applications columns:', res.rows.map(r => r.column_name));
  
  const res2 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'candidates'");
  console.log('Candidates columns:', res2.rows.map(r => r.column_name));
  
  process.exit();
}
check();
