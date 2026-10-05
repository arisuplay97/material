import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return res.status(200).json({
      ok: false,
      count: 0,
      pelanggan: [],
      error: 'DATABASE_URL belum dikonfigurasi di Environment Variables.',
    });
  }

  const sql = neon(databaseUrl);

  // Helper untuk memastikan tabel gis_pelanggan ada
  async function ensureTable() {
    await sql.query(`
      CREATE TABLE IF NOT EXISTS gis_pelanggan (
        id SERIAL PRIMARY KEY,
        kode_pelanggan VARCHAR(50) UNIQUE NOT NULL,
        nama_pelanggan VARCHAR(255) NOT NULL,
        alamat TEXT,
        kode_wilayah VARCHAR(20) NOT NULL,
        nama_wilayah VARCHAR(100),
        kode_kecamatan VARCHAR(10) NOT NULL,
        golongan VARCHAR(20) NOT NULL,
        status_sambungan VARCHAR(30) DEFAULT 'Aktif',
        nomor_meter VARCHAR(50),
        spatial_anomaly VARCHAR(255),
        is_flagged BOOLEAN DEFAULT FALSE,
        flag_reasons TEXT,
        colocation_anomaly VARCHAR(255),
        tanggal_pasang VARCHAR(50),
        geom geometry(Point, 4326)
      )
    `);
    try {
      await sql.query(`CREATE INDEX IF NOT EXISTS idx_gis_pelanggan_geom ON gis_pelanggan USING GIST (geom)`);
      await sql.query(`CREATE INDEX IF NOT EXISTS idx_gis_pelanggan_kode ON gis_pelanggan (kode_pelanggan)`);
    } catch {}
  }

  // ── POST: Simpan Data Pelanggan Baru / Upload Excel ke Neon Cloud ──
  if (req.method === 'POST') {
    try {
      await ensureTable();
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const customers = Array.isArray(body?.customers) 
        ? body.customers 
        : Array.isArray(body) 
        ? body 
        : [];
      const mode = body?.mode || 'replace';

      if (customers.length === 0) {
        return res.status(400).json({ error: 'Tidak ada data pelanggan yang dikirim.' });
      }

      if (mode === 'replace') {
        try {
          await sql.query('TRUNCATE TABLE gis_pelanggan');
        } catch {}
      }

      let savedCount = 0;
      const chunkSize = 50;

      for (let i = 0; i < customers.length; i += chunkSize) {
        const chunk = customers.slice(i, i + chunkSize);
        const valueClauses: string[] = [];
        const params: any[] = [];
        let pIdx = 1;

        for (const item of chunk) {
          const kode = String(item.kode_pelanggan || '').trim().slice(0, 50);
          if (!kode) continue;

          const nama = String(item.nama_pelanggan || 'Pelanggan').slice(0, 255);
          const alamat = String(item.alamat || '').slice(0, 500);
          const kodeWilayah = String(item.kode_wilayah || '').slice(0, 20);
          const namaWilayah = String(item.nama_wilayah || '').slice(0, 100);
          const kodeKecamatan = String(item.kode_kecamatan || '07').slice(0, 10);
          const golongan = String(item.golongan || 'R1').slice(0, 20);
          const status = String(item.status_sambungan || 'Aktif').slice(0, 30);
          const nomorMeter = String(item.nomor_meter || '').slice(0, 50);
          const anomaly = item.spatial_anomaly ? String(item.spatial_anomaly).slice(0, 255) : null;
          const isFlagged = Boolean(item.is_flagged);
          const flagReasons = Array.isArray(item.flag_reasons) ? item.flag_reasons.join(', ') : (item.flag_reasons || '');
          const colocation = item.colocation_anomaly ? String(item.colocation_anomaly).slice(0, 255) : null;
          const tglPasang = item.tanggal_pasang ? String(item.tanggal_pasang).slice(0, 50) : null;

          const lat = Number(item.latitude);
          const lng = Number(item.longitude);
          const hasValidCoords = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

          if (hasValidCoords) {
            valueClauses.push(
              `($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, ST_SetSRID(ST_MakePoint($${pIdx++}, $${pIdx++}), 4326))`
            );
            params.push(
              kode, nama, alamat, kodeWilayah, namaWilayah, kodeKecamatan,
              golongan, status, nomorMeter, anomaly, isFlagged, flagReasons,
              colocation, tglPasang, lng, lat
            );
          } else {
            valueClauses.push(
              `($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, NULL)`
            );
            params.push(
              kode, nama, alamat, kodeWilayah, namaWilayah, kodeKecamatan,
              golongan, status, nomorMeter, anomaly, isFlagged, flagReasons,
              colocation, tglPasang
            );
          }
          savedCount++;
        }

        if (valueClauses.length > 0) {
          await sql.query(
            `INSERT INTO gis_pelanggan (
              kode_pelanggan, nama_pelanggan, alamat, kode_wilayah, nama_wilayah, 
              kode_kecamatan, golongan, status_sambungan, nomor_meter, spatial_anomaly, 
              is_flagged, flag_reasons, colocation_anomaly, tanggal_pasang, geom
            ) VALUES ${valueClauses.join(', ')}
            ON CONFLICT (kode_pelanggan) DO UPDATE SET
              nama_pelanggan = EXCLUDED.nama_pelanggan,
              alamat = EXCLUDED.alamat,
              kode_wilayah = EXCLUDED.kode_wilayah,
              nama_wilayah = EXCLUDED.nama_wilayah,
              kode_kecamatan = EXCLUDED.kode_kecamatan,
              golongan = EXCLUDED.golongan,
              status_sambungan = EXCLUDED.status_sambungan,
              nomor_meter = EXCLUDED.nomor_meter,
              spatial_anomaly = EXCLUDED.spatial_anomaly,
              is_flagged = EXCLUDED.is_flagged,
              flag_reasons = EXCLUDED.flag_reasons,
              colocation_anomaly = EXCLUDED.colocation_anomaly,
              tanggal_pasang = EXCLUDED.tanggal_pasang,
              geom = EXCLUDED.geom`,
            params
          );
        }
      }

      return res.status(200).json({
        ok: true,
        savedCount,
        message: `Berhasil menyimpan ${savedCount} titik pelanggan ke database Neon Cloud! Semua perangkat langsung terupdate realtime.`,
      });
    } catch (err: any) {
      console.error('Error saving pelanggan to Neon:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── GET: Ambil Data Pelanggan Aktif dari Neon Cloud ──
  try {
    await ensureTable();
    const rows = await sql.query(`
      SELECT 
        id,
        kode_pelanggan,
        nama_pelanggan,
        alamat,
        kode_wilayah,
        nama_wilayah,
        kode_kecamatan,
        golongan,
        status_sambungan,
        nomor_meter,
        spatial_anomaly,
        is_flagged,
        flag_reasons,
        colocation_anomaly,
        tanggal_pasang,
        CASE WHEN geom IS NOT NULL THEN ST_Y(geom::geometry) ELSE NULL END as latitude,
        CASE WHEN geom IS NOT NULL THEN ST_X(geom::geometry) ELSE NULL END as longitude
      FROM gis_pelanggan
      ORDER BY id ASC
    `);

    const pelangganList = (rows || []).map((r: any) => ({
      id: String(r.id),
      kode_pelanggan: r.kode_pelanggan,
      nama_pelanggan: r.nama_pelanggan,
      alamat: r.alamat || '',
      kode_wilayah: r.kode_wilayah,
      nama_wilayah: r.nama_wilayah || '',
      kode_kecamatan: r.kode_kecamatan || '07',
      golongan: r.golongan,
      status_sambungan: r.status_sambungan,
      nomor_meter: r.nomor_meter || '',
      spatial_anomaly: r.spatial_anomaly || null,
      is_flagged: Boolean(r.is_flagged),
      flag_reasons: r.flag_reasons ? r.flag_reasons.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      colocation_anomaly: r.colocation_anomaly || null,
      tanggal_pasang: r.tanggal_pasang || '',
      latitude: Number(r.latitude) || 0,
      longitude: Number(r.longitude) || 0,
    }));

    return res.status(200).json({
      ok: true,
      count: pelangganList.length,
      pelanggan: pelangganList,
    });
  } catch (err: any) {
    console.error('Error fetching pelanggan from Neon:', err);
    return res.status(200).json({
      ok: false,
      count: 0,
      pelanggan: [],
      error: err.message,
    });
  }
}
