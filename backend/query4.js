const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.suobziwlikwzfevmappo:F1d5g6q7gG%23@aws-1-us-east-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const queries = [
    { name: 'posts', sql: "SELECT 'post' as type, id, title FROM posts WHERE id = $1" },
    { name: 'local_ads', sql: "SELECT 'local_ad' as type, id, title FROM local_ads WHERE id = $1" },
    { name: 'store_products', sql: "SELECT 'store_product' as type, id, title FROM store_products WHERE id = $1" },
    { name: 'job_offers', sql: "SELECT 'job_offer' as type, id, title FROM job_offers WHERE id = $1" },
    { name: 'professional_profiles', sql: "SELECT 'professional_profile' as type, id, title FROM professional_profiles WHERE id = $1" },
    { name: 'comments', sql: "SELECT 'comment' as type, id, content as title FROM comments WHERE id = $1" },
  ];
  const targetId = '71125941-b34a-41d6-b011-19910f41e8b0';
  for (const q of queries) {
    try {
      const res = await client.query(q.sql, [targetId]);
      if (res.rows.length > 0) {
        console.log("FOUND IN:", q.name);
        console.table(res.rows);
      }
    } catch (e) {
      // ignore
    }
  }
  await client.end();
}

run().catch(console.error);
