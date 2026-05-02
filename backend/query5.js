const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.suobziwlikwzfevmappo:F1d5g6q7gG%23@aws-1-us-east-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const res = await client.query("SELECT * FROM reports ORDER BY created_at DESC LIMIT 1");
  console.log("REPORT:");
  console.log(res.rows[0]);
  await client.end();
}

run().catch(console.error);
