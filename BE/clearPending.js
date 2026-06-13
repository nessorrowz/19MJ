const pool = require('./src/config/db');
pool.query("DELETE FROM applications WHERE ai_analysis = 'Pending AI Review' OR ai_analysis = 'Pending analysis...'")
  .then(res => console.log('Deleted', res.rowCount, 'pending applications'))
  .catch(console.error)
  .finally(() => process.exit(0));
