const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.suobziwlikwzfevmappo:F1d5g6q7gG%23@aws-1-us-east-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const ad = await client.query("SELECT * FROM local_ads WHERE id = '71125941-b34a-41d6-b011-19910f41e8b0'");
  console.log("LOCAL_AD:");
  console.table(ad.rows);
  
  const post = await client.query("SELECT * FROM posts WHERE id = '71125941-b34a-41d6-b011-19910f41e8b0'");
  console.log("POST:");
  console.table(post.rows);

  await client.end();
}

run().catch(console.error);
