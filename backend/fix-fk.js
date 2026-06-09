const { Client } = require('pg');
const client = new Client({
  host: 'aws-1-us-east-2.pooler.supabase.com',
  port: 5432,
  user: 'postgres.suobziwlikwzfevmappo',
  password: 'F1d5g6q7gG#',
  database: 'postgres',
});

client.connect()
  .then(() => client.query(`ALTER TABLE participants DROP CONSTRAINT "FK_1427a77e06023c250ed3794a1ba", ADD CONSTRAINT "FK_1427a77e06023c250ed3794a1ba" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;`))
  .then(() => {
    console.log('Cascada aplicada con éxito.');
    process.exit(0);
  })
  .catch(e => {
    console.error('Error aplicando cascada:', e);
    process.exit(1);
  });
