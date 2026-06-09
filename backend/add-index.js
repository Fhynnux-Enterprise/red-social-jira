const { Client } = require('pg');
const client = new Client({
  host: 'aws-1-us-east-2.pooler.supabase.com',
  port: 5432,
  user: 'postgres.suobziwlikwzfevmappo',
  password: 'F1d5g6q7gG#',
  database: 'postgres',
});

client.connect()
  .then(() => client.query(`CREATE INDEX IF NOT EXISTS "IDX_device_tokens_userId" ON device_tokens("userId");`))
  .then(() => {
    console.log('Índice B-Tree agregado a userId en device_tokens con éxito.');
    process.exit(0);
  })
  .catch(e => {
    console.error('Error aplicando índice:', e);
    process.exit(1);
  });
