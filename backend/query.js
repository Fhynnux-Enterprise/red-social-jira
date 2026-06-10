const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.suobziwlikwzfevmappo:F1d5g6q7gG%23@aws-1-us-east-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();

  const res = await client.query(`
    SELECT 
      (SELECT COUNT(*) FROM public.cities) as public_cities,
      (SELECT COUNT(*) FROM app.cities) as app_cities,
      (SELECT COUNT(*) FROM public.user_tiers) as public_tiers,
      (SELECT COUNT(*) FROM app.user_tiers) as app_tiers,
      (SELECT COUNT(*) FROM public.verification_types) as public_verifications,
      (SELECT COUNT(*) FROM app.verification_types) as app_verifications;
  `);

  console.log("--- REGISTROS EN AMBOS ESQUEMAS ---");
  console.table(res.rows);

  await client.end();
}

run().catch(console.error);
