const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.suobziwlikwzfevmappo:F1d5g6q7gG%23@aws-1-us-east-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const res = await client.query("SELECT id, reported_item_id, reported_item_type, reason, reporter_id, created_at FROM reports ORDER BY created_at DESC LIMIT 5");
  console.log("REPORTS:");
  console.table(res.rows);
  
  await client.end();
}

run().catch(console.error);
