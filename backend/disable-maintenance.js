const { Client } = require('pg');
const client = new Client({
  host: 'aws-1-us-east-2.pooler.supabase.com',
  port: 5432,
  user: 'postgres.suobziwlikwzfevmappo',
  password: 'F1d5g6q7gG#',
  database: 'postgres',
});

client.connect()
  .then(() => client.query("UPDATE system_settings SET is_maintenance_mode = false WHERE id = 'global'"))
  .then(() => {
    console.log('Mantenimiento desactivado.');
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
