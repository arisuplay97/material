import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return res.status(200).json({
      ok: false,
      count: 0,
      wilayah: [],
      error: 'DATABASE_URL belum dikonfigurasi di Environment Variables.',
    });
  }

  const sql = neon(databaseUrl);

  async function ensureTable() {
    await sql.query(`
      CREATE TABLE IF NOT EXISTS gis_wilayah (
        kode VARCHAR(20) PRIMARY KEY,
        nama VARCHAR(100) NOT NULL,
        kode_kecamatan VARCHAR(10) NOT NULL,
        nama_kecamatan VARCHAR(100),
        warna VARCHAR(30),
        center_lat DOUBLE PRECISION,
        center_lng DOUBLE PRECISION,
        total_pelanggan INT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  // ── POST: Simpan / Perbarui Acuan Wilayah ke Neon Cloud ──
  if (req.method === 'POST') {
    try {
      await ensureTable();
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const items = Array.isArray(body?.wilayah)
        ? body.wilayah
        : Array.isArray(body)
        ? body
        : [];

      if (items.length === 0) {
        return res.status(400).json({ error: 'Tidak ada data wilayah yang dikirim.' });
      }

      const chunkSize = 200;
      let savedCount = 0;

      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const valueClauses: string[] = [];
        const params: any[] = [];
        let pIdx = 1;

        for (const w of chunk) {
          const kode = String(w.kode || '').trim();
          if (!kode) continue;

          const nama = String(w.nama || `Wilayah ${kode}`).trim().slice(0, 100);
          const kodeKec = String(w.kodeKecamatan || kode.slice(0, 2)).trim().slice(0, 10);
          const namaKec = String(w.namaKecamatan || '').trim().slice(0, 100);
          const warna = String(w.warna || '#3B6EA8').trim().slice(0, 30);
          const centerLat = Number(w.centerLat) || 0;
          const centerLng = Number(w.centerLng) || 0;
          const totalPelanggan = Number(w.totalPelanggan) || 0;

          valueClauses.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, NOW())`);
          params.push(kode, nama, kodeKec, namaKec, warna, centerLat, centerLng, totalPelanggan);
          savedCount++;
        }

        if (valueClauses.length > 0) {
          await sql.query(
            `INSERT INTO gis_wilayah (kode, nama, kode_kecamatan, nama_kecamatan, warna, center_lat, center_lng, total_pelanggan, updated_at)
             VALUES ${valueClauses.join(', ')}
             ON CONFLICT (kode) DO UPDATE SET
               nama = EXCLUDED.nama,
               kode_kecamatan = EXCLUDED.kode_kecamatan,
               nama_kecamatan = EXCLUDED.nama_kecamatan,
               warna = EXCLUDED.warna,
               center_lat = EXCLUDED.center_lat,
               center_lng = EXCLUDED.center_lng,
               total_pelanggan = EXCLUDED.total_pelanggan,
               updated_at = NOW()`,
            params
          );
        }
      }

      return res.status(200).json({
        ok: true,
        savedCount,
        message: `Berhasil menyimpan ${savedCount} acuan wilayah ke database Neon Cloud!`,
      });
    } catch (err: any) {
      console.error('Error saving wilayah to Neon:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── GET: Ambil Acuan Wilayah dari Neon Cloud ──
  try {
    await ensureTable();
    const rows = await sql.query(`
      SELECT kode, nama, kode_kecamatan, nama_kecamatan, warna, center_lat, center_lng, total_pelanggan
      FROM gis_wilayah
      ORDER BY kode ASC
    `);

    const wilayahList = (rows || []).map((r: any) => ({
      kode: String(r.kode),
      nama: String(r.nama),
      kodeKecamatan: String(r.kode_kecamatan || r.kode.slice(0, 2)),
      namaKecamatan: String(r.nama_kecamatan || ''),
      warna: String(r.warna || '#3B6EA8'),
      centerLat: Number(r.center_lat) || 0,
      centerLng: Number(r.center_lng) || 0,
      totalPelanggan: Number(r.total_pelanggan) || 0,
    }));

    return res.status(200).json({
      ok: true,
      count: wilayahList.length,
      wilayah: wilayahList,
    });
  } catch (err: any) {
    console.error('Error fetching wilayah from Neon:', err);
    return res.status(200).json({
      ok: false,
      count: 0,
      wilayah: [],
      error: err.message,
    });
  }
}

