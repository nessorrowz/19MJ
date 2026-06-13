require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function main() {
  const res = await pool.query(
    `SELECT u.id, u.email, u.role, u.created_at, c.username, c.full_name
     FROM users u
     LEFT JOIN candidates c ON c.user_id = u.id
     WHERE u.email = $1`,
    ['test123@gmail.com']
  );
  console.log(JSON.stringify(res.rows, null, 2));
  await pool.end();
}

main().catch(e => { console.error(e.message); pool.end(); });
