require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'jobs' ORDER BY ordinal_position`)
  .then(r => { console.log(JSON.stringify(r.rows, null, 2)); pool.end(); })
  .catch(e => { console.error(e.message); pool.end(); });
