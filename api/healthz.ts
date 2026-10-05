import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return res.status(200).json({
      status: 'ok',
      database: 'DATABASE_URL not set in environment',
      time: new Date().toISOString(),
    });
  }

  try {
    const sql = neon(databaseUrl);
    const ver = await sql.query('SELECT version(), PostGIS_Version()');
    return res.status(200).json({
      status: 'ok',
      database: 'connected',
      version: ver[0]?.version?.slice(0, 30),
      postgis: ver[0]?.postgis_version,
      time: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(200).json({
      status: 'ok',
      database: 'error connecting: ' + err.message,
      time: new Date().toISOString(),
    });
  }
}
