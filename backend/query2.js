const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.suobziwlikwzfevmappo:F1d5g6q7gG%23@aws-1-us-east-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const res = await client.query("SELECT * FROM posts WHERE id = 'a04e6918-bc76-4d56-80ee-cd5fbfa07154'");
  console.log("POST:");
  console.table(res.rows);
  await client.end();
}

run().catch(console.error);
