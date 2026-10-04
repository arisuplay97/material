import { neon } from '@neondatabase/serverless';
import fs from 'fs';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log('Connecting to Neon PostgreSQL Cloud...');
  const schemaSql = fs.readFileSync('postgis_pdam_schema.sql', 'utf8');

  // Split and execute statements or full script
  console.log('Executing postgis_pdam_schema.sql on Neon...');
  await sql(schemaSql);
  console.log('PostGIS schema executed successfully on Neon!');

  const ver = await sql`SELECT PostGIS_Version()`;
  const pipes = await sql`SELECT COUNT(*) as count FROM gis_pipa`;
  const valves = await sql`SELECT COUNT(*) as count FROM gis_aksesoris`;

  console.log('PostGIS Version:', ver[0]);
  console.log('Pipes count in DB:', pipes[0]);
  console.log('Valves count in DB:', valves[0]);
}

main().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
