/**
 * drop-all-tables.js
 * Conecta a la BD y elimina todas las tablas del schema public con CASCADE.
 * Ejecutar ANTES de iniciar el servidor con synchronize:true después de la refactorización.
 */
const { Client } = require('pg');

const client = new Client({
  host: 'aws-1-us-east-2.pooler.supabase.com',
  port: 5432,
  user: 'postgres.suobziwlikwzfevmappo',
  password: 'F1d5g6q7gG#',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

async function dropAllTables() {
  await client.connect();
  console.log('✅ Conectado a la base de datos');

  // Obtenemos todas las tablas del schema public
  const res = await client.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `);

  const tables = res.rows.map(r => r.tablename);

  if (tables.length === 0) {
    console.log('ℹ️  No hay tablas en el schema public.');
    await client.end();
    return;
  }

  console.log(`🗑️  Eliminando ${tables.length} tablas: ${tables.join(', ')}`);

  // DROP TABLE de todas con CASCADE (maneja FK dependencies)
  const tableList = tables.map(t => `"${t}"`).join(', ');
  await client.query(`DROP TABLE IF EXISTS ${tableList} CASCADE;`);

  console.log('✅ Todas las tablas eliminadas correctamente.');
  console.log('🚀 Ahora inicia el servidor con: pnpm run start:dev');
  console.log('   TypeORM recreará todas las tablas con el nuevo esquema.');

  await client.end();
}

dropAllTables().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
